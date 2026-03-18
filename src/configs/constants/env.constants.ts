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

export const dbProtocols: readonly string[] = Object.freeze(acceptedDatabaseProtocols);

// hasher constants
export const supportedHashProviders = ['argon2', 'bcrypt'] as const;

// id constants

export const identityTypeSupported = ['uuidv4', 'uuidv7', 'nanoid'] as const;
