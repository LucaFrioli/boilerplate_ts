import { BaseHasher } from '@Auth/hash/contracts/IHasher.contract.js';
import { hash, compare } from 'bcrypt';
import { regexValidationToHasherProvidersSupported } from '@Configs/Constants';
import { DeterministicHash } from '@/core/cryptography/deterministicHash/DeterministicHash.factory.crypto.js';

export default class BcryptService extends BaseHasher {
	protected get ServiceName(): string {
		return 'BcryptService';
	}

	protected async executeHash(payload: string): Promise<string> {
		const envValid = await this.validateEnvValues();
		const pepperValid = envValid.HASHER_SECURITY_PEPPER;
		const passwordWithPepper = await DeterministicHash.hash(payload, pepperValid);
		const rounds: number = envValid.HASHER_BCRYPT_ROUNDS;

		if (rounds < 10) {
			this.handleFatalErrors(
				{
					error: 'No Bcrypt devemos manter pelo menos 10 rounds para segurança, mude dentro de suas configurações',
					service: this.ServiceName,
					currentRounds: rounds,
				},
				'executeHash',
			);
		}

		if (rounds > 13) {
			this.hasherLogger.warn(
				{
					service: this.ServiceName,
					currentRounds: rounds,
					method: 'executeHash',
				},
				'Tenha atenção, e verifique o desempenho, acima de 12 rounds pode-se haver probelmas e performace',
			);
		}

		return await hash(passwordWithPepper, rounds);
	}
	protected async executeCompare(payload: string, hashedString: string): Promise<boolean> {
		if (!this.validateHash(hashedString)) {
			return false;
		}

		const pepperValid = (await this.validateEnvValues()).HASHER_SECURITY_PEPPER;
		const passwordWithPepper = await DeterministicHash.hash(payload, pepperValid);
		return await compare(passwordWithPepper, hashedString);
	}

	protected executeValidation(hashedString: string): boolean {
		return regexValidationToHasherProvidersSupported.bcrypt.test(hashedString);
	}
}
