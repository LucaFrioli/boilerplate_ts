import { createChildLogger, type handlerContractsErrorsParams } from '@Configs/logger.js';
import type pino from 'pino';
import { env } from '@Configs/env.js';
import { isDatabaseUri, type DatabaseURI } from '@Types';

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
	protected abstract uriGeneratorName: string;
	// retrono da uri em si
	protected abstract _uri?: DatabaseURI;
	// variavel auxiliar para transformar senhas em urls legíveis pelo computador permitindo ainda mais segurança em senhas de bancos de dados
	protected abstract _password?: string;

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
		if (!isDatabaseUri(this._uri) || typeof this._uri === 'undefined') {
			this.handlerErrors({
				erroLevel: 'fatal',
				error: { uriType: typeof this._uri, rawUri: this._uri },
				message: 'A uri é indefinidia, ou mal formada',
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
		const validatedEnvValues = this.validateEnvDatas();

		if (validatedEnvValues.NODE_ENV === 'development') {
			this._uri = this.generateUriToDev(validatedEnvValues);
			return;
		}

		this._uri = this.generateUriToProd(validatedEnvValues);
	}

	protected normalizePassword(rawPassword: string): void{
		this._password = encodeURIComponent(rawPassword);
	}

	/**
	 * Realiza o mapeamento e validações extras de negócio sobre as envs.
	 * Retorna apenas o subconjunto necessário para a construção da URI.
	 * Bem como a validação extra garante defesa em profundidade
	 */
	protected abstract validateEnvDatas(): EnvDataForUri;

	/**
	 * Máscara dados sensíveis para logs de auditoria.
	 */
	protected abstract maskUriToLog(unmaskUri: string): string;

	/**
	 * Gerador de uri para ambiente de desenvolvimento.
	 */
	protected abstract generateUriToDev(validatedEnvValues: EnvDataForUri): DatabaseURI;

	/**
	 * Gerador de uri para ambiente de desenvolvimento.
	 */
	protected abstract generateUriToProd(validatedEnvValues: EnvDataForUri): DatabaseURI;

	// Permite gravar informações importantes no log, de maneira mais fácil
	protected logInfo(message: string, refineInfosObject: pino.LogFnFields = {}): void {
		this.BaseUriLogger.info({ module: this.uriGeneratorName, ...refineInfosObject }, message);
	}

	// lida com erros que possam acontecer nas classes concretas dde forma elegante enrriquecendo ainda mais o contexto e garantindo rastreabilidade, além de lançar um erro garantindo que nada passe
	protected handlerErrors(params: handlerContractsErrorsParams): never {
		this.BaseUriLogger[params.erroLevel](
			{ module: this.uriGeneratorName, error: params.error },
			params.message,
		);
		throw new Error(
			`Erro de módulo ${this.uriGeneratorName}: erro detectado ${params.message}`,
		);
	}
}
