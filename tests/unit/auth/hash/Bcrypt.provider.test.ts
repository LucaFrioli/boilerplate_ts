/**
 * @fileoverview Testes do BcryptService — Motor de Hashing Legado/Compatível.
 *
 * ## O que testamos (Fase 3)
 * ✅ Custo logarítmico (Rounds): 10 (mínimo), 13 (aviso), <10 (erro).
 * ✅ Pepper Suffix: Garantir que o segredo é concatenado.
 * ✅ Validação de Formato: Modular Crypt Format.
 *
 * @see {@link src/auth/hash/providers/Bcrypt.service.auth.ts}
 */
import { vi, describe, it, expect, beforeEach } from 'vitest';

// Mock do env e de funções de log usando vi.hoisted para evitar erros de inicialização
const { mockWarn, mockEnv } = vi.hoisted(() => ({
	mockWarn: vi.fn(),
	mockEnv: {
		HASHER_PROVIDER: 'bcrypt',
		HASHER_SECURITY_PEPPER: 'test-pepper-bcrypt-suffix',
		HASHER_SALT_LENGTH: 10, // Default seguro
		EMAIL_TO_CONTACT: 'admin@test.com',
	},
}));

vi.mock('@Configs/logger.js', () => ({
	createChildLogger: (): { fatal: unknown; warn: unknown; error: unknown; info: unknown } => ({
		fatal: vi.fn(),
		warn: mockWarn,
		error: vi.fn(),
		info: vi.fn(),
	}),
}));

vi.mock('@Configs/env.js', () => ({
	env: mockEnv,
}));

import BcryptService from '@Hash/providers/Bcrypt.service.auth.js';

describe('BcryptService', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockEnv.HASHER_SALT_LENGTH = 10; // Reset para cada teste
	});

	describe('generate()', () => {
		it('deve gerar um hash Bcrypt válido', async () => {
			const provider = new BcryptService();
			const hash = await provider.generate('senha123');

			// Formato Bcrypt: $2b$10$...
			expect(hash).toMatch(/^\$2b\$10\$/);
		});

		it('deve falhar se rounds < 10 (Fail-Fast)', async () => {
			mockEnv.HASHER_SALT_LENGTH = 8;
			const provider = new BcryptService();

			await expect(provider.generate('senha123')).rejects.toThrow(
				'Erro interno crítico, contate algum administrador',
			);
		});

		it('deve emitir aviso se rounds > 13 (Performance)', async () => {
			mockEnv.HASHER_SALT_LENGTH = 14;
			const provider = new BcryptService();

			await provider.generate('senha123');

			expect(mockWarn).toHaveBeenCalledWith(
				expect.anything(),
				expect.stringContaining('acima de 12 rounds pode-se haver probelmas e performace'),
			);
		});
	});

	describe('compare()', () => {
		it('deve validar match correto com pepper', async () => {
			const provider = new BcryptService();
			const password = 'password_with_pepper';
			const hash = await provider.generate(password);

			const isMatch = await provider.compare(password, hash);
			expect(isMatch).toBe(true);
		});

		it('deve falhar se a senha for incorreta', async () => {
			const provider = new BcryptService();
			const hash = await provider.generate('correct_one');

			const isMatch = await provider.compare('wrong_one', hash);
			expect(isMatch).toBe(false);
		});
	});

	describe('validateHash()', () => {
		it('deve aceitar hash Bcrypt válido', () => {
			const provider = new BcryptService();
			const validHash = '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/lewKyBAzMCLGu8OBu';
			expect(provider.validateHash(validHash)).toBe(true);
		});

		it('deve rejeitar hash Argon2', () => {
			const provider = new BcryptService();
			const argonHash = '$argon2id$v=19$m=65536,t=3,p=4$c2FsdHNhbHRzYWx0c2E$hash';
			expect(provider.validateHash(argonHash)).toBe(false);
		});
	});
});
