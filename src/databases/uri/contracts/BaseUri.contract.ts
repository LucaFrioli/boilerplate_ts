import { createChildLogger, type handlerContractsErrorsParams } from '@Configs/logger.js';
import { nodeEnvSupported } from '@Configs/constants/env.constants.js';
import { dbEnvValidationSchema } from '@Configs/schemas/dbEnv.schema.js';
import { env } from '@Configs/env.js';
import type pino from 'pino';
import { isDatabaseUri, type DatabaseURI } from '@Types';
import z from 'zod';

/**
 * Interface que define as chaves necessárias da env para construção de uma URI.
 * Usamos Pick<typeof env, ...> para garantir que o contrato esteja amarrado
 * matematicamente às chaves reais validadas pelo Zod.
 */
export type EnvDataForUri = Pick<
	typeof env,
	| 'DATABASE_HOST'
	| 'DATABASE_PORT'
	| 'DATABASE_NAME'
	| 'DATABASE_USERNAME'
	| 'DATABASE_PASSWORD'
	| 'NODE_ENV'
	| 'DATABASE_TYPE'
>;

/**
 * Garantindo que URI files possam apenas retornar a uri assim deixando encapsulada a lógica de validações e formações
 */
export interface IDatabaseUri {
	get uri(): DatabaseURI;
}

export abstract class BaseUri implements IDatabaseUri {
	// variavel auxiliadora para riqueza de loggers
	protected abstract get uriGeneratorName(): string;
	// retrono da uri em si
	protected _uri?: DatabaseURI;
	// variavel auxiliar para transformar senhas em urls legíveis pelo computador permitindo ainda mais segurança em senhas de bancos de dados
	protected _password?: string;
	protected _specificEnvValues?: Record<string, unknown>;
	protected _baseEnvValues?: EnvDataForUri;

	// logger que traz bse para a riquesa de detalhes e rastreabilidado do sistema
	private BaseUriLogger: pino.Logger = createChildLogger({
		service: 'database',
		fileType: 'uri',
		module: 'BaseUri',
	});

	// Obriga a iniciar uma url já formatada e bem formada
	constructor() {
		this.init();
	}

	// metodo grantidor que a url está bem formada antes de ser instânciada na aplicação
	public get uri(): DatabaseURI {
		if (!isDatabaseUri(this._uri)) {
			this.handlerErrors({
				erroLevel: 'fatal',
				error: { uriType: typeof this._uri, rawUri: this._uri },
				message: 'A uri é indefinidia, ou mal formada',
				method: 'get uri',
			});
		}
		return this._uri;
	}

	/**
	 * Método responsável por orquestrar a criação de uma uri de conexão com banco de dados.
	 * O uso do 'init' centralizado garante que o fluxo de validação e geração ocorra
	 * de forma padronizada em todos os provedores.
	 */
	protected init(): void {
		this.validateBaseEnvDatas();

		if (this._baseEnvValues === undefined) {
			this.handlerErrors({
				erroLevel: 'fatal',
				error: { rawValidetedEnv: this._baseEnvValues },
				message:
					'Erro ao inicializar criação de string de conexão, verifique por qual motivo a base de hambiente não se ncontra formada',
				method: 'init',
			});
		}

		this.guardBroken();

		if (this._baseEnvValues.NODE_ENV === 'development') {
			this._uri = this.generateUriToDev(this._baseEnvValues);
			return;
		}

		this._uri = this.generateUriToProd(this._baseEnvValues);
	}

	/**
	 * **NormalzePassword**
	 * Função específica para poder flexibilizar o uso de senhas dentor de bancos de daods,
	 * garantindo senhas mais seguras e complexas, compatíveis com strings URI
	 *
	 * @param rawPassword - *string* senha vinda diretamente da env
	 *
	 * **Internamente o método dá um set no atributo `_password`**
	 *
	 * @returns {void}
	 */
	protected normalizePassword(rawPassword: string): void {
		this._password = encodeURIComponent(rawPassword);
	}

