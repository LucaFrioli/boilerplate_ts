import { assertsDerivedKey, type DerivedKey } from '@Types';
import { KeyDerivatorBase } from '@Crypto/contracts/KeyDerivator.contract.js';
import { hkdfSync } from 'node:crypto';
import { toBytes } from '@Shared/Helpers/EncodingToByte.js';

export class HKDFProvider extends KeyDerivatorBase {
	protected get providerName(): string {
		return 'HKDF';
	}
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
