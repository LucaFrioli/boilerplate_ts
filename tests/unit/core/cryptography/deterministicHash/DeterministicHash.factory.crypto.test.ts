/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/explicit-function-return-type */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DeterministicHashFactory } from '@Crypto/deterministicHash/DeterministicHash.factory.crypto.js';
import HMAC from '@Crypto/deterministicHash/providers/Hmac.provider.crypto.js';

// Setup environment and logger mocks
const { mockFatal, mockError, mockInfo, mockEnv } = vi.hoisted(() => ({
	mockFatal: vi.fn(),
	mockError: vi.fn(),
	mockInfo: vi.fn(),
	mockEnv: {
		NODE_ENV: 'test',
		CRIPTOGRAPHY_PASSWORDS_DIGESTOR: 'sha256',
		CRIPTOGRAPHY_PASSWORDS_ALGORITHM: 'hmac',
		CRIPTOGRAPHY_SECURITY_PEPPER: '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef',
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

describe('Core / Cryptography / DeterministicHashFactory', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		// Reset Singleton instance before each test
		(DeterministicHashFactory as any).instance = undefined;
	});

	it('deve retornar o provedor HMAC quando configurado no env', () => {
		mockEnv.CRIPTOGRAPHY_PASSWORDS_ALGORITHM = 'hmac';

		const provider = DeterministicHashFactory.getProvider();

		expect(provider).toBeInstanceOf(HMAC);
	});

	it('deve retornar a mesma instância (Singleton) nas chamadas subsequentes', () => {
		mockEnv.CRIPTOGRAPHY_PASSWORDS_ALGORITHM = 'hmac';

		const provider1 = DeterministicHashFactory.getProvider();
		const provider2 = DeterministicHashFactory.getProvider();

		expect(provider1).toBe(provider2);
	});

	it('deve validar que a exportação estática DeterministicHash é um hasher instanciado', async () => {
		const { DeterministicHash } = await import('@Crypto/deterministicHash/DeterministicHash.factory.crypto.js');
		expect(DeterministicHash).toBeDefined();
		expect(DeterministicHash).toBeInstanceOf(HMAC);
	});
});
