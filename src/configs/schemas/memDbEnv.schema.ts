import z from 'zod';
import {
	acceptedMemDatabaseProtocols,
	enableMemDatabaseConnections,
	envLogger,
} from '@Configs/constants/env.constants.js';
import { DatabaseUsernameValidator } from '@Validations/DatabaseUsername.validation.js';
import { DatabasePasswordValidation } from '@/validations/DatabasePassword.validation.js';

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
		.string({ error: 'O username deve ser obrigatóriamente uma string' })
		.optional()
		.refine(
			(val) => {
				if (!val) return true;
				if (process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test')
					return true;
				return DatabaseUsernameValidator.verifyUsername(val, 'envBoot');
			},
			{ error: 'O Username não corresponde a um usuário com formatação de segurança!' },
		),
	MEM_DB_PASSWORD: z
		.string()
		.min(10, {
			error: ' A senha do banco de dados em memória deve pelo menos ter 10 cracteres',
		})
		.max(120, {
			error: 'A senha do banco de dados em memória não pode exceder 120 caracteres',
		})
		.refine(
			(val) => {
				return DatabasePasswordValidation.isValid(val, envLogger);
			},
			{
				error: 'A senha para o banco em memória não corresponnde ao padrão recomendado para segurnaça da aplicação',
			},
		)
		.optional(),
	MEM_DB_INDEX_OR_PATH: z.union([z.coerce.number().int().min(0), z.string()]).default(0),
	MEM_DB_SENTINEL_MASTER_ID: z.coerce.string().optional().default(''),
	MEM_DB_SENTINEL_USERNAME: z.coerce.string({ error: 'O SentinelUsername deve ser uma string' }).optional()
		.refine(
			(val) => {
				if (!val) return true;
				if (process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test')
					return true;
				return DatabaseUsernameValidator.verifyUsername(val, 'envBoot');
			},
			{ error: 'O SentinelUsername não corresponde a um usuário com formatação de segurança!' },
		).default(''),
	MEM_DB_SENTINEL_PASSWORD: z.string()
		.min(10, {
			error: ' A senha do banco de dados em memória deve pelo menos ter 10 cracteres',
		})
		.max(120, {
			error: 'A senha do banco de dados em memória não pode exceder 120 caracteres',
		})
		.refine(
			(val) => {
				return DatabasePasswordValidation.isValid(val, envLogger);
			},
			{
				error: 'A senha para o banco em memória não corresponnde ao padrão recomendado para segurnaça da aplicação',
			},
		)
		.optional()
}).superRefine((data, ctx) => {
	const isRigorousEnv = process.env.NODE_ENV !== 'development' && process.env.NODE_ENV !== 'test';

	if (isRigorousEnv) {
		if (!data.MEM_DB_USERNAME) {
			ctx.addIssue({
				code: 'custom',
				message: 'O MEM_DB_USERNAME é obrigatório em ambiente de Produção ou Stage!',
				path: ['MEM_DB_USERNAME'],
			});
		}
		if (!data.MEM_DB_PASSWORD) {
			ctx.addIssue({
				code: 'custom',
				message: 'O MEM_DB_PASSWORD é obrigatório em ambiente de Produção ou Stage!',
				path: ['MEM_DB_PASSWORD'],
			});
		}

		if (data.MEM_DB_SENTINEL_MASTER_ID) {
			if (!data.MEM_DB_SENTINEL_USERNAME) {
				ctx.addIssue({
					code: 'custom',
					message: 'O MEM_DB_SENTINEL_USERNAME é obrigatório se o Sentinel estiver ativo em Produção ou Stage!',
					path: ['MEM_DB_SENTINEL_USERNAME'],
				});
			}
			if (!data.MEM_DB_SENTINEL_PASSWORD) {
				ctx.addIssue({
					code: 'custom',
					message: 'O MEM_DB_SENTINEL_PASSWORD é obrigatório se o Sentinel estiver ativo em Produção ou Stage!',
					path: ['MEM_DB_SENTINEL_PASSWORD'],
				});
			}
		}
	}
});

