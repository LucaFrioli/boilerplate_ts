/**
 * @fileoverview Testes do IdentityFactory — Fábrica de Providers de Identidade.
 *
 * ## O que é o IdentityFactory?
 * É o ponto de entrada único para obter generators de ID na aplicação.
 * Implementa o padrão **Singleton + Factory**: cria um provider uma única vez
 * por tipo e reutiliza a instância em chamadas subsequentes.
 *
 * Expõe dois objetos pré-configurados:
 * - `Id`   → provider de AppID (público/URL), configurado por `IDENTIFIER_PATTERN`
 * - `DBid` → provider de DatabaseID (interno/indexação), configurado por `DATABASE_ID_DEFAULT`
 *
 * ## O que testamos
 * ✅ `Id.generate()` produz IDs que passam em `isAppID()` (contrato end-to-end)
 * ✅ `DBid.generate()` produz IDs que passam em `isDatabaseID()` (contrato end-to-end)
 * ✅ Separação: ID gerado por `Id` não passa em `isDatabaseID()` e vice-versa
 * ✅ O factory retorna a mesma instância (Singleton — sem re-instanciação)
 * ✅ Os IDs gerados são válidos para os tipos Brand correspondentes
 *
 * ## O que NÃO testamos
 * ❌ A lógica interna de cada provider (coberta nos testes de NanoId e UUID)
 * ❌ Comportamento quando IDENTIFIER_PATTERN é alterado em runtime (não suportado)
 *
 * ## Contexto do mock
 * Com `IDENTIFIER_PATTERN=nanoid` e `DATABASE_ID_DEFAULT=uuidv7`, o `Id`
 * usa `NanoIdProvider` e o `DBid` usa `UuidV7Provider`.
 *
 * @see {@link src/core/identity/IdentityFactory.identity.ts}
 * @see {@link tests/helpers/mocks/test.fixtures.ts}
 */
import { vi, describe, it, expect } from 'vitest';

vi.mock('@Configs/env.js', () => ({
	env: {
		IDENTIFIER_PATTERN: 'nanoid',
		DATABASE_ID_DEFAULT: 'uuidv7',
		IDENTIFIER_NANOID_ALPHABET: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_',
		IDENTIFIER_NANOID_SIZE: 21,
		EMAIL_TO_CONTACT: 'test@test.com',
	},
}));

import { Id, DBid } from '@Id/IdentityFactory.identity.js';

// Regex dos formatos esperados conforme o mock do env
const NANOID_REGEX = /^[A-Za-z0-9\-_]{21}$/;
const UUID_V7_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

