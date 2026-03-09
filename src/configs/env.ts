import z from 'zod';
import 'dotenv/config';
import { passwordStrength } from '@Validations/Password.validations.js';
import { createChildLogger } from './logger.js';

// conforme o boilerplate for crescendo adicionarei mais bancos
const envLogger = createChildLogger({ fileType: 'core', module: 'env', service: 'valuation' });
const enabledDatabaseConections = ['mongodb'] as const;
export const supportedHashProviders = ['argon2', 'bcrypt'] as const;
const timezoneSupported = ['UTC', 'America/Sao_Paulo', 'Europa/Rome'] as const;
const localeSupported = ['pt-BR', 'en-US', 'it-IT'] as const;
export const identityTypeSupported = ['uuidv4', 'uuidv7', 'nanoid'] as const;

const envSchema = z.object({
	NODE_ENV: z.enum(['development', 'stage', 'production']).default('development'),
	PORT: z.coerce
		.number()
		.int({ error: 'A porta da aplicação deve ser um número inteiro' })
		.default(3000),
	APP_NAME: z.string({ error: 'lembre-se de adicionar um nome ao app' }).trim().min(3).max(50),
	APP_TIMEZONE: z.enum(timezoneSupported).default('UTC'),
	APP_LOCALE: z.enum(localeSupported).default('pt-BR'),

	// database info
	DATABASE_TYPE: z.enum(enabledDatabaseConections, {
		error: `Ops aparentemente o db desejado ainda não está disponível, utilize algum destes ${enabledDatabaseConections.join(', ')}`,
	}),
	DATABASE_HOST: z.string().trim().default('localhost'),
	DATABASE_PORT: z.coerce
		.number()
		.int({ error: 'A porta de um banco de dados deve ser um número inteiro' }),
	DATABASE_NAME: z.string().trim(),
	DATABASE_USERNAME: z.string().trim().optional(),
	DATABASE_PASSWORD: z
		.string()
		.min(10)
		.max(100)
		.refine(
			(value) => {
				return passwordStrength(value);
			},
			{ error: 'A senha do banco não atende os requisitos de segurança' },
		)
		.optional(),
	DATABASE_ID_DEFAULT: z
		.enum(identityTypeSupported, {
			error: `Defina um padrão de id para os registros do banco contindos nesta lista ${identityTypeSupported.join(',')}`,
		})
		.default('uuidv7'),

	// Contatos de administradores
	EMAIL_TO_CONTACT: z.email(),

	//hasher configs
	HASHER_PROVIDER: z
		.enum(supportedHashProviders, {
			error: `Provedor de hash inválido. Escolha entre: ${supportedHashProviders.join(', ')}`,
		})
		.default('argon2'),
	HASHER_SECURITY_PEPPER: z
		.string()
		.trim()
		.min(20, 'O pepper deve ter ao menos 20 carcteres')
		.default('development-secretPepper_SHA256-F@llback')
		.refine(
			(val) => {
				const testPepper = passwordStrength(val, {
					securityLevel: 'strong',
					personalize: false,
				});
				const isProd = process.env.NODE_ENV === 'production';
				const isFallback = val.includes('F@llback');

				if ((!testPepper || isFallback) && isProd) {
					envLogger.fatal(
						{ currentValue: isFallback ? 'VALOR_PADRAO_DETECTADO' : 'VALOR_INSEGURO' },
						'O HasherPepper não corresponde ao padrão de segurança admitido na aplicação, sugerimos criar um SHA-256',
					);
					process.exit(1);
				}

				return testPepper;
			},
			{
				error: 'O PEPPER de segurança é fraco demais ou está usando o valor padrão de desenvolvimento.',
			},
		),
	HASHER_LENGTH: z.coerce
		.number()
		.int()
		.min(32, {
			error: 'O tamnho do hash para ser realmente seguro deve ser de no mínimo 32 bits',
		})
		.default(32),
	HASHER_SALT_LENGTH: z.coerce
		.number()
		.int()
		.min(16, {
			error: 'O salt_length do hasher deve ter no mínimo 16 bytes de acordo com o padrão RFC 9106',
		})
		.default(16),
	//defina sempre o dobro de cores disponíveis no servidor
	HASHER_PARALLELISM: z.coerce
		.number()
		.int()
		.min(2, 'O Paralelismo deve ser de ao menos 2 trheads')
		.transform((val) => {
			if (val > 16)
				envLogger.warn(
					`HASHER_PARALLELISM alto! ${val} trheads alocadas, verifique o desempenho da aplicação!`,
				);
			return val;
		})
		.default(4),
	HASHER_TIME_COST: z.coerce
		.number()
		.int()
		.min(3, { error: 'Para o padrão de segurança o time cost deve no mínimo ser 3' })
		.default(3),
	HASHER_MEMORY_COST: z.coerce
		.number()
		.int()
		.min(65536, 'O custo de processamento deve ser de no mínimo 64MB (ou seja 65536KiB)')
		.default(65536),

	// Definição identificadores da aplicação
	IDENTIFIER_PATTERN: z
		.enum(identityTypeSupported, {
			error: `Defina um tipode identificador suportado entre estes ${identityTypeSupported.join(', ')}`,
		})
		.default('nanoid'),
	IDENTIFIER_NANOID_ALPHABET: z
		.string()
		.trim()
		.min(32, { error: 'alfabetos menores de 32 são inseguros' })
		.max(64, { error: 'alfabetos com mais de 64 caracteres fogem do URL-safe' })
		.refine(
			(val) => {
				return new Set(val).size === val.length;
			},
			{ error: 'O alfabeto não pode conter caracteres iguas, duplicatas reduzem a entropia' },
		)
		.refine((val) => /^[A-Za-z0-9\-_]+$/.test(val), {
			error: 'O alfabeto deve conter apenas caracteres URL safe',
		})
		.default('ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_'),
	IDENTIFIER_NANOID_SIZE: z.coerce
		.number()
		.int()
		.min(16, { error: 'Mínimo 16 chars para entropia adequada' })
		.max(32, {
			error: 'Acima de 32 chars o ganho entrópico é desnecessário para IDs de aplicação',
		})
		.default(21),
});

const _env = envSchema.safeParse(process.env);

if (!_env.success) {
	const { fieldErrors } = _env.error.flatten();
	console.error('‼️ ‼️ Erro grave na configuração de ambiente ‼️ ‼️');
	console.table(fieldErrors);

	throw new Error('Varivais de ambiente inválidas, edite o .env tente iniciar a api novamente!');
}

export const env = _env.data;
