// database constants

/**
 * Regex: ambiente (3 letras) _ serviço/app (3+ letras) _ permissão (ro|rw|adm) _ id (2 digitos) _ UnameAleatório (6+ letras, números e símbolos urlsafty)
 */
export const dbUsernamePattern =
	/^(prd|stg|dev|tst)_[a-z]{3,}_(ro|rw|adm)_[0-9]{2}_[a-zA-Z0-9\-_.~]{9,}$/;

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

export const acceptedMemDatabaseMultiHostProtocols: readonly string[] = [
	'valkey+sentinel',
	'redis+sentinel',
	'redis-sentinel',
];

export const acceptedMemDatabaseProtocols: readonly string[] = [
	'redis',
	'rediss',
	// Os prefixos valkey e valkeys são future-proofing caso drivers futuros
	// exijam alias nominal explícito, mas operam no mesmo protocolo RESP.
	'valkey',
	'valkeys',
	...acceptedMemDatabaseMultiHostProtocols,
];

export const dbslist = [...enableMemDatabaseConnections, ...enabledDatabaseConections] as const;
export type dbsAcepteds = (typeof dbslist)[number] | 'envBoot';
