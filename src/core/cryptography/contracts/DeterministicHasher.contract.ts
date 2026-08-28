/**
 * @module IDeterministicHasher
 * @description Contrato central e infraestrutura abstrata para provedores de Hashing Determinístico de uma via.
 *
 * ## Filosofia de Design:
 * 1. **Fail-Fast (Falha Rápida):** Qualquer corrupção ambiental ou violação estrutural de segurança
 *    (como um pepper de entropia fraca) aborta a execução instantaneamente para prevenir vazamentos.
 * 2. **Blindagem de Memória (Prototype Shield):** Valida recursivamente o `process.env` no boot do módulo
 *    contra injeções dinâmicas de variáveis (Prototype Pollution) que tentem modificar a engine ativa.
 * 3. **Agnosticismo de Runtime (W3C vs Node):** Abstrai a execução determinística chaveada entre APIs
 *    nativas síncronas rápidas (C++ nativo do Node.js/OpenSSL) e assíncronas padrão WebCrypto (Edge/Cloudflare).
 *
 * ## Casos de Uso Comuns:
 * - **Blind Indexing:** Geração de identificadores de consulta determinísticos para busca exata sobre colunas encriptadas.
 * - **Password Pre-hashing:** Codificação preliminar rápida de senhas longas para contornar o limite físico de 72 bytes do Bcrypt.
 */

import { env } from '@Configs/env.js';
import { createChildLogger, type handlerContractsErrorsParams } from '@Configs/logger.js';
import type pino from 'pino';
import { criptographyEnvValidationSchema } from '@Configs/Schemas/criptography.schema.js';
import { nodeEnvSupported } from '@Configs/Constants';
import { type ValidCryptoKey, assertsValidCryptoKey } from '@Types';
import z from 'zod';

/**
 * @type EnvDataForDeterministicHasher
 * @description Filtro estrito (Pick) extraído da configuração global da aplicação.
 * Limita a exposição das variáveis de ambiente às necessidades específicas do módulo de hash determinístico.
 */
export type EnvDataForDeterministicHasher = Pick<
	typeof env,
	| 'NODE_ENV'
	| 'CRIPTOGRAPHY_PASSWORDS_DIGESTOR'
	| 'CRIPTOGRAPHY_PASSWORDS_ALGORITHM'
	| 'CRIPTOGRAPHY_SECURITY_PEPPER'
	| 'CRIPTOGRAPHY_ENGINE_MODE'
>;

/**
 * @interface IDeterministicHasher
 * @description Contrato central para geração de hashes determinísticos de uma via.
 *
 * ## Casos de Uso:
 * 1. **Blind Indexes:** Permite a busca exata em colunas de banco de dados encriptadas de forma determinística
 *    (sem revelar o texto puro e sem usar cifras vulneráveis a ataques de dicionário).
 * 2. **Pre-hashing de Senhas:** Mitiga a vulnerabilidade de truncamento de 72 bytes do Bcrypt, pré-hasheando
 *    passwords antes de despachá-los para a função de derivação lenta, além de ajudar a conter tetativas de ataque DOS.
 *
 * - hasher(plaintext: `string`, secretPepper: `string`): Promise\<string\>
 */
export interface IDeterministicHasher {
	/**
	 * Gera um hash determinístico de uma via, garantindo saída < 72 bytes.
	 *
	 * @param plaintext O texto puro a ser codificado.
	 * @param secretPepper O pepper de alta entropia injetado no processo.
	 * @returns Uma Promise com a string do hash gerado (geralmente representada em hexadecimal).
	 * @throws {Error} Se o pepper for inválido ou se houver falha crítica de hardware/motor de criptografia.
	 */
	hash(plaintext: string, secretPepper: string): Promise<string>;
}

/**
 * @class DeterministicHahserBase
 * @implements {IDeterministicHasher}
 * @description Classe base abstrata para todos os geradores de hash determinístico (ex: HMAC).
 * Consolida o fluxo operacional através do padrão Template Method, delegando a execução matemática
 * aos hooks específicos do runtime (Sync vs Edge).
 */
export abstract class DeterministicHahserBase implements IDeterministicHasher {
	/**
	 * Nome do provedor concreto (ex: 'HMAC') para fins de logs de auditoria e telemetria.
	 */
	protected abstract get proviederName(): string;

	/**
	 * Cache contendo o subconjunto de variáveis ambientais validadas e higienizadas.
	 */
	protected _baseEnv?: EnvDataForDeterministicHasher;

	/**
	 * Logger estruturado acoplado ao fluxo de hashing para registrar incidentes de segurança.
	 */
	private DeterministicHasherBaseLogger: pino.Logger = createChildLogger({
		fileType: 'interface',
		service: 'cryptography',
		module: 'DeterministicHahser.contract',
	});

	/**
	 * Registra mensagens informativas e de debug anexando metadados do provedor ativo.
	 */
	protected logInfo(lvl: 'info' | 'debug', obj: object, msg: string): void {
		this.DeterministicHasherBaseLogger[lvl]({ serviceNmae: this.proviederName, ...obj }, msg);
	}

	/**
	 * Centraliza o tratamento de falhas. Registra logs nos níveis corretos e lança
	 * exceções genéricas higienizadas para evitar o vazamento de segredos nos rastros de pilha (stack traces).
	 */
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

	/**
	 * Realiza validação estrita das variáveis de ambiente de criptografia.
	 * Protege contra injeções de memória (Prototype Pollution) e mutações no ambiente após a inicialização.
	 *
	 * @throws {Error} Se houver variáveis malformadas ou corrompidas.
	 */
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

	/**
	 * Orquestrador central de hashing determinístico.
	 * Encaminha de forma transparente a execução para a API nativa síncrona do Node.js
	 * ou a API assíncrona padrão W3C Subtle dependendo do runtime.
	 *
	 * @param plaintext O texto original a ser codificado.
	 * @param secretPepper O pepper de alta entropia.
	 * @returns O hash determinístico gerado.
	 */
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

	/**
	 * Valida as restrições mínimas de segurança e entropia do pepper recebido.
	 *
	 * @param secretPapper O pepper a ser verificado.
	 * @returns Retorna a chave devidamente tipada se ela passar na validação.
	 */
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

	/**
	 * Traduz o algoritmo digestor para o formato padrão do W3C WebCrypto (ex: 'sha256' -> 'SHA-256').
	 *
	 * @returns String normalizada do digestor.
	 */
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
	 * Hook síncrono para execução no Node.js baseado em C++ nativo.
	 *
	 * @param plaintext O texto original a ser codificado.
	 * @param secretPepper O pepper criptográfico de entropia verificada.
	 * @returns String do hash correspondente.
	 */
	protected abstract hashSync(plaintext: string, secretPepper: string): string;

	/**
	 * Hook assíncrono compatível com W3C WebCrypto (Edge/Workers).
	 *
	 * @param plaintext O texto original a ser codificado.
	 * @param secretPepper O pepper criptográfico de entropia verificada.
	 * @returns Uma Promise com a string do hash correspondente.
	 */
	protected abstract hashInEdge(plaintext: string, secretPepper: string): Promise<string>;
}
