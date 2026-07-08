/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
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
const { mockWarn } = vi.hoisted(() => {
	return (
		{
			mockWarn: vi.fn(),
		})
});

vi.mock('@Configs/logger.js', () => ({
	createChildLogger: (): { fatal: unknown; warn: unknown; error: unknown; info: unknown } => ({
		fatal: vi.fn(),
		warn: mockWarn,
		error: vi.fn(),
		info: vi.fn(),
	}),
}));

vi.mock('@Configs/env.js', async () => {
	const { baseTestEnv } = await import('@Mocks/test.fixtures.js');

	return ({
		env: { ...baseTestEnv, HASHER_PROVIDER: 'bcrypt' },
	})
});

import { env } from '@Configs/env.js';
import BcryptService from '@Hash/providers/Bcrypt.service.auth.js';
import { BaseHasher } from '@Hash/contracts/IHasher.contract.js';
import { hasherEnvValidationSchema } from '@Configs/schemas/hasherEnv.schema.js';

describe('BcryptService', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		(BaseHasher as any)._baseEnv = undefined;
		env.HASHER_BCRYPT_ROUNDS = 12; // Reset para cada teste
	});

	describe('generate()', () => {
		it('deve gerar um hash Bcrypt válido ($2$10) quando rounds são 10', async () => {
			(BaseHasher as any)._baseEnv = {
				...env,
				HASHER_BCRYPT_ROUNDS: 10,
			};
			const provider = new BcryptService();
			const hash = await provider.generate('senha123');

			// Formato Bcrypt: $2b$10$...
			expect(hash).toMatch(/^\$2b\$10\$/);
		});

		it('deve gerar um hash Bcrypt válido ($2$12) quando rounds são 12', async () => {
			const provider = new BcryptService();
			const hash = await provider.generate('senha123');

			// Formato Bcrypt: $2b$10$...
			expect(hash).toMatch(/^\$2b\$12\$/);
		});

		it('deve falhar se rounds < 10 (Fail-Fast)', async () => {
			(BaseHasher as any)._baseEnv = {
				...env,
				HASHER_BCRYPT_ROUNDS: 8,
			};
			const provider = new BcryptService();

			await expect(provider.generate('senha123')).rejects.toThrow(
				'Erro interno crítico, contate algum administrador',
			);
		});

		it('deve emitir aviso se rounds > 13 (Performance)', async () => {
			(BaseHasher as any)._baseEnv = {
				...env,
				HASHER_BCRYPT_ROUNDS: 14,
			};
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

		it('deve retornar false se o hash fornecido estiver em formato inválido', async () => {
			const provider = new BcryptService();
			const isMatch = await provider.compare('qualquer_senha', 'formato_totalmente_invalido');
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

	describe('Sobrecarga Semântica (Documentação de Segurança e Não-Regressão)', () => {
		it('HASHER_SALT_LENGTH (do Argon2) é inseguro se usado como rounds do Bcrypt (invariante >= 16 rounds)', () => {
			const parsedEnv = hasherEnvValidationSchema.parse({
				HASHER_SECURITY_PEPPER: 'development-secretPepper_SHA256-F@llback',
			});

			// Mostra explicitamente que HASHER_SALT_LENGTH é >= 16 bytes (padrão Argon2),
			// o que congelaria a CPU se fosse interpretado como rounds pelo Bcrypt (DoS).
			expect(parsedEnv.HASHER_SALT_LENGTH).toBeGreaterThanOrEqual(16);
		});

		it('deve documentar que HASHER_BCRYPT_ROUNDS é a configuração correta e segura para Bcrypt (rounds <= 13)', () => {
			const parsedEnv = hasherEnvValidationSchema.parse({
				HASHER_SECURITY_PEPPER: 'development-secretPepper_SHA256-F@llback',
			});

			// Mostra explicitamente que a nova variável dedicada está limitada a uma faixa segura (12 a 13)
			expect(parsedEnv.HASHER_BCRYPT_ROUNDS).toBeLessThanOrEqual(13);
			expect(parsedEnv.HASHER_BCRYPT_ROUNDS).toBeGreaterThanOrEqual(12);
		});
	});
});
