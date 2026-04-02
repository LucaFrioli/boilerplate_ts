import z from 'zod';
import {
	acceptedMemDatabaseProtocols,
	enableMemDatabaseConnections,
	envLogger,
} from '@Configs/constants/env.constants.js';
import { passwordStrength } from '@Validations/Password.validations.js';

export const memEnvValidationSchema = z.object({
	MEM_DB_TYPE: z
		.enum(enableMemDatabaseConnections, {
			error: `MEM_DB_TYPE só aceita os seguintes campos ${enableMemDatabaseConnections.join(', ')}`,
		})
		.optional(),
	// Aqui a dicionei o default sendo valkey, pois acredito fortemente nesta modalidade de banco de dados como o futuro para a tecnologia, evitando questões com erros nominais
	MEM_DB_PROTOCOL: z
		.enum(acceptedMemDatabaseProtocols, {
			error: `Os protocolos aceitos até o momento são somente ${acceptedMemDatabaseProtocols.join(', ')}`,
		})
		.default('valkey'),
	MEM_DB_HOST: z.string().default('localhost'),
	MEM_DB_PORT: z.coerce.number().int().default(6379),
	MEM_DB_USERNAME: z
		.string({ error: 'O username deve ser obrigatóriamente uma sstring' })
		.optional(),
	MEM_DB_PASSWORD: z
		.string()
		.min(10, {
			error: ' A senha do banco de dados em memória deve pelo menos ter 10 cracteres',
		})
		.max(120, {
			error: ' a senhan do banco de dados em meemória não pode exceder 120 caracteres',
		})
		.refine(
			(val) => {
				if (process.env.NODE_ENV === 'development') {
					return passwordStrength(val);
				}

				if (val.length < 15) {
					envLogger.fatal({ length: val.length }, 'A senha do banco de dados em produção deve ser configurada com ao menos 15 caracters');
					return false;
				}
				return passwordStrength(val, { securityLevel: 'strong', personalize: false });
			},
			{
				error: ' A senha para o banco em memória não corresponnde ao padrão recomendado para segurnaça da aplicação',
			},
		)
		.optional(),
	MEM_DB_INDEX_OR_PATH: z.union([z.coerce.number().int().min(0), z.string()]).default(0),
});
