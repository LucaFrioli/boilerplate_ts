import type { DatabaseID, AppID } from "@Types";
import { env, type identityTypeSupported } from "@Configs/env.js";
import type { IIdentityProvider } from "@Id/contracts/IIdentyti.contract.js";
import NanoIdProvider from "@Id/providers/NanoId.service.identity.js";
import UuidV4Provider from "@Id/providers/UuidV4.service.identity.js";
import UuidV7Provider from "@Id/providers/UuidV7.service.identity.js";

type supportedProviders = (typeof identityTypeSupported)[number];

const providers: Record<supportedProviders, new () => IIdentityProvider> = {
	nanoid: NanoIdProvider,
	uuidv4: UuidV4Provider,
	uuidv7: UuidV7Provider
}

interface AppIdGenerator extends Omit<IIdentityProvider, 'generate'> {
	generate(): AppID;
}

interface DbIdGenerator extends Omit<IIdentityProvider, 'generate'> {
	generate(): DatabaseID;
}

class IdentityFactory {
	private static instances: Partial<Record<supportedProviders, IIdentityProvider>> = {};

	public static getDefaultProvider(): IIdentityProvider {
		return this.getAnProvider(env.IDENTIFIER_PATTERN);
	}

	public static getDBDefaultId(): IIdentityProvider {
		return this.getAnProvider(env.DATABASE_ID_DEFAULT);
	}

	private static getAnProvider(typeOfProvider: supportedProviders): IIdentityProvider {
		if (!this.instances[typeOfProvider]) {
			const SelectedProvider = providers[typeOfProvider];
			this.instances[typeOfProvider] = new SelectedProvider();
		}
		return this.instances[typeOfProvider];
	}
}

export const DBid = IdentityFactory.getDBDefaultId() as unknown as DbIdGenerator;
export const Id = IdentityFactory.getDefaultProvider() as unknown as AppIdGenerator;
