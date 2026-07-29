import { BaseHasher, type EnvForHasherProvider } from '@Auth/hash/contracts/IHasher.contract.js';
import { argon2id, hash, verify, type Options as ArgonOptions } from 'argon2';
import { randomBytes } from 'node:crypto';
import { regexValidationToHasherProvidersSupported } from '@Configs/Constants';
import { DeterministicHash } from '@/core/cryptography/deterministicHash/DeterministicHash.factory.crypto.js';

export default class Argon2Provider extends BaseHasher {
	protected get ServiceName(): string {
		return 'Argon2Provider';
	}

	private async genArgonConfigs(): Promise<ArgonOptions> {
		const validEnv: EnvForHasherProvider = await this.validateEnvValues();

		return ({
			type: argon2id,
			memoryCost: validEnv.HASHER_MEMORY_COST,
			timeCost: validEnv.HASHER_TIME_COST,
			parallelism: validEnv.HASHER_PARALLELISM,
			secret: Buffer.from(validEnv.HASHER_SECURITY_PEPPER),
			hashLength: validEnv.HASHER_LENGTH,
			salt: randomBytes(validEnv.HASHER_SALT_LENGTH)
		})
	}

	protected async executeHash(payload: string): Promise<string> {
		const configs = await this.genArgonConfigs();
		const { HASHER_SALT_LENGTH, HASHER_SECURITY_PEPPER } = (await this.validateEnvValues());

		const securePayload = await DeterministicHash.hash(payload, HASHER_SECURITY_PEPPER)

		const result = await hash(securePayload, {
			...configs,
			salt: randomBytes(HASHER_SALT_LENGTH),
		});
		return result;
	}

	protected async executeCompare(payload: string, hashedString: string): Promise<boolean> {
		if (!this.validateHash(hashedString)) {
			return false;
		}

		const { secret } = await this.genArgonConfigs();

		return await verify(hashedString, payload, {
			secret: secret,
		});
	}

	protected executeValidation(hashedString: string): boolean {
		return regexValidationToHasherProvidersSupported.argon2.test(hashedString);
	}
}
