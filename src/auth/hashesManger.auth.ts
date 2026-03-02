import { env, type supportedHashProviders } from "@Configs/env.js";
import Argon2Provider from "@Hash/Argon2.service.auth.js";
import BcryptService from "@Hash/Bcrypt.service.auth.js";
import type { IHasherProvider } from "@Auth/contracts/IHasher.contract.js";

type supportedProviders = (typeof supportedHashProviders)[number];

const providers: Record<supportedProviders, new ()=> IHasherProvider> = {
    argon2: Argon2Provider,
    bcrypt: BcryptService
}

class HasherFactory {
    private static instance: IHasherProvider;

    public static getProvider (): IHasherProvider{
        if(!this.instance){
            const SelectedProvider = providers[env.HASHER_PROVIDER as supportedProviders];
            this.instance = new SelectedProvider();
        }

        return this.instance
    }
}

export const Hasher = HasherFactory.getProvider();