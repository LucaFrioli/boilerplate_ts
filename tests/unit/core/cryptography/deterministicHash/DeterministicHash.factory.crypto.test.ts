/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/explicit-function-return-type */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DeterministicHashFactory } from '@Crypto/deterministicHash/DeterministicHash.factory.crypto.js';
import { DeterministicHahserBase } from '@Crypto/contracts/DeterministicHasher.contract.js'
import HMAC from '@Crypto/deterministicHash/providers/Hmac.provider.crypto.js';

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
	const { baseTestEnv } = await import('@Mocks/test.fixtures.js')
	return ({
		env: { ...baseTestEnv },
	})
});


describe('Core / Cryptography / DeterministicHashFactory', () => {
	beforeEach(() => {

		vi.clearAllMocks();
		// Reset Singleton instance before each test
		(DeterministicHashFactory as any).instance = undefined;
		(DeterministicHahserBase as any)._baseEnv = undefined;
	});

	it('deve retornar o provedor HMAC quando configurado no env', async () => {
		const { baseTestEnv } = await import('@Mocks/test.fixtures.js');
		(DeterministicHahserBase as any)._baseEnv = {
			...baseTestEnv,
			CRIPTOGRAPHY_PASSWORDS_ALGORITHM: 'hmac'
		}

		const provider = DeterministicHashFactory.getProvider();

		expect(provider).toBeInstanceOf(HMAC);
	});

	it('deve retornar a mesma instância (Singleton) nas chamadas subsequentes', async () => {

		const { baseTestEnv } = await import('@Mocks/test.fixtures.js');
		(DeterministicHahserBase as any)._baseEnv = {
			...baseTestEnv,
			CRIPTOGRAPHY_PASSWORDS_ALGORITHM: 'hmac'
		}


		const provider1 = DeterministicHashFactory.getProvider();
		const provider2 = DeterministicHashFactory.getProvider();

		expect(provider1).toBe(provider2);
	});

	it('deve validar que a exportação estática DeterministicHash expõe a função hash', async () => {
		const { DeterministicHash } = await import('@Crypto/deterministicHash/DeterministicHash.factory.crypto.js');
		expect(DeterministicHash).toBeDefined();
		expect(DeterministicHash.hash).toBeTypeOf('function');
	});
});
