/**
 * @module HKDFProvider
 * @description Provedor concreto de Derivação de Chaves baseado no algoritmo HKDF (HMAC-based Extract-and-Expand Key Derivation Function).
 *
 * ## Filosofia de Design:
 * Implementa o protocolo de derivação conforme a RFC 5869. É projetado para ser agnóstico ao runtime,
 * alternando a derivação entre o algoritmo síncrono rápido `hkdfSync` do Node.js (baseado em C++/OpenSSL)
 * e o motor assíncrono padrão SubtleCrypto (W3C) suportado em navegadores e Edge Workers.
 */

import { assertsDerivedKey, type DerivedKey } from '@Types';
import { KeyDerivatorBase } from '@Crypto/contracts/KeyDerivator.contract.js';
import { hkdfSync } from 'node:crypto';
import { toBytes } from '@Shared/Helpers/EncodingToByte.js';

/**
 * @class HKDFProvider
 * @extends {KeyDerivatorBase}
 * @description Provedor de derivação de chaves HKDF.
 * Permite esticar chaves mestras fracas ou gerar chaves filhas criptograficamente independentes
 * para múltiplos domínios através de separação por contexto.
 */
export default class HKDFProvider extends KeyDerivatorBase {
	/**
	 * Retorna o identificador textual do provedor.
	 */
	protected get providerName(): string {
		return 'HKDF';
	}

	/**
	 * Deriva uma sub-chave de forma síncrona utilizando o motor C++/OpenSSL do Node.js.
	 *
	 * @param masterKey A chave secreta raiz de alta entropia.
	 * @param contextInfo String de contexto única para isolamento de domínio (Domain Separation).
	 * @param outputLengthBytes O comprimento físico final desejado da chave em bytes.
	 * @returns A chave derivada nominalmente tipada e codificada em string Hexadecimal.
	 * @throws {Error} Se houver falha de ambiente, chaves fracas ou erro na validação do tamanho de saída.
	 */
	protected deriveSync<N extends number>(
		masterKey: string,
		contextInfo: string,
		outputLengthBytes: N,
	): DerivedKey<N> {
		const method = 'deriveSync' as const;

		this.validatedEnvValues();

		const masterKeyBuffer = Buffer.from(toBytes(masterKey));
		const slatValidation = this._baseEnv?.CRIPTOGRAPHY_DERIVATION_KEY_SALT
			? this._baseEnv.CRIPTOGRAPHY_DERIVATION_KEY_SALT
			: false;
		const salt = slatValidation ? Buffer.alloc(slatValidation) : Buffer.alloc(0);
		const infoBuffer = Buffer.from(toBytes(contextInfo));

		const digest = this._baseEnv?.CRIPTOGRAPHY_PASSWORDS_DIGESTOR || 'sha256';

		const deriveBuffer = hkdfSync(digest, masterKeyBuffer, salt, infoBuffer, outputLengthBytes);

		const derivedKey = Buffer.from(deriveBuffer).toString('hex');

		try {
			assertsDerivedKey(derivedKey, outputLengthBytes);
		} catch (e) {
			this.handlerErrors({
				erroLevel: 'fatal',
				method,
				error: { e, contextInfo },
				message: 'Erro ao derivar chave',
			});
		}

		return derivedKey;
	}

	/**
	 * Deriva uma sub-chave de forma assíncrona utilizando a API de segurança padrão W3C WebCrypto.
	 * Ideal para ambientes de Edge Computing (Cloudflare Workers, V8 Isolates).
	 *
	 * @param masterKey A chave secreta raiz de alta entropia.
	 * @param contextInfo String de contexto única para isolamento de domínio (Domain Separation).
	 * @param outputLengthBytes O comprimento físico final desejado da chave em bytes.
	 * @returns Uma Promise com a chave derivada nominalmente tipada e codificada em string Hexadecimal.
	 */
	protected async deriveInEdge<N extends number>(
		masterKey: string,
		contextInfo: string,
		outputLengthBytes: N,
	): Promise<DerivedKey<N>> {
		const method = 'deriveInEdge' as const;

		const mstKeyBytes = toBytes(masterKey);
		const infoCtxBytes = toBytes(contextInfo);

		const slatValidation = this._baseEnv?.CRIPTOGRAPHY_DERIVATION_KEY_SALT
			? this._baseEnv.CRIPTOGRAPHY_DERIVATION_KEY_SALT
			: false;
		const salt = slatValidation ? Buffer.alloc(slatValidation) : Buffer.alloc(0);

		const baseKey = await globalThis.crypto.subtle.importKey(
			'raw',
			mstKeyBytes,
			{ name: this.providerName },
			false,
			['deriveBits', 'deriveKey'],
		);

		const deriveBitsBuffer = await globalThis.crypto.subtle.deriveBits(
			{
				name: this.providerName,
				hash: this.normalizeDigestorNameToWebCryptoApi(),
				salt: salt,
				info: infoCtxBytes,
			},
			baseKey,
			outputLengthBytes * 8, // fazemos vezes 8 pois a api espera o tamanho em bits
		);

		const deriveBytes = new Uint8Array(deriveBitsBuffer);
		const derivedHex = Array.from(deriveBytes)
			.map((bytes) => bytes.toString(16).padStart(2, '0'))
			.join('');

		try {
			assertsDerivedKey(derivedHex, outputLengthBytes);
		} catch (e) {
			this.handlerErrors({
				erroLevel: 'fatal',
				method,
				error: { e, contextInfo },
				message: 'Erro ao tentar derivar chave',
			});
		}

		return derivedHex;
	}
}
