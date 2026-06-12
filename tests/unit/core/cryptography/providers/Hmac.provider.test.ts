/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/explicit-function-return-type */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import HMAC  from '@Crypto/deterministicHash/providers/Hmac.provider.crypto.js';
import { validCryptographyKeys } from '@Mocks/test.fixtures.js';

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

describe('Core / Cryptography / Providers / HMAC', () => {
	let hmacProvider: HMAC;

	beforeEach(() => {
		vi.clearAllMocks();
		hmacProvider = new HMAC();

		mockEnv.NODE_ENV = 'test';
		mockEnv.CRIPTOGRAPHY_PASSWORDS_DIGESTOR = 'sha256';
		mockEnv.CRIPTOGRAPHY_PASSWORDS_ALGORITHM = 'hmac';
		mockEnv.CRIPTOGRAPHY_SECURITY_PEPPER = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
		mockEnv.CRIPTOGRAPHY_ENGINE_MODE = 'sync_node';
	});

	it('deve retornar o nome correto do provedor', () => {
		expect((hmacProvider as any).proviederName).toBe('HMAC');
	});

	describe('hashSync() via hash()', () => {
		it('deve gerar hash HMAC válido em modo sync_node e corresponder ao padrão do Node.js createHmac', async () => {
			const plaintext = 'hello_world';
			const pepper = validCryptographyKeys.hex;

			const result = await hmacProvider.hash(plaintext, pepper);

			// Gera de forma independente usando node:crypto
			const crypto = await import('node:crypto');
			const expected = crypto.createHmac('sha256', pepper).update(plaintext, 'utf-8').digest('hex');

			expect(result).toBe(expected);
			expect(mockFatal).not.toHaveBeenCalled();
		});

		it('deve falhar e lançar erro fatal se _baseEnv for indefinido durante a execução (Dead-Code safety)', () => {
			// Simulamos o bypass de validatedEnvValues
			vi.spyOn(hmacProvider as any, 'validatedEnvValues').mockImplementation(() => {});
			(hmacProvider as any)._baseEnv = undefined;

			// Como hashSync chama validatedEnvValues e verifica se é undefined:
			expect(() => (hmacProvider as any).hashSync('plaintext', 'pepper')).toThrow(
				/Erro na definição de variaveis de ambientes durante execução/
			);
			expect(mockFatal).toHaveBeenCalled();
		});
	});

	describe('hashInEdge() via hash()', () => {
		it('deve gerar hash HMAC válido em modo async_web_api e corresponder ao padrão WebCrypto subtle', async () => {
			mockEnv.CRIPTOGRAPHY_ENGINE_MODE = 'async_web_api';
			const plaintext = 'hello_world';
			const pepper = validCryptographyKeys.hex;

			const result = await hmacProvider.hash(plaintext, pepper);

			// Deve corresponder exatamente ao resultado do hashSync para a mesma chave/input
			mockEnv.CRIPTOGRAPHY_ENGINE_MODE = 'sync_node';
			const syncProvider = new HMAC();
			const expectedSync = await syncProvider.hash(plaintext, pepper);

			expect(result).toBe(expectedSync);
			expect(mockFatal).not.toHaveBeenCalled();
		});

		it('deve falhar e lançar erro se o pepper for inválido em modo async_web_api', async () => {
			mockEnv.CRIPTOGRAPHY_ENGINE_MODE = 'async_web_api';
			const plaintext = 'hello_world';
			const invalidPepper = 'curto';

			await expect(hmacProvider.hash(plaintext, invalidPepper)).rejects.toThrow();
			expect(mockFatal).toHaveBeenCalled();
		});
	});
});
