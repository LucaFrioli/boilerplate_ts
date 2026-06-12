import { createHmac } from 'node:crypto';
import { DeterministicHahserBase } from '@Crypto/contracts/DeterministicHasher.contract.js';

export default class HMAC extends DeterministicHahserBase {
	protected get proviederName(): string {
		return 'HMAC';
	}

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
