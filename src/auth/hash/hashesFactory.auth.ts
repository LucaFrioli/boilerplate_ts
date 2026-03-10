import { env, type supportedHashProviders } from '@Configs/env.js';
import Argon2Provider from '@Hash/providers/Argon2.service.auth.js';
import BcryptService from '@Hash/providers/Bcrypt.service.auth.js';
import type { IHasherProvider } from '@Hash/contracts/IHasher.contract.js';
import type { HashedString } from '@Types';

type supportedProviders = (typeof supportedHashProviders)[number];

interface IHasherGenerator extends Omit<IHasherProvider, 'generate'> {
	generate(payload: string): Promise<HashedString>;
}

const providers: Record<supportedProviders, new () => IHasherProvider> = {
	argon2: Argon2Provider,
	bcrypt: BcryptService,
};

class HasherFactory {
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

export const Hasher = HasherFactory.getProvider() as unknown as IHasherGenerator;
