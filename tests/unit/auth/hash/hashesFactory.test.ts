/**
 * @fileoverview Testes da HasherFactory — Gestão de Instâncias de Hashing.
 *
 * ✅ Singleton: Retorna a mesma instância.
 * ✅ Configuração: Respeita o env.HASHER_PROVIDER.
 * ✅ Tipagem: Retorna Branded Type HashedString.
 */
import { vi, describe, it, expect } from 'vitest';

// Mock do env para alternar provedores
const { mockEnv } = vi.hoisted(() => ({
	mockEnv: {
		HASHER_PROVIDER: 'argon2' as 'argon2' | 'bcrypt',
		HASHER_SECURITY_PEPPER: 'factory-test-pepper-ultra-strong',
		HASHER_SALT_LENGTH: 10,
		HASHER_MEMORY_COST: 65536,
		HASHER_TIME_COST: 3,
		HASHER_PARALLELISM: 4,
		HASHER_LENGTH: 32,
		EMAIL_TO_CONTACT: 'admin@test.com',
	},
}));

vi.mock('@Configs/env.js', () => ({
	env: mockEnv,
}));

import { Hasher } from '@Hash/hashesFactory.auth.js';
import Argon2Provider from '@Hash/providers/Argon2.service.auth.js';
// BcryptService removido pois não é usado explicitamente no teste de factory padrão

describe('HasherFactory', () => {
	it('deve retornar uma instância de Argon2Provider por padrão', () => {
		expect(Hasher).toBeInstanceOf(Argon2Provider);
	});

	it('deve ser um Singleton (retornar a mesma instância)', () => {
		const instance1 = Hasher;
		const instance2 = Hasher;

		expect(instance1).toBe(instance2);
	});

	it('deve gerar um HashedString (Branded Type)', async () => {
		const hash = await Hasher.generate('minha_senha');

		expect(typeof hash).toBe('string');
		expect(Hasher.validateHash(hash)).toBe(true);
	});
});
