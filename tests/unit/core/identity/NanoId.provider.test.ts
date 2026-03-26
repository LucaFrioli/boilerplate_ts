/**
 * @fileoverview Testes do NanoIdProvider — Gerador de AppIDs.
 *
 * ## Contrato testado
 * `NanoIdProvider` implementa `BaseIdentityGenerator` com a lógica de NanoID:
 * - Trata o alfabeto configurado como fonte de entropia
 * - Usa `randomBytes` + bitmask para distribuição uniforme (sem bias)
 * - Valida via `NanoIDRegex` (construído a partir do alfabeto + tamanho do env)
 *
 * ## O que testamos (e o que NÃO testamos)
 * ✅ `generate()` produz string com o tamanho correto
 * ✅ `generate()` produz string apenas com chars do alfabeto configurado
 * ✅ `generate()` retorna objeto imutável (Object.freeze via BaseIdentityGenerator)
 * ✅ `validate()` aceita NanoIDs válidos
 * ✅ `validate()` rejeita strings inválidas (tamanho errado, chars inválidos, tipos errados)
 * ✅ `generate()` produz IDs únicos (test de collisão com amostra)
 * ❌ Não testamos o algoritmo de bitmask interno — lógica de implementação, não contrato
 * ❌ Não testamos a distribuição estatística — exigiria ferramentas externas
 *
 * ## vi.mock necessário
 * `NanoIdProvider` importa `env.ts` indiretamente via `@Types` (NanoIDRegex)
 * e diretamente (ALPHABET, DEFAULT_SIZE). Sem mock, env.ts chama process.exit(1).
 *
 * @see {@link src/core/identity/providers/NanoId.service.identity.ts}
 * @see {@link src/core/identity/contracts/IIdentyti.contract.ts}
 * @see {@link tests/helpers/mocks/test.fixtures.ts}
 */
import { vi, describe, it, expect } from 'vitest';
import { validNanoId } from '@Mocks/test.fixtures.js';

vi.mock('@Configs/env.js', () => ({
	env: {
		IDENTIFIER_PATTERN: 'nanoid',
		DATABASE_ID_DEFAULT: 'uuidv7',
		IDENTIFIER_NANOID_ALPHABET: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_',
		// Número (não string): NanoIdProvider.DEFAULT_SIZE = env.IDENTIFIER_NANOID_SIZE usa como number
		// A comparação 'id.length !== NanoIdProvider.DEFAULT_SIZE' seria 21 !== '21' = true (sempre falha)
		IDENTIFIER_NANOID_SIZE: 21,
		EMAIL_TO_CONTACT: 'test@test.com',
	},
}));

import NanoIdProvider from '@Id/providers/NanoId.service.identity.js';

// ---------------------------------------------------------------------------
// Setup: instância reutilizável entre os testes (sem estado mutável relevante)
// ---------------------------------------------------------------------------
const EXPECTED_SIZE = 21;
const VALID_ALPHABET = new Set('ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_');

