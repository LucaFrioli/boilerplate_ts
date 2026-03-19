import { createChildLogger, type handlerContractsErrorsParams } from '@Configs/logger.js';
import { env } from '@Configs/env.js';

export interface IConnectDb {
	connect(): Promise<void>;
	disconnect(): Promise<void>;
	isConnected(): boolean;
}

export abstract class BaseConnectDb implements IConnectDb {
	protected abstract get connectionName(): string;
	protected abstract readonly _uri: string;
	protected connectionStatus: boolean = false;

	protected ConnectionLogger = createChildLogger({
		fileType: 'connection',
		databaseType: env.DATABASE_TYPE,
		service: 'database',
		module: 'databaseConnections',
	});

	abstract connect(): Promise<void>;
	abstract disconnect(): Promise<void>;
	abstract isConnected(): boolean;

	protected logInfo(message: string): void {
		this.ConnectionLogger.info({ module: this.connectionName }, message);
	}

	protected handlerErrors(params: handlerContractsErrorsParams): never {
		this.ConnectionLogger[params.erroLevel](
			{ module: this.connectionName, error: params.error },
			params.message,
		);
		throw new Error(`Erro de módulo ${this.connectionName}: erro detectado ${params.message}`);
	}
}
