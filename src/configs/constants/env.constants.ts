import { createChildLogger } from '../logger.js';

// default logger to env

export const envLogger = createChildLogger({
	fileType: 'core',
	module: 'env',
	service: 'valuation',
});

// node_env defaults and supported
export const nodeEnvSupported = ['development', 'stage', 'production'] as const;

// loacale and date constants

export const timezoneSupported = ['UTC', 'America/Sao_Paulo', 'Europa/Rome'] as const;
export const localeSupported = ['pt-BR', 'en-US', 'it-IT'] as const;

// database constants
export const enabledDatabaseConections = ['mongodb', 'postgres'] as const;

const acceptedDatabaseProtocols: readonly string[] = [
	'mongodb',
	'mongodb+srv',
	'postgres',
	'postgresql',
];

export const acceptedMongoSrvDomains = [
	'.mongo.net',
	'.mongodb.net',
	/** adicione outros domínios aceitos conforme for necessário, esclar, ou mudar a metodologia */
] as const;

export const dbProtocols: readonly string[] = Object.freeze(acceptedDatabaseProtocols);

// hasher constants
export const supportedHashProviders = ['argon2', 'bcrypt'] as const;

// id constants

export const identityTypeSupported = ['uuidv4', 'uuidv7', 'nanoid'] as const;

export const regexValidationToIdentitySupported = {
	uuidv7: /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
	uuidv4: /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
} as const;
