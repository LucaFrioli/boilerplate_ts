import { resolve } from 'path';
import pino, { type Logger } from 'pino';

const rootDir = process.cwd();
const logFileName = `${new Date().toISOString().substring(0, 10)}.log`;
const logsFilesPath = resolve(rootDir, 'logs', logFileName);
const currentEnv = process.env.NODE_ENV || 'development';
const currentAppName = process.env.APP_NAME;

export type errorLevels = 'info' | 'warn' | 'error' | 'fatal';

// Definimos as strings permitidas. O TS vai sugerir estas opções automaticamente.
export type FileType =
	| 'validation'
	| 'entity'
	| 'controller'
	| 'model'
	| 'interface'
	| 'util'
	| 'connection'
	| 'uri'
	| 'core'
	| 'type';

export type ServiceType = 'database' | 'hasher' | 'util' | 'valuation' | 'generation' | 'typo';

export type LoggerParams = {
	module: string;
	fileType: FileType;
	service: ServiceType;
} & Record<string, unknown>;

// Criamos uma função helper para gerar o child logger já tipado
export const createChildLogger = (params: LoggerParams): Logger => {
	return logger.child({ ...params });
};

/**
 * **handlerContractsErrorsParams**
 *
 * Esta interface específica permite uqe apenas os parametros necessários que uma
 * implementação de um contrato de classe abtrata precisa enviar para concluir o
 * refinamento dos logs, enquanto já nas classes abstratas em si é onde deverão conter
 * os refinamentos de módúlo, regras de négocio para auditória e afins, o loggger em
 * tendencia tem como ideia ser flexivel e ao mesmo tempo bem informativo, está interface
 * vem como um utilitário pr arefinar logs de handling de erros dentro dos
 * contratos da aplicação
 */
export interface handlerContractsErrorsParams {
	erroLevel: errorLevels;
	error: unknown;
	message: string;
}

const pinoConfigs = {
	level: currentEnv === 'development' ? 'debug' : 'info',
	redact: {
		paths: [
			'password',
			'DATABASE_PASSWORD',
			'user.token',
			'authorization',
			'passwordHash',
			'walletId',
			'cpf',
		],
		placeholder: '******',
	},

	base: {
		env: currentEnv,
		app_name: currentAppName,
	},

	timestamp: pino.stdTimeFunctions.isoTime,
};

// Target para console/desenvolvimento
const consoleTarget: pino.TransportTargetOptions = {
	target: currentEnv === 'development' ? 'pino-pretty' : 'pino/file',
	level: currentEnv === 'development' ? 'debug' : 'info',
	options: currentEnv === 'development' ? { colorize: true } : {},
};

// Target para arquivos de log
const fileTarget: pino.TransportTargetOptions = {
	target: 'pino/file',
	level: 'info',
	options: {
		destination: logsFilesPath,
		mkdir: true,
	},
};

// posteriormente quando tivermos a solução dos banco de dados adicionamos eles aqui de forma inteligente e adaptável

const transport = pino.transport({
	targets: [consoleTarget, fileTarget],
});

export const logger = pino(pinoConfigs, transport);
