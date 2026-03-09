import { StringWithLegthGen } from "@Types/primitives.type.js";
import BaseIdentityGenerator from "../contracts/IIdentyti.contract.js";
import { env } from "@Configs/env.js";
import { randomBytes } from "node:crypto";

export default class NanoIdProvider extends BaseIdentityGenerator {
	protected serviceName: string = 'NanoIdProvider';

	private static readonly ALPHABET = StringWithLegthGen(env.IDENTIFIER_NANOID_ALPHABET, env.IDENTIFIER_NANOID_ALPHABET.length);
	private static readonly BITMASK = (2 << (Math.log(NanoIdProvider.ALPHABET.length - 1) / Math.LN2 | 0)) - 1;
	private static readonly DEFAULT_SIZE: number = env.IDENTIFIER_NANOID_SIZE // seguro para nano ID

	protected generateLogic(): string {
		const bytes = randomBytes(NanoIdProvider.DEFAULT_SIZE * 3);
		let id: string = '';

		for (let i = 0; i < bytes.length && id.length < NanoIdProvider.DEFAULT_SIZE; i++) {
			const index = bytes[i]! & NanoIdProvider.BITMASK;
			const char = NanoIdProvider.ALPHABET[index];
			if (char) {
				id += char;
			}
		}

		return id;
	}

	protected generateValidation(id: string): boolean {

		if (typeof id !== 'string' || id.length !== NanoIdProvider.DEFAULT_SIZE) {
			this.identityLogger.warn({ serviceName: this.serviceName, length: id?.length, type: typeof id }, 'Tentativa de validação de NanoId com estrutura corrompida');
			return false;
		}

		const pattern = new RegExp(`^[${NanoIdProvider.ALPHABET}]{${NanoIdProvider.DEFAULT_SIZE}}$`)
		return pattern.test(id);
	}

}
