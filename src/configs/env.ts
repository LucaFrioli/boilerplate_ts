import z from 'zod';
import 'dotenv/config';
import { dbEnvValidationSchema } from './schemas/dbEnv.schema.js';
import { idEnvValidationsSchema } from './schemas/idEnv.schema.js';
import { hasherEnvValidationSchema } from './schemas/hasherEnv.schema.js';
import { memEnvValidationSchema } from './schemas/memDbEnv.schema.js';
import {
	nodeEnvSupported,
	timezoneSupported,
	localeSupported,
	envLogger,
} from './constants/env.constants.js';

// conforme o boilerplate for crescendo adicionarei mais bancos

const envSchema = z.object({
	NODE_ENV: z.enum(nodeEnvSupported).default('development'),
	PORT: z.coerce
		.number()
		.int({ error: 'A porta da aplicação deve ser um número inteiro' })
		.default(3000),
	APP_NAME: z.string({ error: 'lembre-se de adicionar um nome ao app' }).trim().min(3).max(50),
	APP_TIMEZONE: z.enum(timezoneSupported).default('UTC'),
	APP_LOCALE: z.enum(localeSupported).default('pt-BR'),

	// Contatos de administradores
	EMAIL_TO_CONTACT: z.email(),

	// database keys validations
	...dbEnvValidationSchema.shape,

	//hasher configs
	...hasherEnvValidationSchema.shape,

	// Definição identificadores da aplicação
	...idEnvValidationsSchema.shape,

	...memEnvValidationSchema.shape
});

const _env = envSchema.safeParse(process.env);

if (!_env.success) {
	const fieldErrors = z.treeifyError(_env.error);
	console.error('‼️ ‼️ Erro grave na configuração de ambiente ‼️ ‼️');
	console.dir(fieldErrors, { depth: null, colors: true });

	envLogger.fatal(
		{ e: fieldErrors },
		'Erro fatal da aplicação, faça a correção para poder inicar a aplicação',
	);
	process.exit(1);
}

export const env = _env.data;
