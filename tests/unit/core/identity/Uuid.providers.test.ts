/**
 * @fileoverview Testes dos UuidV4Provider e UuidV7Provider.
 *
 * ## Por que testar os dois no mesmo arquivo?
 * Ambos implementam o mesmo contrato (`BaseIdentityGenerator`) com a mesma
 * estrutura interna: geram via crypto, validam via regex com nibble de versão.
 * Testá-los juntos reduz duplicação e facilita comparação de comportamento.
 *
 * ## Contrato de cada um
 *
 * ### UuidV4Provider
 * - Usa `crypto.randomUUID()` (Node nativo, criptograficamente seguro)
 * - Valida via regex com nibble '4' na posição de versão
 * - Formato: xxxxxxxx-xxxx-**4**xxx-[89ab]xxx-xxxxxxxxxxxx
 *
 * ### UuidV7Provider
 * - Implementação bitwise própria (sem biblioteca externa)
 * - Embute timestamp nos primeiros 48 bits → IDs são monotonicamente crescentes
 * - Valida via regex com nibble '7' na posição de versão
 * - Formato: xxxxxxxx-xxxx-**7**xxx-[89ab]xxx-xxxxxxxxxxxx
 *
 * ## Propriedade crítica do UUIDv7: ordenação temporal
 * IDs gerados em sequência devem ser lexicograficamente crescentes.
 * Isso garante performance em índices de banco de dados (B-Tree friendly).
 *
 * @see {@link src/core/identity/providers/UuidV4.service.identity.ts}
 * @see {@link src/core/identity/providers/UuidV7.service.identity.ts}
 * @see {@link tests/helpers/mocks/test.fixtures.ts}
 */
import { vi, describe, it, expect } from 'vitest';
import { validUuidV4, validUuidV7, validNanoId } from '@Mocks/test.fixtures.js';

vi.mock('@Configs/env.js', () => ({
	env: {
		IDENTIFIER_PATTERN: 'nanoid',
		DATABASE_ID_DEFAULT: 'uuidv7',
		IDENTIFIER_NANOID_ALPHABET: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_',
		IDENTIFIER_NANOID_SIZE: 21,
		EMAIL_TO_CONTACT: 'test@test.com',
	},
}));

import UuidV4Provider from '@Id/providers/UuidV4.service.identity.js';
import UuidV7Provider from '@Id/providers/UuidV7.service.identity.js';

// ---------------------------------------------------------------------------
// Regex de versão: verifica o nibble na posição correta do UUID
// ---------------------------------------------------------------------------
const UUID_V4_NIBBLE = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const UUID_V7_NIBBLE = /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const UUID_LENGTH = 36;

