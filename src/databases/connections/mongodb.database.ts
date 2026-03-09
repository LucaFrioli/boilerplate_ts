import mongoose from 'mongoose';
import { mongoURI } from '../uri/mongodb.uri.js';
import { createChildLogger } from '@Configs/logger.js';
import { env } from '@Configs/env.js';

class MongodbConnect {
	private static readonly _uri: string = mongoURI;
	private static mongoConnectLogger = createChildLogger({
		module: 'mongodb',
		fileType: 'connection',
		service: 'database',
		databaseType: env.DATABASE_TYPE,
	});

	public static async connect() {
		if (env.DATABASE_TYPE !== 'mongodb') {
			this.mongoConnectLogger.fatal(
				'Erro no tipo de banco da env caso queira utilizar conexão mongo altere a env',
			);
			throw new Error('Erro no tipo de banco da env caso queira utilizar conexão mongo altere a env');

		}

		try {
			await mongoose.connect(this._uri);
			this.mongoConnectLogger.info('Conexão realizada com sucesso');
		} catch (e) {
			this.mongoConnectLogger.fatal({ error: e }, 'Falha na conexão do banco!');
			throw new Error('Erro de conexão com o banco de dados mongo: ' + e);
		}
	}
}

export default MongodbConnect;
