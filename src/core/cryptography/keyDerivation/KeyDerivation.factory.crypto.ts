import { env } from '@Configs/env.js'
import { supportedCryptographyDerivationKeyAlgs } from '@Configs/Constants'
import HKDFProvider from '@Crypto/keyDerivation/provider/Hkdf.provider.crypto.js'
import type { IKeyDerivator } from '@Crypto/contracts/KeyDerivator.contract.js'

type supportedAlgorithmDerivation = (typeof supportedCryptographyDerivationKeyAlgs)[number];

const providers: Record<supportedAlgorithmDerivation, new () => IKeyDerivator> = {
	hkdf: HKDFProvider,
}

export class KeyDerivationFactory {
	private static instance?: IKeyDerivator;

	public static getProvider(): IKeyDerivator{
		if(!this.instance){
			const selectedProviderName: supportedAlgorithmDerivation = env.CRIPTOGRAPHY_DERIVATION_KEY_ALGORITHM;
			const SelectedProvider = providers[selectedProviderName];
			this.instance = new SelectedProvider();
		}
		return this.instance;
	}
}

export const KeyDerivation = KeyDerivationFactory.getProvider();