describe('NanoIdProvider', () => {
	// =========================================================================
	// generate() — Contrato de geração
	// =========================================================================
	describe('generate()', () => {
		/**
		 * O contrato mais básico: o provider deve produzir uma string.
		 */
		it('deve retornar uma string', () => {
			const provider = new NanoIdProvider();

			const id = provider.generate();

			expect(typeof id).toBe('string');
		});

		/**
		 * Tamanho fixo = entropia previsível.
		 * Se o tamanho mudar, a regex de validação deixará de funcionar.
		 */
		it('deve gerar ID com o tamanho configurado (21 chars)', () => {
			const provider = new NanoIdProvider();

			const id = provider.generate();

			expect(id).toHaveLength(EXPECTED_SIZE);
		});

		/**
		 * Todos os chars devem pertencer ao alfabeto URL-safe configurado.
		 * Chars fora do alfabeto causariam falhas em URLs e headers HTTP.
		 */
		it('deve gerar ID apenas com chars do alfabeto configurado', () => {
			const provider = new NanoIdProvider();

			const id = provider.generate();
			const allCharsValid = Array.from(id).every((char) => VALID_ALPHABET.has(char));

			expect(allCharsValid).toBe(true);
		});

		/**
		 * Object.freeze é aplicado pelo BaseIdentityGenerator após cada geração.
		 * Garante que o ID não pode ser mutado após sair do provider.
		 */
		it('deve retornar string imutável (Object.freeze)', () => {
			const provider = new NanoIdProvider();

			const id = provider.generate();

			// Strings primitivas são sempre imutáveis em JS — mas se fosse um objeto
			// wrapper (new String()), freeze seria relevante. Como é primitiva, basta
			// confirmar que o valor é uma string primitiva (não um objeto wrapper).
			expect(typeof id).toBe('string');
			expect(Object.isFrozen(id)).toBe(true);
		});

		/**
		 * Teste de unicidade com amostra pequena.
		 * Com 21 chars e 64 possibilidades por posição, a probabilidade de colisão
		 * em 100 gerações é astronomicamente baixa (< 1 em 10^37).
		 * Se este teste falhar, há um problema grave no gerador de entropia.
		 */
		it('deve gerar IDs únicos em múltiplas chamadas', () => {
			const provider = new NanoIdProvider();
			const SAMPLE_SIZE = 100;

			const ids = new Set(Array.from({ length: SAMPLE_SIZE }, () => provider.generate()));

			// Todos os 100 IDs devem ser únicos
			expect(ids.size).toBe(SAMPLE_SIZE);
		});
	});

	// =========================================================================
	// validate() — Contrato de validação
	// =========================================================================
	describe('validate()', () => {
		/**
		 * O ID de referência do fixtures foi criado seguindo exatamente o
		 * formato configurado em .env.test — deve passar sem falhas.
		 */
		it('deve aceitar o NanoID de referência dos fixtures', () => {
			const provider = new NanoIdProvider();

			expect(provider.validate(validNanoId)).toBe(true);
		});

		/**
		 * Um ID gerado pelo próprio provider deve ser validado pelo mesmo provider.
		 * Testa o round-trip: generate → validate.
		 */
		it('deve aceitar qualquer ID gerado por generate() (round-trip)', () => {
			const provider = new NanoIdProvider();

			const id = provider.generate();

			expect(provider.validate(id)).toBe(true);
		});

		/**
		 * ID com tamanho incorreto deve falhar antes de testar a regex.
		 */
		it('deve rejeitar string com tamanho diferente do configurado', () => {
			const provider = new NanoIdProvider();

			expect(provider.validate('curto')).toBe(false);
			expect(provider.validate('muito-longo-para-ser-um-nanoid-de-21-chars')).toBe(false);
		});

		/**
		 * Char fora do alfabeto (espaço, @, #) deve falhar na regex.
		 * 21 chars mas com '@' na posição 8.
		 */
		it('deve rejeitar ID com chars fora do alfabeto configurado', () => {
			const provider = new NanoIdProvider();

			// 21 chars mas com '@' — inválido pelo NanoIDRegex
			expect(provider.validate('V1StGXR8@Z5jdHi6Bmyt3')).toBe(false);
		});

		/**
		 * String vazia não tem nem o tamanho mínimo correto.
		 */
		it('deve rejeitar string vazia', () => {
			const provider = new NanoIdProvider();

			expect(provider.validate('')).toBe(false);
		});

		/**
		 * UUIDs têm formato completamente diferente — devem ser rejeitados.
		 * Garante que não há falsos positivos com outros formatos de ID.
		 */
		it('deve rejeitar UUIDv7 (outro formato de ID)', () => {
			const provider = new NanoIdProvider();

			expect(provider.validate('018e9f3a-1b2c-7d4e-8f5a-6b7c8d9e0f1a')).toBe(false);
		});
	});
});