	/**
	 * Realiza o mapeamento e validações extras de negócio sobre as envs.
	 * Retorna apenas o subconjunto necessário para a construção da URI.
	 * Bem como a validação extra garante defesa em profundidade
	 *
	 * @returns {void}
	 */
	protected validateBaseEnvDatas(): void {
		if (this._baseEnvValues === undefined) {
			const baseUriEnvsShild: z.ZodType<EnvDataForUri> = z.object({
				NODE_ENV: z.enum(nodeEnvSupported),
				DATABASE_TYPE: dbEnvValidationSchema.shape.DATABASE_TYPE,
				DATABASE_NAME: dbEnvValidationSchema.shape.DATABASE_NAME,
				DATABASE_HOST: dbEnvValidationSchema.shape.DATABASE_HOST, // adicionar validação para verificaç~ao se é localhost ou não,, baseado no node_env e verificar especificamente se não ofr noed env, é uma string válida de um endereço ip (no momento isso ficará como dívida técnica)
				DATABASE_PORT: dbEnvValidationSchema.shape.DATABASE_PORT,
				DATABASE_USERNAME: dbEnvValidationSchema.shape.DATABASE_USERNAME,
				DATABASE_PASSWORD: dbEnvValidationSchema.shape.DATABASE_PASSWORD,
			});

			const shildResult = baseUriEnvsShild.safeParse(env);

			if (!shildResult.success) {
				this.handlerErrors({
					erroLevel: 'fatal',
					error: z.treeifyError(shildResult.error),
					message:
						'Variáveis de ambiente base foram maculadas após a inicialização do app.',
					method: 'validateBaseEnvDatas',
				});
			}

			this._baseEnvValues = Object.freeze(shildResult.data);
		}
	}

	/**
	 * Máscara dados sensíveis para logs de auditoria.
	 * @returns {string}
	 */
	protected abstract maskUriToLog(unmaskUri: string): string;

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
	 * Adiciona validação extra para env, e configurações específicas para cada tipo de banco,
	 * deve ser chamado apenas dentro dos métodos `generateUriToDev` ou `generateUriToProd` a
	 * depender do caso específico, caso realmente form uma configuração imprecindível para a
	 * url da classe concreta e bom funcionamento da conexão de banco pode-se pensar em adicionar
	 *  no final da impllementação do  `guardBroken`
	 *
	 * **Esta função é unica e exclusiva para fazer
	 * o set do atributo `_specificEnvValues`**
	 *
	 * @returns {void}
	 */
	protected validateSpecificEnvValues(): void {
		const e = new Error(
			'Erro ao tentar executar o método, por gentileza implemente o método referido',
		);
		this.handlerErrors({
			message: 'Implemente o método antes de utilizá-lo',
			erroLevel: 'fatal',
			method: 'validateSpecificEnvValues',
			error: e,
		});
	}

	/**
	 * Gerador de uri para ambiente de desenvolvimento.
	 */
	protected abstract generateUriToDev(validatedEnvValues: EnvDataForUri): DatabaseURI;

	/**
	 * Gerador de uri para ambiente de desenvolvimento.
	 */
	protected abstract generateUriToProd(validatedEnvValues: EnvDataForUri): DatabaseURI;

	// Permite gravar informações importantes no log, de maneira mais fácil
	protected logInfo(message: string, method: string, refineInfosObject: pino.LogFnFields = {}): void {
		this.BaseUriLogger.info({ module: this.uriGeneratorName, method ,...refineInfosObject }, message);
	}

	// lida com erros que possam acontecer nas classes concretas dde forma elegante enrriquecendo ainda mais o contexto e garantindo rastreabilidade, além de lançar um erro garantindo que nada passe
	protected handlerErrors(params: handlerContractsErrorsParams): never {
		this.BaseUriLogger[params.erroLevel](
			{ module: this.uriGeneratorName, error: params.error, method: params.method },
			params.message,
		);
		throw new Error(
			`Erro de módulo ${this.uriGeneratorName}: erro detectado ${params.message}`,
		);
	}
}
