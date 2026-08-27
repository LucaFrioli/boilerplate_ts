/* eslint-disable @typescript-eslint/no-unsafe-member-access */

/**
 * @fileoverview Testes da HasherFactory — Gestão de Instâncias de Hashing.
 *
 * ✅ Singleton: Retorna a mesma instância.
 * ✅ Configuração: Respeita o env.HASHER_PROVIDER.
 * ✅ Tipagem: Retorna Branded Type HashedString.
 */
import { vi, describe, it, expect, beforeEach } from 'vitest';

vi.mock('@Configs/env.js', async () => {
	const { baseTestEnv } = await import('@Mocks/test.fixtures.js');
	return ({
		env: { ...baseTestEnv },
	})
});

import { Hasher, HasherFactory } from '@Hash/hashesFactory.auth.js';
import Argon2Provider from '@Hash/providers/Argon2.service.auth.js';
import { BaseHasher } from '@Hash/contracts/IHasher.contract.js';

describe('HasherFactory', () => {
	beforeEach(() => {
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		(BaseHasher as any)._baseEnv = undefined;
	});
	it('deve retornar uma instância de Argon2Provider por padrão', () => {
		expect(Hasher).toBeInstanceOf(Argon2Provider);
	});

	it('deve ser um Singleton (retornar a mesma instância chamando getProvider)', () => {
		// A primeira chamada ocorreu no import (export const Hasher)
		// A segunda chamada vai testar a branch if (!this.instance) sendo falsa
		const instance1 = HasherFactory.getProvider();
		const instance2 = HasherFactory.getProvider();

		expect(instance1).toBe(instance2);
		expect(instance1).toBe(Hasher);
	});

	it('deve gerar um HashedString (Branded Type)', async () => {
		const hash = await Hasher.generate('minha_senha');

		expect(typeof hash).toBe('string');
		expect(Hasher.validateHash(hash)).toBe(true);
	});
});
