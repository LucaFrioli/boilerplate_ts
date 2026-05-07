import mongoose from 'mongoose';
import { mongoURI } from '../uri/mongodb.uri.js';
import { env } from '@Configs/env.js';
import { BaseConnectDb } from './contracts/BaseConnect.contract.js';
import type { DatabaseURI } from '@Types';

class MongodbConnect extends BaseConnectDb {
	protected get connectionName(): string {
		return 'MongoConnect';
	}
	protected _uri: DatabaseURI = mongoURI;

	public async connect(): Promise<void> {
		if (env.DATABASE_TYPE !== 'mongodb') {
			this.handlerErrors({
				erroLevel: 'fatal',
				method: 'connect',
				error: 'Tentativa de conexão em mongo db sem credenciais ou tipo definido em env',
				message: 'Erro no tipo de banco da env verifique se DATABSE_TYPE é mongodb',
			});
		}

		try {
			await mongoose.connect(this._uri);
			this.logInfo('Conexão realizada com sucesso');
			this.connectionStatus = true;
		} catch (e) {
			this.connectionStatus = false;
			this.handlerErrors({
				erroLevel: 'fatal',
				method: 'connect',
				error: e,
				message: 'Falha na conexão do banco!',
			});
		}
	}

	public async disconnect(): Promise<void> {
		try {
			await mongoose.disconnect();
			this.connectionStatus = false;
			this.logInfo('Conexão encerrada com sucesso!');
		} catch (e) {
			this.handlerErrors({
				erroLevel: 'fatal',
				method: 'disconnect',
				error: e,
				message: 'Falha ao realizar a desconexão com o banco de dados',
			});
		}
	}

	public isConnected(): boolean {
		return mongoose.connection.readyState === mongoose.ConnectionStates.connected;
	}
}

export default MongodbConnect;
