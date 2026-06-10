import {
	dbProtocols,
	regexValidationToHasherProvidersSupported,
	type HashProvidersSupported,
	type dbsAcepteds,
} from '@Configs/Constants';
import { createChildLogger } from '@Configs/logger.js';
import type { Brand } from './brand.type.js';
import { DatabaseUsernameValidator } from '@Validations/DatabaseUsername.validation.js';
import { DatabaseMemoryUriValidation } from '@Validations/DatabaseInMemoryUri.validation.js';
import { CryptographyKeysValidation } from '@Validations/CriptographyKeys.validations.js';
import { EncodingAlphabetsValidations } from '@Validations/EncondingAlphabets.validations.js';

const securityTypesLogger = createChildLogger({
	fileType: 'type',
	module: 'securityTypes',
	service: 'typo',
});

export type ValidCryptoKey = Brand<string, 'ValidCryptoKey'>;
export function isValidCryptoKey(rawValue: unknown): rawValue is ValidCryptoKey {
	const functionName = 'isValidCryptoKey';
	if (typeof rawValue !== 'string') {
		securityTypesLogger.warn(
			{
				functionName,
				typeofRawValue: typeof rawValue,
				rawValueExpected: 'string',
			},
			'Por gentileza a chave de entropia deve ser uma string',
		);
		return false;
	}

	const result = CryptographyKeysValidation.isValid(rawValue);

	if (!result)
		securityTypesLogger.warn(
			{
				functionName,
			},
			'A chave de segurança é inválida, por gentileza crie ou passe uma chave válida;',
		);

	return result;
}

export function assertsValidCryptoKey(rawValue: unknown): asserts rawValue is ValidCryptoKey {
	const functionName = 'assertsValidCryptoKey';
	if (isValidCryptoKey(rawValue)) return;

	securityTypesLogger.error(
		{
			functionName,
		},
		'Erro na validação da chave secreta de criptografia!',
	);

	throw new Error(
		'A chave de seguraÇa é inválida processo abortado, entre em contato com a equipe;',
	);
}

/**
 * String que já passou pelo processo de Hashing.
 * Garante que dados sensíveis não circulem em texto puro.
 */
export type HashedString = Brand<string, 'HashedString'>;
export function isHashedString(
	rawValue: unknown,
	hasherProvider: HashProvidersSupported,
): rawValue is HashedString {
	if (typeof rawValue !== 'string') {
		securityTypesLogger.warn(
			{
				typeofRawValue: typeof rawValue,
				rawValueEntry: rawValue,
			},
			'tentativa de entrada de valor diferente de string',
		);
		return false;
	}

	switch (hasherProvider) {
		case 'argon2':
			return regexValidationToHasherProvidersSupported.argon2.test(rawValue);
		case 'bcrypt':
			return regexValidationToHasherProvidersSupported.bcrypt.test(rawValue);
		default:
			return false;
	}
}

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
		securityTypesLogger.warn(
			{ error: e, specificType: 'Uri', rawValue: uri },
			'tentativa de asserção de tipo errônea',
		);
		return false;
	}
}

/**
 *  **DatabaseUsername**
 *
 *  - Typo que permite uma verificação de integridade sobre o username
 * de banco de dados bem como faz com que ele siga um padrão mínimo
 * de segurança.
 * - Para assegurar typo utilize **`isDatabaseUsername`** para validação simples.
 * - Utilize **`assertDatabaseUsername`** para validação mais rígida
 * - Ao logar por segurança utilize **`maskLogDatabaseUsername`**
 *
 * @see {@link /src/utils/masks.util.ts} - `maskLogDatabaseUsername`
 */
export type DatabaseUsername = Brand<string, 'DatabaseUsername'>;

/**
 * **isDatabaseUri**
 * Validação para garantia de tipagem de uma string em uma **`DatabaseUsername`**
 *
 * Se quiser utilizar um erro padronizado o que é altamente recomendável basta utilizar,
 * a assertion com nome de **`assertsDatabaseUsername`**
 */
export function isDatabaseUsername(
	dbUname: unknown,
	dbName: dbsAcepteds,
): dbUname is DatabaseUsername {
	if (!dbUname || typeof dbUname !== 'string') return false;
	return DatabaseUsernameValidator.verifyUsername(dbUname, dbName);
}

/**
 * **assertsDatabaseUsername**
 *
 * Permite que além de validar o username passado, haja um asserção de tipo,
 * garantindo failfast antes de qualquer tentativa de operação com o username;
 */
