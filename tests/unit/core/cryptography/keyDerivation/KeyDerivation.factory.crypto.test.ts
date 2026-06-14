/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/explicit-function-return-type */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { KeyDerivationFactory } from '@Crypto/keyDerivation/KeyDerivation.factory.crypto.js';
import HKDFProvider from '@Crypto/keyDerivation/provider/Hkdf.provider.crypto.js';

// Setup environment and logger mocks
const { mockFatal, mockError, mockInfo, mockEnv } = vi.hoisted(() => ({
	mockFatal: vi.fn(),
	mockError: vi.fn(),
	mockInfo: vi.fn(),
	mockEnv: {
		NODE_ENV: 'test',
		CRIPTOGRAPHY_PASSWORDS_DIGESTOR: 'sha256',
		CRIPTOGRAPHY_DERIVATION_KEY_ALGORITHM: 'hkdf',
		CRIPTOGRAPHY_DERIVATION_KEY_SALT: 32,
		CRIPTOGRAPHY_ENGINE_MODE: 'sync_node',
	},
}));

vi.mock('@Configs/logger.js', () => ({
	createChildLogger: () => ({
		fatal: mockFatal,
		error: mockError,
		info: mockInfo,
		debug: mockInfo,
	}),
}));

vi.mock('@Configs/env.js', () => ({
	env: mockEnv,
}));

describe('Core / Cryptography / KeyDerivationFactory', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		// Reset Singleton instance before each test
		(KeyDerivationFactory as any).instance = undefined;
	});

	it('deve retornar o provedor HKDFProvider quando configurado no env', () => {
		mockEnv.CRIPTOGRAPHY_DERIVATION_KEY_ALGORITHM = 'hkdf';

		const provider = KeyDerivationFactory.getProvider();

		expect(provider).toBeInstanceOf(HKDFProvider);
	});

	it('deve retornar a mesma instância (Singleton) nas chamadas subsequentes', () => {
		mockEnv.CRIPTOGRAPHY_DERIVATION_KEY_ALGORITHM = 'hkdf';

		const provider1 = KeyDerivationFactory.getProvider();
		const provider2 = KeyDerivationFactory.getProvider();

		expect(provider1).toBe(provider2);
	});

	it('deve validar que a exportação estática KeyDerivation possui a função derive e deriva chaves com sucesso', async () => {
		const { KeyDerivation } = await import('@Crypto/keyDerivation/KeyDerivation.factory.crypto.js');
		expect(KeyDerivation).toBeDefined();
		expect(KeyDerivation.derive).toBeTypeOf('function');

		const mockMasterKey = '0000000000000000000000000000000000000000000000000000000000000000';
		const result = await KeyDerivation.derive(mockMasterKey, 'hasher:test:context', 32);
		expect(result).toBeDefined();
		expect(result).toBeTypeOf('string');
	});
});
