import { BaseHasher } from '@Auth/hash/contracts/IHasher.contract.js';
import { hash, compare } from 'bcrypt';
import { env } from '@Configs/env.js';
import { regexValidationToHasherProvidersSupported } from '@/configs/constants/env.constants.js';

export default class BcryptService extends BaseHasher {
	protected get ServiceName(): string {
		return 'BcryptService';
	}
	private pepper: string = env.HASHER_SECURITY_PEPPER;

	protected async executeHash(payload: string): Promise<string> {
		const passwordWithPepper = payload + this.pepper;
		const rounds: number = env.HASHER_SALT_LENGTH;

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
		return regexValidationToHasherProvidersSupported.bcrypt.test(hashedString);
	}
}
