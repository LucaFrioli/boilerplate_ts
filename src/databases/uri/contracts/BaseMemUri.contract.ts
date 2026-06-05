import { memEnvValidationSchema } from '@Configs/Schemas/memDbEnv.schema.js';
import { nodeEnvSupported, type dbsAcepteds } from '@Configs/Constants';
import { env } from '@Configs/env.js';
import { createChildLogger, type handlerContractsErrorsParams } from '@Configs/logger.js';
import { isMemDatabaseUri, type MemDatabaseURI } from '@Types';
import type pino from 'pino';
import z from 'zod';

export type EnvDataForMemDbUri = Pick<
	typeof env,
	| 'NODE_ENV'
	| 'MEM_DB_TYPE'
	| 'MEM_DB_HOST'
	| 'MEM_DB_PORT'
	| 'MEM_DB_PROTOCOL'
	| 'MEM_DB_USERNAME'
	| 'MEM_DB_PASSWORD'
	| 'MEM_DB_INDEX_OR_PATH'
	| 'MEM_DB_SENTINEL_MASTER_ID'
	| 'MEM_DB_SENTINEL_USERNAME'
	| 'MEM_DB_SENTINEL_PASSWORD'
>;

export interface IMemDatabaseUri {
	get uri(): MemDatabaseURI;
}

export abstract class BaseMemUri implements IMemDatabaseUri {
	protected abstract get ServiceName(): string;
	protected _uri?: MemDatabaseURI;
	protected _baseEnvMemDb?: EnvDataForMemDbUri;
	protected _password?: string;
	protected abstract readonly dbName: dbsAcepteds;
	private _internalLogger: pino.Logger = createChildLogger({
		fileType: 'uri',
		service: 'database',
		module: 'BaseMemUri',
	});

	public get uri(): MemDatabaseURI {
		if (!isMemDatabaseUri(this._uri, this.dbName)) {
			this.handlerErrors({
				erroLevel: 'fatal',
				error: {},
				message: 'Erro interno, a uri é indefinida ou mal formada!',
				method: 'get uri',
			});
		}
		return this._uri;
	}

	protected logInfo(
		message: string,
		method: string,
		refineInfosObject: pino.LogFnFields = {},
	): void {
		this._internalLogger.info(
			{ service: this.ServiceName, method, ...refineInfosObject },
			message,
		);
	}

	protected handlerErrors(params: handlerContractsErrorsParams): never {
		this._internalLogger[params.erroLevel](
			{ service: this.ServiceName, specifErrors: params.error },
			params.message,
		);
		throw new Error(`Erro de módulo ${this.ServiceName}: erro detectado ${params.message}`);
	}

	constructor() {
		this.init();
	}

	protected validateBaseEnv(): void {
		// obrigatóriamente pede que que tenha a env declarada e configurada da maneira correta para poder realizar a string de conexão, a validação é dupla no boot e está aqui caso queira deixar o código mais modular;
		if (this._baseEnvMemDb === undefined) {
			const baseMemEnvShield: z.ZodType<EnvDataForMemDbUri> = z.object({
				MEM_DB_TYPE: memEnvValidationSchema.shape.MEM_DB_TYPE,
				MEM_DB_PROTOCOL: memEnvValidationSchema.shape.MEM_DB_PROTOCOL,
				MEM_DB_HOST: memEnvValidationSchema.shape.MEM_DB_HOST,
				MEM_DB_PORT: memEnvValidationSchema.shape.MEM_DB_PORT,
				MEM_DB_INDEX_OR_PATH: memEnvValidationSchema.shape.MEM_DB_INDEX_OR_PATH,
				MEM_DB_PASSWORD: memEnvValidationSchema.shape.MEM_DB_PASSWORD,
				MEM_DB_USERNAME: memEnvValidationSchema.shape.MEM_DB_USERNAME,
				MEM_DB_SENTINEL_MASTER_ID: memEnvValidationSchema.shape.MEM_DB_SENTINEL_MASTER_ID,
				MEM_DB_SENTINEL_USERNAME: memEnvValidationSchema.shape.MEM_DB_SENTINEL_USERNAME,
				MEM_DB_SENTINEL_PASSWORD: memEnvValidationSchema.shape.MEM_DB_SENTINEL_PASSWORD,
				NODE_ENV: z.enum(nodeEnvSupported),
			});

			const shildResult = baseMemEnvShield.safeParse(env);

			if (!shildResult.success) {
				this.handlerErrors({
					erroLevel: 'fatal',
					method: 'validateBaseEnv',
					error: z.treeifyError(shildResult.error),
					message: 'Variaveis de hambiente maculadas após boot do sistema.',
				});
			}

			this._baseEnvMemDb = Object.freeze(shildResult.data);
		}
	}

	protected normalizePassword(rawPassWord: string): void {
		this._password = encodeURIComponent(rawPassWord);
	}

	private init(): void {
		this.validateBaseEnv();

		if (this._baseEnvMemDb === undefined) {
			this.handlerErrors({
				erroLevel: 'fatal',
				method: 'init (BaseMemUri)',
				message: 'Erro ao iniciar o gerador de string de conexão de Memory Database',
				error: {
					envValueMemDb: this._baseEnvMemDb,
				},
			});
		}

		this.guardBroken();

		this.generateMemDBUri();
	}

	/**
	 * Este método permite que possamos expandir mais facilmente o comportamento do database
	 * conforme os tipos de ambinetes que a aplicação poderá rodar no momento iremos separar
	 * em dois development ou default sendo (production | stage | test), caso necessário criar
	 * uma configuração basta criar um novo switch e método contratual, isso permite
	 * que possamos ter diferentes configurações de inicialização
	 */
	private generateMemDBUri(): void {
		if (
			this._baseEnvMemDb?.NODE_ENV === undefined ||
			!nodeEnvSupported.includes(this._baseEnvMemDb.NODE_ENV)
		) {
			this.handlerErrors({
				erroLevel: 'fatal',
				method: 'generateMemDBUri',
				message:
					'Erro ao tentar URI para produção verifique se ela pertence a algum dos ambientes suportados',
				error: {
					nodeEnvValue: this._baseEnvMemDb?.NODE_ENV,
					typeofNodeEnv: typeof this._baseEnvMemDb?.NODE_ENV,
				},
			});
		}

		switch (this._baseEnvMemDb.NODE_ENV) {
			case 'development':
				this._uri = this.generateUriDev(this._baseEnvMemDb);
				break;
			default:
				this._uri = this.generateUriProd(this._baseEnvMemDb);
				break;
		}
	}

	/**
	 * **guardBroken**
	 * Método que irá revizar as envs passadas com o esperado realmente
	 * pela classe concreta isso é mais uma garantia de fail fast,
	 * se algo não corresponder com a realidade deve ele gerar um erro tratado
	 * recomendação de uso de handler de erro interno para tratamento
	 *
	 * @returns {void}
	 */
	protected abstract guardBroken(): void;

	/**
	 * Gerador de uri para ambiente de desenvolvimento.
	 */
	protected abstract generateUriDev(validatedEnvValues: EnvDataForMemDbUri): MemDatabaseURI;

	/**
	 * Gerador de uri para ambiente de desenvolvimento.
	 */
	protected abstract generateUriProd(validatedEnvValues: EnvDataForMemDbUri): MemDatabaseURI;

	/**
	 * Máscara dados sensíveis para logs de auditoria.
	 * @returns {string}
	 */
	protected abstract maskUriToLog(unmaskUri: string): string;
}
