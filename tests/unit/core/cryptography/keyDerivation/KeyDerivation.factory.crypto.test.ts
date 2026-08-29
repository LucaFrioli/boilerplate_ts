/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/explicit-function-return-type */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { KeyDerivationFactory } from '@Crypto/keyDerivation/KeyDerivation.factory.crypto.js';
import HKDFProvider from '@Crypto/keyDerivation/provider/Hkdf.provider.crypto.js';
import { baseTestEnv } from '@Mocks/test.fixtures.js';
import { env } from '@Configs/env.js';
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

describe('Core / Cryptography / KeyDerivationFactory', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		resetsCache(['KeyDerivatorBase']);
		Object.assign(env, baseTestEnv);
		(KeyDerivationFactory as any).instance = undefined;
	});

	it('deve retornar o provedor HKDFProvider quando configurado no env', () => {
		env.CRIPTOGRAPHY_DERIVATION_KEY_ALGORITHM = 'hkdf';

		const provider = KeyDerivationFactory.getProvider();

		expect(provider).toBeInstanceOf(HKDFProvider);
	});

	it('deve retornar a mesma instância (Singleton) nas chamadas subsequentes', () => {
		env.CRIPTOGRAPHY_DERIVATION_KEY_ALGORITHM = 'hkdf';

		const provider1 = KeyDerivationFactory.getProvider();
		const provider2 = KeyDerivationFactory.getProvider();

		expect(provider1).toBe(provider2);
	});

	it('deve validar que a exportação estática KeyDerivation possui a função derive e deriva chaves com sucesso', async () => {
		const { KeyDerivation } =
			await import('@Crypto/keyDerivation/KeyDerivation.factory.crypto.js');
		expect(KeyDerivation).toBeDefined();
		expect(KeyDerivation.derive).toBeTypeOf('function');

		const mockMasterKey = '0000000000000000000000000000000000000000000000000000000000000000';
		const result = await KeyDerivation.derive(mockMasterKey, 'hasher:test:context', 32);
		expect(result).toBeDefined();
		expect(result).toBeTypeOf('string');
	});
});
