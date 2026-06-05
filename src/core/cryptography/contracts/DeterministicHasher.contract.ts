/**
 * @module IDeterministicHasher
 *
 */

import { env } from '@Configs/env.js';
import { createChildLogger, type handlerContractsErrorsParams } from '@Configs/logger.js';
import type pino from 'pino';
import { criptographyEnvValidationSchema } from '@Configs/Schemas/criptography.schema.js';
import { nodeEnvSupported } from '@Configs/Constants';
import { type ValidCryptoKey, assertsValidCryptoKey } from '@Types';
import z from 'zod';

export type EnvDataForDeterministicHasher = Pick<
	typeof env,
	| 'NODE_ENV'
	| 'CRIPTOGRAPHY_PASSWORDS_DIGESTOR'
	| 'CRIPTOGRAPHY_PASSWORDS_ALGORITHM'
	| 'CRIPTOGRAPHY_SECURITY_PEPPER'
	| 'CRIPTOGRAPHY_ENGINE_MODE'
>;

export interface IDeterministicHasher {
	/**
	 * Gera um hash determinístico de uma via, garantindo saída < 72 bytes.
	 * Ideal para Blind Index e pré-hashing de senhas longas.
	 */
	hash(plaintext: string, secretPepper: string): Promise<string>;
}

export abstract class DeterministicHahserBase implements IDeterministicHasher {
	protected abstract get proviederName(): string;
	protected _baseEnv?: EnvDataForDeterministicHasher;

	private DeterministicHasherBaseLogger: pino.Logger = createChildLogger({
		fileType: 'interface',
		service: 'cryptography',
		module: 'DeterministicHahser.contract',
	});

	protected logInfo(lvl: 'info' | 'debug', obj: object, msg: string): void {
		this.DeterministicHasherBaseLogger[lvl]({ serviceNmae: this.proviederName, ...obj }, msg);
	}

	protected handlerErrors(params: handlerContractsErrorsParams): never {
		this.DeterministicHasherBaseLogger[params.erroLevel](
			{
				serviceName: this.proviederName,
				method: params.method,
				specificErrors: params.error,
			},
			params.message,
		);

		throw new Error(
			`Erro do provedor ${this.proviederName}. \nErros detectados: \n - ${params.message}`,
		);
	}

	protected validatedEnvValues(): void {
		const method = 'validatedEnvValues' as const;
		if (this._baseEnv === undefined) {
			const baseEnvDeterministicHasherShild: z.ZodType<EnvDataForDeterministicHasher> =
				z.object({
					NODE_ENV: z.enum(nodeEnvSupported),
					CRIPTOGRAPHY_ENGINE_MODE:
						criptographyEnvValidationSchema.shape.CRIPTOGRAPHY_ENGINE_MODE,
					CRIPTOGRAPHY_PASSWORDS_ALGORITHM:
						criptographyEnvValidationSchema.shape.CRIPTOGRAPHY_PASSWORDS_ALGORITHM,
					CRIPTOGRAPHY_PASSWORDS_DIGESTOR:
						criptographyEnvValidationSchema.shape.CRIPTOGRAPHY_PASSWORDS_DIGESTOR,
					CRIPTOGRAPHY_SECURITY_PEPPER:
						criptographyEnvValidationSchema.shape.CRIPTOGRAPHY_SECURITY_PEPPER,
				});

			const shildResult = baseEnvDeterministicHasherShild.safeParse(env);

			if (!shildResult.success) {
				this.handlerErrors({
					erroLevel: 'fatal',
					error: z.treeifyError(shildResult.error),
					method,
					message: 'Erro ao validar env, tentativa de macular valores durante execução',
				});
			}

			this._baseEnv = shildResult.data;
		}
	}

	public async hash(plaintext: string, secretPepper: string): Promise<string> {
		const method = 'hash';
		this.validatedEnvValues();

		if (this._baseEnv === undefined) {
			this.handlerErrors({
				erroLevel: 'fatal',
				method,
				error: {
					typeofBaseEnv: typeof this._baseEnv,
				},
				message:
					'Erro dentro dos valores das variaveis de hambiente, entre em contato com os canais legais!',
			});
		}

		try {
			if (this._baseEnv.CRIPTOGRAPHY_ENGINE_MODE === 'async_web_api') {
				// webcrypto exige assincronia então tornamos este método assíncrono
				return await this.hashInEdge(plaintext, secretPepper);
			}

			return this.hashSync(plaintext, secretPepper);
		} catch (e) {
			this.handlerErrors({
				erroLevel: 'error',
				method,
				error: e instanceof Error ? e : new Error(String(e)),
				message: 'Falha cítica durante a execução do hash',
			});
		}
	}

	protected validatePepper(secretPapper: unknown): ValidCryptoKey {
		const method = 'validatePepper';
		try {
			assertsValidCryptoKey(secretPapper);
			return secretPapper;
		} catch (e) {
			this.handlerErrors({
				erroLevel: 'error',
				method,
				error: e,
				message:
					'Validação do secret pepper falhou, verifique o pepper que você passou para auxiliar na criptografia!',
			});
		}
	}

	protected normalizeDigestorNameToWebCryptoApi(): string {
		const method = 'normalizeDigestorNameToWebCryptoApi';

		if (this._baseEnv === undefined) {
			this.handlerErrors({
				erroLevel: 'fatal',
				method,
				error: {
					typeofBaseEnv: typeof this._baseEnv,
				},
				message:
					'Infelizmente não foi possível acessar o parametro que disponibiliza o digestor, verifique com a equipe técnica',
			});
		}

		const formatedString: string = this._baseEnv.CRIPTOGRAPHY_PASSWORDS_DIGESTOR.replace(
			'sha',
			'SHA-',
		).toUpperCase();

		return formatedString;
	}

	/**
	 * **hashSync**
	 * Métódo declarado e utilizado para realização e criação de hash via api nativa do node
	 */
	protected abstract hashSync(plaintext: string, secretPepper: string): string;

	/**
	 * **hashInEdge**
	 * Método declarado e utilizado para realização e criação de hashes em ambientes de edge computing,
	 * ou ambinetes que não tenham o node como base seguindo padronizações da w3c
	 */
	protected abstract hashInEdge(plaintext: string, secretPepper: string): Promise<string>;
}
