import { dbProtocols } from '@Configs/constants/env.constants.js';
import { createChildLogger } from '@Configs/logger.js';
import type { Brand } from './brand.type.js';

const securityTypesLogger = createChildLogger({
	fileType: 'type',
	module: 'securityTypes',
	service: 'typo',
});

/**
 * String que já passou pelo processo de Hashing.
 * Garante que dados sensíveis não circulem em texto puro.
 */
export type HashedString = Brand<string, 'HashedString'>;

/**
 * String que sejam URIs válidas
 * para validação adicional utilize a função
 * **isValidUri**
 */
export type Uri = Brand<string, 'Uri'>;
/**
 * **IsValidUri**
 * Garante que a asscerção de tipo seja válida em run time,
 * garantido que o DX seja consistente com
 * a verdade absoluta em runtime
 */
export function isValidUri(uri: unknown): uri is Uri {
	try {
		if (typeof uri !== 'string')
			throw new Error('Para poder validar uma Uri, o parametro deve ser uma string');
		new URL(uri);
		return true;
	} catch (e) {
		securityTypesLogger.info(
			{ error: e, specificType: 'Uri', rawValue: uri },
			'tentativa de asserção de tipo errônea',
		);
		return false;
	}
}

/**
 * String que representa uma URI de conexão validada e máscarável.
 * Garante que apenas provedores de URI autorizados gerem conexões.
 * Para ter uma asserção de tipagem realmente funcional para este
 * caso deve-se utilizar a função isDatabaseURI
 */
export type DatabaseURI = Brand<string, 'DatabaseURI'>;
export function isDatabaseUri(uri: unknown): uri is DatabaseURI {
	if (!isValidUri(uri) || typeof uri !== 'string') return false;

	const parsedUrl: URL = new URL(uri);
	// remove o : presentes no portocolo, podendo então fazer uma comparação mais limpa com os protocolos aceitos pela apllicação
	const protocol: string = parsedUrl.protocol.replace(':', '');

	return dbProtocols.includes(protocol);
}
