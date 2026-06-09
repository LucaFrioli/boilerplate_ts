/**
 * @module IKeyDerivator
 * @description Contrato central e infraestrutura abstrata para provedores de Derivação de Chaves (KDF).
 *
 * ## Filosofia de Design:
 * 1. **Fail-Fast (Falha Rápida):** Qualquer violação de precondição, credencial fraca ou variável
 *    de ambiente corrompida interrompe a execução imediatamente via exceção fatal (`:never`).
 * 2. **Isolamento de Domínio:** O contrato força o uso do parâmetro `contextInfo` (salt/info)
 *    para assegurar que uma chave mestra compartilhada gere sub-chaves criptograficamente independentes.
 * 3. **Independência de Engine (W3C vs Node):** Abstrai as diferenças de runtime entre APIs
 *    síncronas nativas do Node.js (OpenSSL) e APIs assíncronas padrão W3C (Edge/Browsers).
 */

import { env } from '@Configs/env.js';
import { createChildLogger, type handlerContractsErrorsParams } from '@Configs/logger.js';
import type pino from 'pino';
import { criptographyEnvValidationSchema } from '@Configs/schemas/criptography.schema.js';
import { nodeEnvSupported } from '@Configs/Constants/index.js';
import { type ValidCryptoKey, assertsValidCryptoKey } from '@Types';
import z from 'zod';

/**
 * @type EnvDataForKeyDerivator
 * @description Filtro estrito (Pick) extraído da configuração global da aplicação.
 * Isso garante o princípio do menor privilégio, expondo ao contrato apenas as variáveis
 * necessárias para governar o ciclo de vida da derivação de chaves.
 */
export type EnvDataForKeyDerivator = Pick<
	typeof env,
	| 'NODE_ENV'
	| 'CRIPTOGRAPHY_DERIVATION_KEY_ALGORITHM'
	| 'CRIPTOGRAPHY_PASSWORDS_DIGESTOR'
	| 'CRIPTOGRAPHY_ENGINE_MODE'
>;

/**
 * @interface IKeyDerivator
 * @description Contrato público exposto para os consumers e use cases de negócio do sistema.
 */
export interface IKeyDerivator {
	/**
	 * Deriva chaves criptográficas seguras de tamanho variável a partir de uma chave mestra.
	 *
	 * @param masterKey A chave raiz de alta entropia (Hex ou Base64) configurada no ambiente.
	 * @param contextInfo String única que define o propósito/domínio da sub-chave (ex: 'cipher:user-cpf').
	 * @param outputLengthBytes O comprimento físico desejado para a chave gerada, medido em bytes.
	 * @returns Uma Promise contendo o Buffer da chave criptográfica derivada.
	 * @throws {Error} Se a chave mestra for fraca ou ocorrer uma falha matemática no motor de derivação.
	 */
	derive(masterKey: string, contextInfo: string, outputLengthBytes: number): Promise<Buffer>;
}

/**
 * @class KeyDerivatorBase
 * @implements {IKeyDerivator}
 * @description Classe abstrata que serve de base para os provedores (ex: HKDF, KMAC, PBKDF2).
 * Aplica o padrão de projeto Template Method para unificar validações ambientais e tratamento de logs.
 */
export abstract class KeyDerivatorBase implements IKeyDerivator {
	/**
	 * Nome do provedor concreto (ex: 'HKDF', 'PBKDF2') para fins de rastreabilidade em logs de auditoria.
	 */
	protected abstract get providerName(): string;

	/**
	 * Cache imutável das variáveis ambientais validadas no nascimento/inicialização do fluxo.
	 */
	protected _baseEnv?: EnvDataForKeyDerivator;

	/**
	 * Logger contextualizado acoplado ao módulo de criptografia e auditoria de segurança.
	 */
	private KeyDerivatorBaseLogger: pino.Logger = createChildLogger({
		fileType: 'interface',
		service: 'cryptography',
		module: 'KeyDerivator.contract',
	});

	/**
	 * Registra logs operacionais (info/debug) enriquecendo a mensagem com metadados do provedor ativo.
	 */
	protected logInfo(lvl: 'info' | 'debug', obj: object, msg: string): void {
		this.KeyDerivatorBaseLogger[lvl]({ serviceName: this.providerName, ...obj }, msg);
	}

	/**
	 * Centraliza o tratamento de falhas críticas. Registra logs no nível de gravidade correto
	 * e lança exceções uniformes para evitar o vazamento de detalhes técnicos (stack traces) para o usuário.
	 */
	protected handlerErrors(params: handlerContractsErrorsParams): never {
		this.KeyDerivatorBaseLogger[params.erroLevel](
			{
				serviceName: this.providerName,
				method: params.method,
				specificErrors: params.error,
			},
			params.message,
		);

		throw new Error(
			`Erro do provedor de derivação ${this.providerName}. \nErros detectados: \n - ${params.message}`,
		);
	}

