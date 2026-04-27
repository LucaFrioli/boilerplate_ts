import { createChildLogger } from '../logger.js';

// default logger to env

export const envLogger = createChildLogger({
	fileType: 'core',
	module: 'env',
	service: 'valuation',
});

// node_env defaults and supported
// 'test' é obrigatório aqui: o Vitest injeta NODE_ENV=test automaticamente em todos os workers.
// Sem este valor, qualquer módulo que importe env.ts falharia na inicialização dos testes.
export const nodeEnvSupported = ['development', 'stage', 'production', 'test'] as const;

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

// domínios para poder criar uris mongo compatíveis com mongoDB em server mode
export const acceptedMongoSrvDomains = [
	'.mongo.net',
	'.mongodb.net',
	/** adicione outros domínios aceitos conforme for necessário, esclar, ou mudar a metodologia */
] as const;

export const dbProtocols: readonly string[] = Object.freeze(acceptedDatabaseProtocols);

export const enableMemDatabaseConnections = ['redis', 'valkey'] as const;

export const acceptedMemDatabaseProtocols: readonly string[] = [
	'redis',
	'rediss',
	// Os prefixos valkey e valkeys são future-proofing caso drivers futuros
	// exijam alias nominal explícito, mas operam no mesmo protocolo RESP.
	'valkey',
	'valkeys',
];

// hasher constants
export const supportedHashProviders = ['argon2', 'bcrypt'] as const;

export const regexValidationToHasherProvidersSupported = {
	/**
	 * PHC String Format para Argon2:
	 * $argon2(i|d|id)$v=<version>$m=<memory>,t=<time>,p=<parallelism>$<salt>$<hash>
	 *
	 * - Variantes: argon2i | argon2d | argon2id
	 * - v=    → versão do algoritmo (normalmente 19)
	 * - m=    → memoryCost  (número inteiro)
	 * - t=    → timeCost    (número inteiro)
	 * - p=    → parallelism (número inteiro)
	 * - salt  → Base64 sem padding
	 * - hash  → Base64 sem padding
	 */
	argon2: /^\$argon2(id|i|d)\$v=\d+\$m=\d+,t=\d+,p=\d+\$[A-Za-z0-9+/]+\$[A-Za-z0-9+/]+$/,
	/**
	 * Formato BCrypt (Modular Crypt Format):
	 * $<version>$<rounds>$<salt(22)><hash(31)>
	 *
	 * - version → 2a | 2b | 2y  (2b é o padrão atual e mais seguro)
	 * - rounds  → 04–31 (custo logarítmico)
	 * - salt    → exatamente 22 chars Base64 BCrypt
	 * - hash    → exatamente 31 chars Base64 BCrypt
	 *
	 * ⚠️ BCrypt usa alfabeto Base64 próprio: ./A-Za-z0-9
	 *    diferente do Base64 padrão que usa +/
	 */
	bcrypt: /^\$2[aby]?\$\d{2}\$[./A-Za-z0-9]{53}$/,
} as const;

// id constants

export const identityTypeSupported = ['uuidv4', 'uuidv7', 'nanoid'] as const;

export const regexValidationToIdentitySupported = {
	uuidv7: /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
	uuidv4: /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
} as const;

// piis

/**
 * String de 11 caracteres numerais
 */
export const cpf_raw_regexp = /^\d{11}$/;
