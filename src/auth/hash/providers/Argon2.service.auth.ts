import { BaseHasher } from '@Auth/hash/contracts/IHasher.contract.js';
import { argon2id, hash, verify, type Options as ArgonOptions } from 'argon2';
import { env } from '@Configs/env.js';
import { randomBytes } from 'node:crypto';
import { regexValidationToHasherProvidersSupported } from '@/configs/constants/env.constants.js';

export default class Argon2Provider extends BaseHasher {
	protected get ServiceName(): string {
		return 'Argon2Provider';
	}

	private argonConfigs: ArgonOptions = {
		type: argon2id,

		memoryCost: env.HASHER_MEMORY_COST,
		timeCost: env.HASHER_TIME_COST,
		parallelism: env.HASHER_PARALLELISM,

		secret: Buffer.from(env.HASHER_SECURITY_PEPPER),
		hashLength: env.HASHER_LENGTH,

		salt: randomBytes(env.HASHER_SALT_LENGTH),
	};

	protected async executeHash(payload: string): Promise<string> {
		const result = await hash(payload, {
			...this.argonConfigs,
			salt: randomBytes(env.HASHER_SALT_LENGTH),
		});
		return result;
	}

	protected async executeCompare(payload: string, hashedString: string): Promise<boolean> {
		if (!this.validateHash(hashedString)) {
			return false;
		}

		return await verify(hashedString, payload, {
			secret: this.argonConfigs.secret,
		});
	}

	protected executeValidation(hashedString: string): boolean {
		return regexValidationToHasherProvidersSupported.argon2.test(hashedString);
	}
}
