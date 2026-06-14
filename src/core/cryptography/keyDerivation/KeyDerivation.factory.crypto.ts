/**
 * @module KeyDerivationFactory
 * @description Fábrica e gerenciador de ciclo de vida para provedores de derivação de chaves (KDF).
 *
 * ## Objetivo:
 * Gerencia a inicialização preguiçosa (Lazy Initialization) do algoritmo de derivação configurado
 * no ambiente (ex: HKDF), garantindo o padrão Singleton para evitar múltiplas instâncias na memória
 * e simplificar o consumo do desenvolvedor.
 */

import { env } from '@Configs/env.js';
import { supportedCryptographyDerivationKeyAlgs } from '@Configs/Constants';
import HKDFProvider from '@Crypto/keyDerivation/provider/Hkdf.provider.crypto.js';
import type { IKeyDerivator } from '@Crypto/contracts/KeyDerivator.contract.js';
import type { DerivedKey } from '@/shared/types/security.types.js';

/**
 * Tipo representando as chaves dos algoritmos de derivação suportados no boilerplate.
 */
type supportedAlgorithmDerivation = (typeof supportedCryptographyDerivationKeyAlgs)[number];

/**
 * Registro associativo vinculando o identificador do algoritmo de derivação à classe construtora correspondente.
 */
const providers: Record<supportedAlgorithmDerivation, new () => IKeyDerivator> = {
	hkdf: HKDFProvider,
};

/**
 * @class KeyDerivationFactory
 * @description Classe fábrica responsável por fabricar e conter o Singleton do provedor de derivação de chaves.
 */
export class KeyDerivationFactory {
	/**
	 * Instância única em cache do provedor de derivação resolvido.
	 */
	private static instance?: IKeyDerivator;

	/**
	 * Retorna a instância única do provedor de derivação de chaves configurado no ambiente.
	 * Inicializa o objeto sob demanda (Lazy) na primeira chamada.
	 *
	 * @returns O provedor instanciado em conformidade com o contrato IKeyDerivator.
	 */
	public static getProvider(): IKeyDerivator {
		if (!this.instance) {
			const selectedProviderName: supportedAlgorithmDerivation =
				env.CRIPTOGRAPHY_DERIVATION_KEY_ALGORITHM;
			const SelectedProvider = providers[selectedProviderName];
			this.instance = new SelectedProvider();
		}
		return this.instance;
	}
}

/**
 * @constant KeyDerivation
 * @description Atalho global exportado contendo a instância única (Singleton) do Derivador de Chaves.
 * Deve ser importado e consumido nos casos de uso que necessitam derivar sub-chaves criptográficas específicas.
 */
export const KeyDerivation = {
	derive: <N extends number>(
		masterKey: string,
		contextInfo: string,
		outputBytesLegth: N,
	): Promise<DerivedKey<N>> =>
		KeyDerivationFactory.getProvider().derive(masterKey, contextInfo, outputBytesLegth),
};
