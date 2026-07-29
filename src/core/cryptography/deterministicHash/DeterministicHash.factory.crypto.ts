/**
 * @module DeterministicHashFactory
 * @description Fábrica e orquestrador de ciclo de vida para provedores de hashing determinístico (HMAC).
 *
 * ## Objetivo:
 * Gerencia a inicialização preguiçosa (Lazy Initialization) do algoritmo de hash ativo configurado
 * no ambiente, garantindo o padrão Singleton para evitar re-alocações e simplificar o consumo do DX.
 */

import { env } from '@Configs/env.js';
import { supportedCryptographySimetricAlgs } from '@Configs/Constants/crypto.constants.js';
import HMAC from '@Crypto/deterministicHash/providers/Hmac.provider.crypto.js';
import type { IDeterministicHasher } from '@Crypto/contracts/DeterministicHasher.contract.js';

/**
 * Tipo representando as chaves dos algoritmos simétricos de hash suportados no boilerplate.
 */
type supportedSimetricAlgsProviders = (typeof supportedCryptographySimetricAlgs)[number];

/**
 * Registro associativo ligando o identificador do algoritmo à classe construtora do provedor correspondente.
 */
const providers: Record<supportedSimetricAlgsProviders, new () => IDeterministicHasher> = {
	hmac: HMAC,
};

/**
 * @class DeterministicHashFactory
 * @description Classe fábrica responsável por fabricar e conter o Singleton do provedor de hash determinístico.
 */
export class DeterministicHashFactory {
	/**
	 * Instância única em cache do provedor resolvido para a aplicação.
	 */
	private static instance?: IDeterministicHasher;

	/**
	 * Retorna a instância única do provedor de hash determinístico configurado no ambiente.
	 * Inicializa o objeto sob demanda (Lazy) na primeira chamada.
	 *
	 * @returns O provedor instanciado em conformidade com o contrato IDeterministicHasher.
	 */
	public static getProvider(): IDeterministicHasher {
		if (!this.instance) {
			const selectedProviderName: supportedSimetricAlgsProviders =
				env.CRIPTOGRAPHY_PASSWORDS_ALGORITHM;
			const SelectedProvider = providers[selectedProviderName];
			this.instance = new SelectedProvider();
		}
		return this.instance;
	}
}

export const DeterministicHash = {
	hash: (plaintext: string, secretPepper: string): Promise<string> =>
		DeterministicHashFactory.getProvider().hash(plaintext, secretPepper),
};
