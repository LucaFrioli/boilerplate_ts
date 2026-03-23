import { regexValidationToIdentitySupported } from '@/configs/constants/env.constants.js';
import { env } from '@/configs/env.js';
import { createChildLogger } from '@Configs/logger.js';
import { type Brand } from '@Types/brand.type.js';

const idTypesLogger = createChildLogger({
	fileType: 'type',
	module: 'identityTypes',
	service: 'typo',
});

export const NanoIDRegex = new RegExp(
	`^[${env.IDENTIFIER_NANOID_ALPHABET}]{${String(env.IDENTIFIER_NANOID_SIZE)}}$`,
);

function isID(rawId: unknown, typeOfId: unknown, envId: unknown): boolean {

	if (typeof typeOfId !== 'string' || typeof envId !== 'string') {
		idTypesLogger.fatal('Erro crítico no módulo de tipo, reverifique a construção dos validadores de tipo.');
		throw new Error('Erro fatal dentro do módulo identityTypes, verifique o validador de tipagem. E verifique')
	}

	if (typeof rawId !== 'string') {
		idTypesLogger.warn(
			{ value: rawId, typeofValue: typeof rawId, brandOfID: typeOfId },
			'o id passado para ser validado não é uma string.',
		);
		return false;
	}

	switch (envId) {
		case 'nanoid':
			return NanoIDRegex.test(rawId);
		case 'uuidv4':
			return regexValidationToIdentitySupported.uuidv4.test(rawId);
		case 'uuidv7':
			return regexValidationToIdentitySupported.uuidv7.test(rawId);
		default:
			idTypesLogger.warn({ value: rawId, typeofValue: typeof rawId, brandOfID: typeOfId }, 'O id é inválido');
			return false;
	}
}

/**
 * ID de Aplicação (Público/URL)
 * Geralmente um NanoID para ser amigável e curto.
 * Utilize isAppID para validar ou assertAppId para ser mais rígido
 */
export type AppID = Brand<string, 'AppID'>;

export function isAppID(rawId: unknown): rawId is AppID {
	return isID(rawId, 'AppID', env.IDENTIFIER_PATTERN);
}

/**
 * ID de Banco de Dados (Interno/Indexação)
 * Geralmente um UUIDv7 para performance e ordenação.
 */
export type DatabaseID = Brand<string, 'DatabaseID'>;

export function isDatabaseID(rawId: unknown): rawId is DatabaseID {
	return isID(rawId, 'DatabaseID', env.DATABASE_ID_DEFAULT);
}
