/**
 * @module HMACProvider
 * @description Provedor concreto de Hashing Determinístico utilizando o algoritmo HMAC (Keyed-Hashing for Message Authentication).
 *
 * ## Filosofia:
 * Implementa o protocolo HMAC seguindo a RFC 2104. É projetado para ser agnóstico ao runtime,
 * despachando as operações para módulos rápidos em C++ do Node.js ou para o motor seguro WebCrypto
 * dependendo de onde o código está sendo executado.
 */

import { createHmac } from 'node:crypto';
import { DeterministicHahserBase } from '@Crypto/contracts/DeterministicHasher.contract.js';

/**
 * @class HMAC
 * @extends {DeterministicHahserBase}
 * @description Provedor de hashing determinístico HMAC.
 * Utiliza chaves de alta entropia (peppers) para garantir autenticidade e unicidade dos hashes gerados.
 */
export default class HMAC extends DeterministicHahserBase {
	/**
	 * Retorna o identificador textual do provedor.
	 */
	protected get proviederName(): string {
		return 'HMAC';
	}

	/**
	 * Computa o hash HMAC de forma síncrona utilizando a biblioteca nativa C++ do Node.js.
	 *
	 * @param plaintext O texto plano a ser encriptado.
	 * @param secretPepper O pepper de criptografia (chave secreta).
	 * @returns O digest gerado em formato Hexadecimal.
	 * @throws {Error} Se as variáveis ambientais ou chaves de segurança estiverem corrompidas.
	 */
	protected hashSync(plaintext: string, secretPepper: string): string {
		const method = 'hashSync';
		this.validatedEnvValues();

		if (this._baseEnv === undefined) {
			this.handlerErrors({
				erroLevel: 'fatal',
				method,
				error: {},
				message: 'Erro na definição de variaveis de ambientes durante execução',
			});
		}
		return createHmac(this._baseEnv.CRIPTOGRAPHY_PASSWORDS_DIGESTOR, secretPepper)
			.update(plaintext, 'utf-8')
			.digest('hex');
	}

	/**
	 * Computa o hash HMAC de forma assíncrona utilizando a API de segurança WebCrypto (W3C).
	 * Ideal para ambientes baseados em V8 Isolates/Edge Computing (Cloudflare Workers).
	 *
	 * @param plaintext O texto plano a ser encriptado.
	 * @param secretPepper O pepper de criptografia (chave secreta).
	 * @returns Uma Promise contendo o digest gerado em formato Hexadecimal.
	 */
	protected async hashInEdge(plaintext: string, secretPepper: string): Promise<string> {
		const method = 'hashInEdge';
		try {
			this.validatePepper(secretPepper);
		} catch (e) {
			this.handlerErrors({
				erroLevel: 'fatal',
				method,
				error: e,
				message: 'Erro crítico, pepper inválido verifique as configurações do sistema',
			});
		}
		const encoder = new TextEncoder();
		const keyBuffer = encoder.encode(secretPepper);
		const messageBuffer = encoder.encode(plaintext);
		this.validatedEnvValues();

		const cryptoKey = await crypto.subtle.importKey(
			'raw',
			keyBuffer,
			{
				name: this.proviederName,
				hash: this.normalizeDigestorNameToWebCryptoApi(),
			},
			false,
			['sign'],
		);

		const singnatureBuffer = await crypto.subtle.sign(
			this.proviederName,
			cryptoKey,
			messageBuffer,
		);

		return Array.from(new Uint8Array(singnatureBuffer))
			.map((byte) => byte.toString(16).padStart(2, '0'))
			.join('');
	}
}
