import { BaseHasher } from "@Auth/hash/contracts/IHasher.contract.js";
import { hash, compare } from 'bcrypt'
import { env } from '@Configs/env.js'

export default class BcryptService extends BaseHasher {
    protected ServiceName: string = 'BcryptService';
    private pepper: string = env.HASHER_SECURITY_PEPPER;

    protected async executeHash(payload: string): Promise<string> {
        const passwordWithPepper = payload + this.pepper;
        let rounds: number = env.HASHER_SALT_LENGTH

        if (rounds < 10) {
            this.handleFatalErrors({
                error: 'No Bcrypt devemos manter pelo menos 10 rounds para segurança, mude dentro de suas configurações',
                service: this.ServiceName,
                currentRounds: rounds
            }, 'executeHash');
        }

        if (rounds > 13) {
            this.hasherLogger.warn({
                service: this.ServiceName,
                currentRounds: rounds,
                method: 'executeHash'
            }, 'Tenha atenção, e verifique o desempenho, acima de 12 rounds pode-se haver probelmas e performace');
        }

        return await hash(passwordWithPepper, env.HASHER_SALT_LENGTH);
    }
    protected async executeCompare(payload: string, hashedString: string): Promise<boolean> {
        if (!this.validateHash(hashedString)) {
            return false;
        }

        const passwordWithPepper = payload + this.pepper;
        return await compare(passwordWithPepper, hashedString);
    }

    protected executeValidation(hashedString: string): boolean {
        /**
        * Formato BCrypt (Modular Crypt Format):
        * $<version>$<rounds>$<salt(22)><hash(31)>
        *
        * - version → 2a | 2b | 2y  (2b é o padrão atual e mais seguro)
        * - rounds  → 04–31 (custo logarítmico)
        * - salt    → exatamente 22 chars Base64 BCrypt
        * - hash    → exatamente 31 chars Base64 BCrypt
        *
        * ⚠️ BCrypt usa alfabeto Base64 próprio: ./A-Za-z0-9
        *    diferente do Base64 padrão que usa +/
        */
        const bcryptRegex = /^\$2[aby]?\$\d{2}\$[./A-Za-z0-9]{53}$/;

        return bcryptRegex.test(hashedString);

    }

}