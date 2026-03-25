/**
 * @fileoverview Testes do Argon2Provider — Motor de Hashing Principal.
 *
 * ## O que testamos (Fase 3)
 * ✅ Geração de hash (executeHash)
 * ✅ Comparação de hash (executeCompare)
 * ✅ Validação de formato (executeValidation)
 * ✅ Determinismo e Segurança (Pepper & Salt)
 *
 * ## Regras de Negócio e ADRs aplicadas
 * - ADR 001: Coerção explícita de tipos.
 * - ADR 005: Prioridade arquitetural sobre avisos de linter.
 * - ADR 009: Proibição de casts (`as string`) em fluxos críticos.
 *
 * @see {@link src/auth/hash/providers/Argon2.service.auth.ts}
 */
import { vi, describe, it, expect } from 'vitest';
import { weakPassword } from '@tests/helpers/mocks/test.fixtures.js';

// Mock do env para garantir que pepper e custos sejam constantes controladas
vi.mock('@Configs/env.js', () => ({
	env: {
		HASHER_PROVIDER: 'argon2',
		HASHER_SECURITY_PEPPER: 'test-pepper-ultra-strong-sha256-ficticio',
		HASHER_MEMORY_COST: 65536,
		HASHER_TIME_COST: 3,
		HASHER_PARALLELISM: 4,
		HASHER_LENGTH: 32,
		HASHER_SALT_LENGTH: 16,
		EMAIL_TO_CONTACT: 'admin@test.com',
	},
}));

import Argon2Provider from '@Hash/providers/Argon2.service.auth.js';

describe('Argon2Provider', () => {
	const provider = new Argon2Provider();

	describe('generate()', () => {
		it('deve gerar um hash válido no formato PHC', async () => {
			const password = weakPassword;
			const hash = await provider.generate(password);

			// Formato PHC: $argon2id$v=19$m=65536,t=3,p=4$...
			expect(hash).toMatch(/^\$argon2id\$v=19\$m=65536,t=3,p=4\$/);
			expect(typeof hash).toBe('string');
		});

		it('deve gerar hashes diferentes para a mesma senha (salts dinâmicos)', async () => {
			const password = 'senha_repetida';
			const hash1 = await provider.generate(password);
			const hash2 = await provider.generate(password);

			expect(hash1).not.toBe(hash2);
		});

		it('deve falhar ao tentar gerar hash de string vazia', async () => {
			await expect(provider.generate('')).rejects.toThrow(
				'O payload para geração de hash não pode estar vazio',
			);
		});
	});

	describe('compare()', () => {
		it('deve retornar true para a senha correta (round-trip)', async () => {
			const password = 'minha_senha_segura';
			const hash = await provider.generate(password);

			const isMatch = await provider.compare(password, hash);
			expect(isMatch).toBe(true);
		});

		it('deve retornar false para senha incorreta', async () => {
			const password = 'senha_correta';
			const otherPassword = 'senha_errada';
			const hash = await provider.generate(password);

			const isMatch = await provider.compare(otherPassword, hash);
			expect(isMatch).toBe(false);
		});

		it('deve retornar false se o hash tiver formato inválido', async () => {
			const isMatch = await provider.compare('qualquer_coisa', 'formato_totalmente_errado');
			expect(isMatch).toBe(false);
		});
	});

	describe('validateHash()', () => {
		it('deve aceitar um hash Argon2id válido', () => {
			const validHash = '$argon2id$v=19$m=65536,t=3,p=4$c2FsdHNhbHRzYWx0c2E$hashhashhashhashhashhash';
			expect(provider.validateHash(validHash)).toBe(true);
		});

		it('deve rejeitar uma string comum', () => {
			expect(provider.validateHash('nao-e-um-hash')).toBe(false);
		});

		it('deve rejeitar um hash Bcrypt (segregando provedores)', () => {
			const bcryptHash = '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/lewKyBAzMCLGu8OBu';
			expect(provider.validateHash(bcryptHash)).toBe(false);
		});
	});
});
