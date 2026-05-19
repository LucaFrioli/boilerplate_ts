import { env } from '@Configs/env.js';
import { type supportedHashProviders } from '@Configs/constants/env.constants.js';
import Argon2Provider from '@Hash/providers/Argon2.service.auth.js';
import BcryptService from '@Hash/providers/Bcrypt.service.auth.js';
import type { IHasherProvider } from '@Hash/contracts/IHasher.contract.js';

type supportedProviders = (typeof supportedHashProviders)[number];

const providers: Record<supportedProviders, new () => IHasherProvider> = {
	argon2: Argon2Provider,
	bcrypt: BcryptService,
};

export class HasherFactory {
	private static instance?: IHasherProvider;

	public static getProvider(): IHasherProvider {
		if (!this.instance) {
			const selectedProviderName: supportedProviders = env.HASHER_PROVIDER;
			const SelectedProvider = providers[selectedProviderName];
			this.instance = new SelectedProvider();
		}

		return this.instance;
	}
}

export const Hasher = HasherFactory.getProvider();