export function assertsDatabaseUsername(
	dbUname: unknown,
	dbName: dbsAcepteds,
): asserts dbUname is DatabaseUsername {
	if (isDatabaseUsername(dbUname, dbName)) return;

	securityTypesLogger.fatal(
		{
			assertion: 'assertsDatabaseUsername',
			dbName,
			error: {
				dbUname,
				typeofUname: typeof dbUname,
				expectedUnameMorphology: {
					enviromental: 'prd|stg|dev|tst',
					serviceOrApp: 'string com 3+ characters',
					permissions: 'ro|rw|adm',
					id: 'number com dois caraceres',
					uname: 'adição de entropia com string contendo 9+ characteres com números, letras maísculas/minúsculas, e characters especiais url-safty',
				},
			},
		},
		'O username não apresenta uma morfologia válida! Verifique o fluxo!',
	);
	throw new Error('A morfologia do username foi violada. Execução abortada por segurança.');
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

/**
 * String que representa uma URI de conexão validada para Bancos em Memória.
 * Evita a injeção acidental de um banco relacional onde se espera um Cache/Store.
 */
export type MemDatabaseURI = Brand<string, 'MemDatabaseURI'>;

export function isMemDatabaseUri(uri: unknown, dbName: dbsAcepteds): uri is MemDatabaseURI {
	if (typeof uri !== 'string') return false;
	return DatabaseMemoryUriValidation.verifyUrl(uri, dbName);
}

export function assertsMemDatabaseURI(
	uri: unknown,
	dbName: dbsAcepteds,
): asserts uri is MemDatabaseURI {
	if (isMemDatabaseUri(uri, dbName)) return;
	securityTypesLogger.fatal(
		{
			assertion: 'assertsMemDatabaseURI',
			typeofUri: typeof uri,
			dbName,
		},
		'Tentativa de validação de uri de banco de memória inválida',
	);
	throw new Error('Tentativa de validação de uri de banco de memória inválida');
}

/**
 * **DerivedKey**
 *
 * - Tipo nominal que representa uma chave criptográfica derivada Hexadecimal.
 * - Garante em tempo de compilação que chaves de tamanhos diferentes (ex: 16 bytes vs 32 bytes)
 *   não sejam misturadas, e que strings comuns não sejam passadas por engano.
 * - Parametrizado por `N` que define o comprimento físico da chave original em bytes.
 */
export type DerivedKey<N extends number> = Brand<string, { bytes: N; isDerived: true }>;

/**
 * **isDerivedKey**
 *
 * Type Guard em runtime para atestar a validade de uma chave derivada.
 * Verifica o tipo, o alfabeto hexadecimal e se a string possui o tamanho exato esperado de $2N$ caracteres.
 *
 * @param value O valor arbitrário a ser testado.
 * @param bytes O comprimento físico esperado da chave em bytes.
 */
export function isDerivedKey<N extends number>(value: unknown, bytes: N): value is DerivedKey<N> {
	if (typeof value !== 'string') return false;
	if (EncodingAlphabetsValidations.classifyCryptographyEncodingAlphabet(value) !== 'hex')
		return false;

	const expectedHexLength = bytes * 2;
	if (value.length !== expectedHexLength) return false;

	return /^[0-9a-fA-F]+$/.test(value);
}

/**
 * **assertsDerivedKey**
 *
 * Assertion Function de segurança (Fail-Fast).
 * Lança uma exceção fatal e loga o incidente se o valor testado violar a estrutura DerivedKey.
 *
 * @param value O valor a ser atestado.
 * @param bytes O comprimento físico esperado da chave em bytes.
 */
export function assertsDerivedKey<N extends number>(
	value: unknown,
	bytes: N,
): asserts value is DerivedKey<N> {
	if (isDerivedKey(value, bytes)) return;

	securityTypesLogger.fatal(
		{
			assertion: 'assertsDerivedKey',
			typeofValue: typeof value,
			expectedBytes: bytes,
			expectedHexLength: bytes * 2,
			receivedLength: typeof value === 'string' ? value.length : undefined,
		},
		'A chave criptográfica fornecida não atende aos critérios estritos de estrutura DerivedKey',
	);

	throw new TypeError(
		'A chave criptográfica fornecida não atende aos critérios estritos de estrutura DerivedKey',
	);
}