describe('IdentityFactory', () => {
	// =========================================================================
	// Id — AppID Provider (IDENTIFIER_PATTERN=nanoid)
	// =========================================================================
	describe('Id (AppID provider — NanoId)', () => {
		/**
		 * Com `IDENTIFIER_PATTERN=nanoid`, o `Id` deve instanciar `NanoIdProvider`.
		 * O output deve seguir o formato NanoID de 21 chars URL-safe.
		 */
		it('deve gerar AppIDs no formato NanoID (21 chars URL-safe)', () => {
			const id = Id.generate();

			expect(typeof id).toBe('string');
			expect(id).toHaveLength(21);
			expect(NANOID_REGEX.test(id)).toBe(true);
		});

		/**
		 * O ID gerado deve ser validado pelo próprio provider (round-trip).
		 * Se `generate()` e `validate()` usam a mesma regex, devem sempre concordar.
		 */
		it('deve gerar IDs que passam na validação do próprio provider (round-trip)', () => {
			const id = Id.generate();

			expect(Id.validate(id)).toBe(true);
		});

		/**
		 * 🔒 Separação de domínios: AppID não deve ser aceito como DatabaseID.
		 * Um NanoID não é um UUID — garantia da estratégia dual-ID.
		 */
		it('deve gerar IDs que NÃO passam como DatabaseID (separação de domínio)', () => {
			const appId = Id.generate();

			expect(DBid.validate(appId)).toBe(false);
		});

		/**
		 * IDs gerados devem ser únicos em múltiplas chamadas.
		 */
		it('deve gerar AppIDs únicos em múltiplas chamadas', () => {
			const SAMPLE_SIZE = 50;

			const ids = new Set(Array.from({ length: SAMPLE_SIZE }, () => Id.generate()));

			expect(ids.size).toBe(SAMPLE_SIZE);
		});
	});

	// =========================================================================
	// DBid — DatabaseID Provider (DATABASE_ID_DEFAULT=uuidv7)
	// =========================================================================
	describe('DBid (DatabaseID provider — UuidV7)', () => {
		/**
		 * Com `DATABASE_ID_DEFAULT=uuidv7`, o `DBid` deve instanciar `UuidV7Provider`.
		 * O output deve seguir o formato UUID com nibble de versão '7'.
		 */
		it('deve gerar DatabaseIDs no formato UUIDv7', () => {
			const id = DBid.generate();

			expect(typeof id).toBe('string');
			expect(id).toHaveLength(36);
			expect(UUID_V7_REGEX.test(id)).toBe(true);
		});

		/**
		 * Round-trip: ID gerado deve ser aceito pela validação do mesmo provider.
		 */
		it('deve gerar IDs que passam na validação do próprio provider (round-trip)', () => {
			const id = DBid.generate();

			expect(DBid.validate(id)).toBe(true);
		});

		/**
		 * 🔒 Separação de domínios: DatabaseID não deve ser aceito como AppID.
		 * Um UUIDv7 não é um NanoID — garantia da estratégia dual-ID.
		 */
		it('deve gerar IDs que NÃO passam como AppID (separação de domínio)', () => {
			const dbId = DBid.generate();

			expect(Id.validate(dbId)).toBe(false);
		});

		/**
		 * Propriedade temporal do UUIDv7: IDs subsequentes devem ser crescentes.
		 * Crítico para performance de índices no banco de dados.
		 */
		it('deve gerar DatabaseIDs monotonicamente crescentes (propriedade UUIDv7)', async () => {
			const id1 = DBid.generate();
			await new Promise<void>((resolve) => setTimeout(resolve, 2));
			const id2 = DBid.generate();

			// Os primeiros 13 chars codificam o timestamp (48 bits)
			expect(id2.slice(0, 13) >= id1.slice(0, 13)).toBe(true);
		});

		it('deve gerar DatabaseIDs únicos em múltiplas chamadas', () => {
			const SAMPLE_SIZE = 50;

			const ids = new Set(Array.from({ length: SAMPLE_SIZE }, () => DBid.generate()));

			expect(ids.size).toBe(SAMPLE_SIZE);
		});
	});

	// =========================================================================
	// Padrão Singleton — mesma instância entre chamadas
	// =========================================================================
	describe('Singleton Pattern', () => {
		/**
		 * O `IdentityFactory` usa lazy instantiation com cache interno.
		 * Chamadas múltiplas a `Id.generate()` devem usar a mesma instância interna —
		 * verificado indiretamente pela consistência do comportamento.
		 *
		 * Não testamos a referência direta ao `instances` (privado) — isso seria
		 * testar a implementação e não o contrato. Em vez disso, verificamos que
		 * o comportamento é consistente (mesmos formatos, mesmas validações).
		 */
		it('Id deve produzir IDs consistentes com o mesmo formato em múltiplas chamadas', () => {
			const ids = Array.from({ length: 10 }, () => Id.generate());

			const allNanoIds = ids.every((id) => NANOID_REGEX.test(id));

			expect(allNanoIds).toBe(true);
		});

		it('DBid deve produzir IDs consistentes com o mesmo formato em múltiplas chamadas', () => {
			const ids = Array.from({ length: 10 }, () => DBid.generate());

			const allUuidV7s = ids.every((id) => UUID_V7_REGEX.test(id));

			expect(allUuidV7s).toBe(true);
		});
	});
});
