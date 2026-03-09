import { env } from '@Configs/env.js';
import { logger } from '@Configs/logger.js';
import app from './app.js';
import MongodbConnect from '@Database/connections/mongodb.database.js';

try {
	await MongodbConnect.connect();
	app.listen(env.PORT, () => {
		// Substituímos console.log pelo logger para manter o padrão de infraestrutura
		logger.info(
			{
				port: env.PORT,
				url: `http://localhost:${env.PORT}`,
				env: env.NODE_ENV,
				hasher: env.HASHER_PROVIDER,
				database: env.DATABASE_TYPE,
			},
			`🚀 Servidor iniciado com sucesso!`,
		);
	});
} catch (e) {
	logger.fatal({ error: `${e}` }, '‼️ Erro ao inciar o servidor');
	process.exit(1);
}
