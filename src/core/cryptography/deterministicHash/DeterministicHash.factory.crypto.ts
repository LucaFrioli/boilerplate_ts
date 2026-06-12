import { env } from '@Configs/env.js';
import { supportedCryptographySimetricAlgs } from '@Configs/Constants/crypto.constants.js';
import HMAC from '@Crypto/deterministicHash/providers/Hmac.provider.crypto.js';
import type { IDeterministicHasher } from '@Crypto/contracts/DeterministicHasher.contract.js';

type supportedSimetricAlgsProviders = (typeof supportedCryptographySimetricAlgs)[number];

const providers: Record<supportedSimetricAlgsProviders, new () => IDeterministicHasher> = {
	hmac: HMAC,
}


export class DeterministicHashFactory {
	private static instance?: IDeterministicHasher;

	public static getProvider(): IDeterministicHasher {
		if (!this.instance) {
			const selectedProviderName: supportedSimetricAlgsProviders = env.CRIPTOGRAPHY_PASSWORDS_ALGORITHM;
			const SelectedProvider = providers[selectedProviderName];
			this.instance = new SelectedProvider();
		}
		return this.instance;
	}
}

export const DeterministicHash = DeterministicHashFactory.getProvider();