	/**
	 * Realiza uma dupla validação de integridade nas variáveis de ambiente.
	 *
	 * ## Por que isso existe?
	 * Impede ataques de "poluição de protótipo" ou injeção em runtime onde um atacante
	 * tenta mutar o `process.env` após o boot seguro da aplicação. Esta checagem garante
	 * que os valores do parser original não foram adulterados.
	 */
	protected validatedEnvValues(): void {
		const method = 'validatedEnvValues' as const;
		if (this._baseEnv === undefined) {
			const baseEnvKeyDerivatorShield: z.ZodType<EnvDataForKeyDerivator> =
				z.object({
					NODE_ENV: z.enum(nodeEnvSupported),
					CRIPTOGRAPHY_ENGINE_MODE:
						criptographyEnvValidationSchema.shape.CRIPTOGRAPHY_ENGINE_MODE,
					CRIPTOGRAPHY_DERIVATION_KEY_ALGORITHM:
						criptographyEnvValidationSchema.shape.CRIPTOGRAPHY_DERIVATION_KEY_ALGORITHM,
					CRIPTOGRAPHY_PASSWORDS_DIGESTOR:
						criptographyEnvValidationSchema.shape.CRIPTOGRAPHY_PASSWORDS_DIGESTOR,
				});

			const shieldResult = baseEnvKeyDerivatorShield.safeParse(env);

			if (!shieldResult.success) {
				this.handlerErrors({
					erroLevel: 'fatal',
					error: z.treeifyError(shieldResult.error),
					method,
					message: 'Erro ao validar env de derivação, tentativa de macular valores em runtime',
				});
			}

			this._baseEnv = shieldResult.data;
		}
	}

	/**
	 * Orquestrador principal da derivação de chaves.
	 * Valida as entradas e escolhe de forma transparente o motor de execução (Sync vs Edge).
	 */
	public async derive(
		masterKey: string,
		contextInfo: string,
		outputLengthBytes: number
	): Promise<Buffer> {
		const method = 'derive';
		this.validatedEnvValues();

		if (this._baseEnv === undefined) {
			this.handlerErrors({
				erroLevel: 'fatal',
				method,
				error: { typeofBaseEnv: typeof this._baseEnv },
				message: 'Erro interno de variáveis de ambiente do derivador de chaves',
			});
		}

		// Valida a chave mestra utilizando o guard de segurança do boilerplate
		this.validateMasterKey(masterKey);

		try {
			// Encaminha para o motor apropriado dependendo do ambiente (Edge vs Node clássico)
			if (this._baseEnv.CRIPTOGRAPHY_ENGINE_MODE === 'async_web_api') {
				return await this.deriveInEdge(masterKey, contextInfo, outputLengthBytes);
			}

			return this.deriveSync(masterKey, contextInfo, outputLengthBytes);
		} catch (e) {
			this.handlerErrors({
				erroLevel: 'error',
				method,
				error: e instanceof Error ? e : new Error(String(e)),
				message: 'Falha crítica durante a derivação de chaves criptográficas',
			});
		}
	}

	/**
	 * Valida a integridade e a segurança mínima (entropia) da chave mestra raiz fornecida.
	 * Lança um erro imediatamente se a chave falhar no guard estrito.
	 */
	protected validateMasterKey(masterKey: unknown): ValidCryptoKey {
		const method = 'validateMasterKey';
		try {
			assertsValidCryptoKey(masterKey);
			return masterKey;
		} catch (e) {
			this.handlerErrors({
				erroLevel: 'error',
				method,
				error: e,
				message: 'A chave mestra fornecida não atende aos requisitos mínimos de segurança',
			});
		}
	}

	/**
	 * Normaliza a nomenclatura do digestor da aplicação (ex: 'sha256') para a convenção
	 * exigida pela API oficial W3C Web Crypto (ex: 'SHA-256').
	 */
	protected normalizeDigestorNameToWebCryptoApi(): string {
		const method = 'normalizeDigestorNameToWebCryptoApi';

		if (this._baseEnv === undefined) {
			this.handlerErrors({
				erroLevel: 'fatal',
				method,
				error: { typeofBaseEnv: typeof this._baseEnv },
				message: 'Incapaz de acessar o digestor configurado no sistema',
			});
		}

		return this._baseEnv.CRIPTOGRAPHY_PASSWORDS_DIGESTOR.replace('sha', 'SHA-').toUpperCase();
	}

	/**
	 * **deriveSync**
	 * Hook abstrato para derivação síncrona.
	 * Deve ser implementado usando o módulo nativo C++ do Node.js (`node:crypto`) para performance máxima.
	 */
	protected abstract deriveSync(
		masterKey: string,
		contextInfo: string,
		outputLengthBytes: number
	): Buffer;

	/**
	 * **deriveInEdge**
	 * Hook abstrato para derivação assíncrona.
	 * Deve ser implementado usando a API assíncrona padrão W3C WebCrypto, compatível com Cloudflare Workers.
	 */
	protected abstract deriveInEdge(
		masterKey: string,
		contextInfo: string,
		outputLengthBytes: number
	): Promise<Buffer>;
}