describe('UUID Providers', () => {
	// =========================================================================
	// UuidV4Provider
	// =========================================================================
	describe('UuidV4Provider', () => {
		describe('generate()', () => {
			it('deve retornar uma string', () => {
				const provider = new UuidV4Provider();

				expect(typeof provider.generate()).toBe('string');
			});

			/**
			 * Formato UUID: 8-4-4-4-12 chars hexadecimais separados por `-`.
			 * Total: 32 hex + 4 hífens = 36 chars.
			 */
			it('deve gerar string no formato UUID (36 chars com hífens)', () => {
				const provider = new UuidV4Provider();

				const id = provider.generate();

				expect(id).toHaveLength(UUID_LENGTH);
				expect(id.split('-')).toHaveLength(5);
			});

			/**
			 * 🔒 O nibble na posição de versão deve ser sempre '4'.
			 * Isso diferencia UUIDv4 de todas as outras versões.
			 */
			it('deve gerar UUID com nibble de versão 4 (posição correta)', () => {
				const provider = new UuidV4Provider();

				const id = provider.generate();

				expect(UUID_V4_NIBBLE.test(id)).toBe(true);
			});

			/**
			 * `crypto.randomUUID()` é criptograficamente seguro.
			 * Colisões são estatisticamente impossíveis em uma amostra pequena.
			 */
			it('deve gerar IDs únicos em múltiplas chamadas', () => {
				const provider = new UuidV4Provider();
				const SAMPLE_SIZE = 50;

				const ids = new Set(Array.from({ length: SAMPLE_SIZE }, () => provider.generate()));

				expect(ids.size).toBe(SAMPLE_SIZE);
			});

			it('deve retornar string imutável', () => {
				const provider = new UuidV4Provider();

				const id = provider.generate();

				expect(Object.isFrozen(id)).toBe(true);
			});
		});

		describe('validate()', () => {
			it('deve aceitar o UUIDv4 de referência dos fixtures', () => {
				const provider = new UuidV4Provider();

				expect(provider.validate(validUuidV4)).toBe(true);
			});

			it('deve aceitar qualquer ID gerado por generate() (round-trip)', () => {
				const provider = new UuidV4Provider();

				const id = provider.generate();

				expect(provider.validate(id)).toBe(true);
			});

			/**
			 * 🔒 UUIDv7 tem nibble '7' — deve ser rejeitado pelo validador de v4.
			 * A separação de versão é a garantia do contrato dual-ID.
			 */
			it('deve rejeitar UUIDv7 (nibble 7 ≠ nibble 4)', () => {
				const provider = new UuidV4Provider();

				expect(provider.validate(validUuidV7)).toBe(false);
			});

			it('deve rejeitar NanoID (formato completamente diferente)', () => {
				const provider = new UuidV4Provider();

				expect(provider.validate(validNanoId)).toBe(false);
			});

			it('deve rejeitar string com tamanho incorreto', () => {
				const provider = new UuidV4Provider();

				expect(provider.validate('curto')).toBe(false);
				expect(provider.validate('')).toBe(false);
			});
		});
	});

	// =========================================================================
	// UuidV7Provider
	// =========================================================================
	describe('UuidV7Provider', () => {
		describe('generate()', () => {
			it('deve retornar uma string', () => {
				const provider = new UuidV7Provider();

				expect(typeof provider.generate()).toBe('string');
			});

			it('deve gerar string no formato UUID (36 chars com hífens)', () => {
				const provider = new UuidV7Provider();

				const id = provider.generate();

				expect(id).toHaveLength(UUID_LENGTH);
				expect(id.split('-')).toHaveLength(5);
			});

			/**
			 * 🔒 O nibble na posição de versão deve ser sempre '7'.
			 * A implementação bitwise define: `value[6] = (v6Byte & 0x0f) | 0x70`
			 * o que força os 4 bits superiores do byte 6 a serem '0111' = 7 em hex.
			 */
			it('deve gerar UUID com nibble de versão 7 (posição correta)', () => {
				const provider = new UuidV7Provider();

				const id = provider.generate();

				expect(UUID_V7_NIBBLE.test(id)).toBe(true);
			});

			/**
			 * Propriedade fundamental do UUIDv7: monotonicamente crescente.
			 * Os primeiros 48 bits são o timestamp em ms — IDs gerados em
			 * sequência devem ser lexicograficamente ordenados.
			 * Isso é o que torna o UUIDv7 B-Tree friendly para bancos de dados.
			 *
			 * Note: comparamos apenas os primeiros 13 chars (timestamp + version nibble)
			 * porque os bits aleatórios depois do timestamp não são ordenáveis.
			 */
			it('deve gerar IDs com ordenação temporal (UUIDv7 monotônico)', async () => {
				const provider = new UuidV7Provider();

				// Geramos com um pequeno delay para garantir timestamps diferentes
				const id1 = provider.generate();
				await new Promise<void>((resolve) => setTimeout(resolve, 2));
				const id2 = provider.generate();

				// Os primeiros 13 chars codificam o timestamp — id2 deve ser maior
				expect(id2.slice(0, 13) >= id1.slice(0, 13)).toBe(true);
			});

			it('deve gerar IDs únicos em múltiplas chamadas', () => {
				const provider = new UuidV7Provider();
				const SAMPLE_SIZE = 50;

				const ids = new Set(Array.from({ length: SAMPLE_SIZE }, () => provider.generate()));

				expect(ids.size).toBe(SAMPLE_SIZE);
			});

			it('deve retornar string imutável', () => {
				const provider = new UuidV7Provider();

				const id = provider.generate();

				expect(Object.isFrozen(id)).toBe(true);
			});
		});

		describe('validate()', () => {
			it('deve aceitar o UUIDv7 de referência dos fixtures', () => {
				const provider = new UuidV7Provider();

				expect(provider.validate(validUuidV7)).toBe(true);
			});

			it('deve aceitar qualquer ID gerado por generate() (round-trip)', () => {
				const provider = new UuidV7Provider();

				const id = provider.generate();

				expect(provider.validate(id)).toBe(true);
			});

			/**
			 * 🔒 UUIDv4 tem nibble '4' — deve ser rejeitado pelo validador de v7.
			 */
			it('deve rejeitar UUIDv4 (nibble 4 ≠ nibble 7)', () => {
				const provider = new UuidV7Provider();

				expect(provider.validate(validUuidV4)).toBe(false);
			});

			it('deve rejeitar NanoID (formato completamente diferente)', () => {
				const provider = new UuidV7Provider();

				expect(provider.validate(validNanoId)).toBe(false);
			});

			it('deve rejeitar string com tamanho incorreto', () => {
				const provider = new UuidV7Provider();

				expect(provider.validate('curto')).toBe(false);
				expect(provider.validate('')).toBe(false);
			});
		});
	});
});
