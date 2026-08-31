/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-confusing-void-expression */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/explicit-function-return-type */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import HKDFProvider from '@Crypto/keyDerivation/provider/Hkdf.provider.crypto.js';
import { env } from '@Configs/env.js';
import { baseTestEnv, validCryptographyKeys } from '@Mocks/test.fixtures.js';
import resetsCache from '@Mocks/test.resets.js';

// Setup environment and logger mocks
const { mockFatal, mockError, mockInfo } = vi.hoisted(() => ({
	mockFatal: vi.fn(),
	mockError: vi.fn(),
	mockInfo: vi.fn(),
}));

vi.mock('@Configs/logger.js', () => ({
	createChildLogger: () => ({
		fatal: mockFatal,
		error: mockError,
		info: mockInfo,
		debug: mockInfo,
	}),
}));

vi.mock('@Configs/env.js', async () => {
	const { baseTestEnv } = await import('@Mocks/test.fixtures.js');
	return {
		env: { ...baseTestEnv },
	};
});

// Global toggle for mock implementation of assertsDerivedKey
let shouldMockAssertsDerivedKeyThrow = false;

vi.mock('@Types', async (importOriginal) => {
	const actual = await importOriginal<typeof import('@Types')>();
	return {
		...actual,
		assertsDerivedKey: vi.fn((key: string, len: number) => {
			if (shouldMockAssertsDerivedKeyThrow) {
				throw new Error('Chave inválida mockada');
			}
			return actual.assertsDerivedKey(key, len);
		}),
	};
});

describe('Core / Cryptography / Providers / HKDFProvider', () => {
	let hkdfProvider: HKDFProvider;

	beforeEach(() => {
		vi.clearAllMocks();

		resetsCache();
		Object.assign(env, baseTestEnv);

		shouldMockAssertsDerivedKeyThrow = false;
		hkdfProvider = new HKDFProvider();
	});

	it('deve retornar o nome correto do provedor', () => {
		expect((hkdfProvider as any).providerName).toBe('HKDF');
	});

	describe('deriveSync() via derive()', () => {
		it('deve derivar chave com sucesso em modo sync_node', async () => {
			const masterKey = validCryptographyKeys.hex;
			const contextInfo = 'test-context';
			const outputLength = 32;

			const result = await hkdfProvider.derive(masterKey, contextInfo, outputLength);

			expect(result).toBeDefined();
			expect(result.length).toBe(outputLength * 2); // hex representation is 2x length
			expect(mockFatal).not.toHaveBeenCalled();
		});

		it('deve capturar erro e chamar handlerErrors se a validação do tamanho falhar no deriveSync', async () => {
			const masterKey = validCryptographyKeys.hex;
			const contextInfo = 'test-context';

			shouldMockAssertsDerivedKeyThrow = true;

			await expect(hkdfProvider.derive(masterKey, contextInfo, 32)).rejects.toThrow();
			expect(mockFatal).toHaveBeenCalled();
		});
	});

	describe('deriveInEdge() via derive()', () => {
		it('deve derivar chave com sucesso em modo async_web_api', async () => {
			env.CRIPTOGRAPHY_ENGINE_MODE = 'async_web_api';
			const masterKey = validCryptographyKeys.hex;
			const contextInfo = 'test-context';
			const outputLength = 32;

			const result = await hkdfProvider.derive(masterKey, contextInfo, outputLength);

			// Deve ser igual ao deriveSync para a mesma entrada
			env.CRIPTOGRAPHY_ENGINE_MODE = 'sync_node';
			const syncProvider = new HKDFProvider();
			const expectedSync = await syncProvider.derive(masterKey, contextInfo, outputLength);

			expect(result).toBe(expectedSync);
			expect(mockFatal).not.toHaveBeenCalled();
		});

		it('deve usar salt vazio se salt for zero/indefinido', async () => {
			const masterKey = validCryptographyKeys.hex;
			const contextInfo = 'test-context';
			const outputLength = 32;

			// Bypass env validation and set salt to 0
			(hkdfProvider as any)._baseEnv = {
				...baseTestEnv,
				CRIPTOGRAPHY_DERIVATION_KEY_SALT: 0,
			};

			const result = await hkdfProvider.derive(masterKey, contextInfo, outputLength);
			expect(result).toBeDefined();
		});

		it('deve usar digestor padrao sha256 se CRIPTOGRAPHY_PASSWORDS_DIGESTOR nao for fornecido', async () => {
			const masterKey = validCryptographyKeys.hex;
			const contextInfo = 'test-context';
			const outputLength = 32;

			// Bypass env validation and set digestor to undefined/falsy
			(hkdfProvider as any)._baseEnv = {
				...baseTestEnv,
				CRIPTOGRAPHY_PASSWORDS_DIGESTOR: undefined as any,
			};

			const result = await hkdfProvider.derive(masterKey, contextInfo, outputLength);
			expect(result).toBeDefined();
		});

		it('deve usar salt vazio se salt for zero/indefinido em modo async_web_api', async () => {
			const masterKey = validCryptographyKeys.hex;
			const contextInfo = 'test-context';
			const outputLength = 32;

			// Bypass env validation and set salt to 0
			(hkdfProvider as any)._baseEnv = {
				NODE_ENV: 'test',
				CRIPTOGRAPHY_PASSWORDS_DIGESTOR: 'sha256',
				CRIPTOGRAPHY_DERIVATION_KEY_ALGORITHM: 'hkdf',
				CRIPTOGRAPHY_DERIVATION_KEY_SALT: 0,
				CRIPTOGRAPHY_ENGINE_MODE: 'async_web_api',
			};

			const result = await hkdfProvider.derive(masterKey, contextInfo, outputLength);
			expect(result).toBeDefined();
		});

		it('deve capturar erro e chamar handlerErrors se a validação do tamanho falhar no deriveInEdge', async () => {
			env.CRIPTOGRAPHY_ENGINE_MODE = 'async_web_api';
			const masterKey = validCryptographyKeys.hex;
			const contextInfo = 'test-context';

			shouldMockAssertsDerivedKeyThrow = true;

			await expect(hkdfProvider.derive(masterKey, contextInfo, 32)).rejects.toThrow();
			expect(mockFatal).toHaveBeenCalled();
		});
	});
});
