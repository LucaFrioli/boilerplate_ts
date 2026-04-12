/**
 * @fileoverview Testes dos Type Guards de Identidade — `identity.type.ts`.
 *
 * ## O que estamos testando
 *
 * O sistema de identidade usa dois IDs com propósitos distintos:
 * - `AppID` → exposto para o frontend, URLs, tokens. Configurado via `env.IDENTIFIER_PATTERN`.
 * - `DatabaseID` → usado internamente para indexação. Configurado via `env.DATABASE_ID_DEFAULT`.
 *
 * Os type guards `isAppID()` e `isDatabaseID()` são as fronteiras que garantem
 * que nenhum ID inválido entre no sistema e que os dois tipos não sejam
 * usados de forma intercambiável (um `DatabaseID` não vaza para uma URL).
 *
 * ## Configuração deste ambiente de teste, e recomendado para prod até o dia de hoje 25/03/2026
 * `.env.test` define:
 * - `IDENTIFIER_PATTERN=nanoid`       → `isAppID` usa a regex NanoID
 * - `DATABASE_ID_DEFAULT=uuidv7`      → `isDatabaseID` usa a regex UUIDv7
 *
 * ## Por que vi.mock aqui?
 * `identity.type.ts` importa `env.ts` no nível de módulo (top-level import).
 * O `env.ts` chama `process.exit(1)` caso as variáveis de ambiente não passem
 * na validação Zod — isso ocorre antes mesmo de qualquer teste rodar.
 *
 * `vi.mock()` é hoistado pelo Vitest acima de qualquer import, o que significa
 * que quando `identity.type.ts` tentar importar `env.ts`, receberá o mock abaixo
 * em vez do módulo real. Isso evita o process.exit sem alterar nenhum código de produção.
 *
 * @see {@link src/shared/types/identity.type.ts}
 * @see {@link src/core/identity/providers/}
 */
import { vi, describe, it, expect } from 'vitest';

/**
 * ## vi.mock com factory function
 * A factory retorna o objeto que substituirá `env.ts`.
 * Fornecemos apenas os campos que `identity.type.ts` consome:
 * - `IDENTIFIER_PATTERN` → usado em `isAppID()`
 * - `DATABASE_ID_DEFAULT` → usado em `isDatabaseID()`
 * - `IDENTIFIER_NANOID_ALPHABET` e `IDENTIFIER_NANOID_SIZE` → usados para construir `NanoIDRegex`
 *
 * Usar `vi.mock` com factory é preferível a `vi.spyOn` aqui porque o módulo
 * ainda não foi importado quando o hoisting ocorre — o spy não pode substituir
 * algo que ainda não existe no módulo cache.
 */
vi.mock('@Configs/env.js', () => ({
	env: {
		IDENTIFIER_PATTERN: 'nanoid',
		DATABASE_ID_DEFAULT: 'uuidv7',
		IDENTIFIER_NANOID_ALPHABET: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_',
		// String: identity.type.ts usa String(env.IDENTIFIER_NANOID_SIZE) para construir a regex
		IDENTIFIER_NANOID_SIZE: '21',
	},
}));

import { isAppID, isDatabaseID, NanoIDRegex } from '@Types/identity.type.js';
import { regexValidationToIdentitySupported } from '@Configs/constants/env.constants.js';

// ---------------------------------------------------------------------------
// IDs válidos hardcodados — representam output real dos providers conforme .env.test
// ---------------------------------------------------------------------------

import { validNanoId, validUuidV7, validUuidV4 } from '@Mocks/test.fixtures.js';

describe('identity.type', () => {
	// =========================================================================
	// isAppID — Guarda do ID Público (IDENTIFIER_PATTERN=nanoid no .env.test)
	// =========================================================================
	describe('isAppID', () => {
		/**
		 * Caminho feliz: NanoID no formato padrão do .env.test.
		 * 21 chars, alfabeto URL-safe, sem duplicatas.
		 */
		it('deve aceitar um NanoID válido no formato configurado', () => {
			expect(isAppID(validNanoId)).toBe(true);
		});

		/**
		 * 🔒 Um UUIDv7 (DatabaseID) não deve passar como AppID.
		 * Essa é a garantia central da estratégia dual-ID:
		 * os dois espaços de identidade são incompatíveis.
		 */
		it('deve rejeitar um UUIDv7 (DatabaseID) como AppID', () => {
			expect(isAppID(validUuidV7)).toBe(false);
		});

		/**
		 * String com tamanho diferente do configurado (21 chars) é inválida.
		 */
		it('deve rejeitar NanoID com tamanho incorreto', () => {
			// 10 chars — abaixo do tamanho configurado em IDENTIFIER_NANOID_SIZE=21
			expect(isAppID('abc123')).toBe(false);
		});

		/**
		 * Chars fora do alfabeto configurado tornam o ID inválido.
		 * '@' não pertence ao IDENTIFIER_NANOID_ALPHABET.
		 */
		it('deve rejeitar ID contendo caracteres inválidos para o alfabeto', () => {
			// 21 chars mas com '@' que não está no alfabeto URL-safe
			expect(isAppID('V1StGXR8@Z5jdHi6B-myT')).toBe(false);
		});

		/**
		 * String genérica sem formato de ID deve ser rejeitada.
		 */
		it('deve rejeitar string genérica como AppID', () => {
			expect(isAppID('nao-e-um-id')).toBe(false);
		});

		// -----------------------------------------------------------------------
		// Falhas de tipo (runtime safety — payloads externos não tipados)
		// -----------------------------------------------------------------------
		describe('quando value não é string', () => {
			it('deve retornar false para número', () => {
				expect(isAppID(12345678901234567890n as unknown)).toBe(false);
			});

			it('deve retornar false para undefined', () => {
				expect(isAppID(undefined)).toBe(false);
			});

			it('deve retornar false para null', () => {
				expect(isAppID(null)).toBe(false);
			});

			it('deve retornar false para objeto', () => {
				expect(isAppID({ id: 'abc' })).toBe(false);
			});
		});
	});

	// =========================================================================
	// isDatabaseID — Guarda do ID Interno (DATABASE_ID_DEFAULT=uuidv7 no .env.test)
	// =========================================================================
	describe('isDatabaseID', () => {
		/**
		 * Caminho feliz: UUIDv7 válido com nibble correto na posição 3.
		 * Testamos que o nibble '7' é validado corretamente pela regex.
		 */
		it('deve aceitar um UUIDv7 válido', () => {
			expect(isDatabaseID(validUuidV7)).toBe(true);
		});

		/**
		 * 🔒 Um NanoID (AppID) não deve ser aceito como DatabaseID.
		 * Reforça a separação de responsabilidades entre os dois IDs.
		 */
		it('deve rejeitar um NanoID (AppID) como DatabaseID', () => {
			expect(isDatabaseID(validNanoId)).toBe(false);
		});

		/**
		 * 🔒 Um UUIDv4, apesar de ser também um UUID, não é um UUIDv7.
		 * A diferença é o nibble da versão: '4' vs '7'.
		 * Testar isso garante que o guard não aceita UUID genérico.
		 */
		it('deve rejeitar UUIDv4 como DatabaseID quando DATABASE_ID_DEFAULT=uuidv7', () => {
			expect(isDatabaseID(validUuidV4)).toBe(false);
		});

		/**
		 * UUID com nibble errado na posição de versão.
		 * O formato está correto mas é UUID versão 5 — deve ser rejeitado.
		 */
		it('deve rejeitar UUID com versão inválida (nibble ≠ 7)', () => {
			// Mesma estrutura mas '5' na posição da versão — UUIDv5
			expect(isDatabaseID('018e9f3a-1b2c-5d4e-8f5a-6b7c8d9e0f1a')).toBe(false);
		});

		it('deve rejeitar string genérica como DatabaseID', () => {
			expect(isDatabaseID('qualquer-string')).toBe(false);
		});

		// -----------------------------------------------------------------------
		// Falhas de tipo
		// -----------------------------------------------------------------------
		describe('quando value não é string', () => {
			it('deve retornar false para número', () => {
				expect(isDatabaseID(123 as unknown)).toBe(false);
			});

			it('deve retornar false para undefined', () => {
				expect(isDatabaseID(undefined)).toBe(false);
			});

			it('deve retornar false para null', () => {
				expect(isDatabaseID(null)).toBe(false);
			});
		});
	});

	// =========================================================================
	// NanoIDRegex — Regex derivada do ambiente (IDENTIFIER_NANOID_ALPHABET + SIZE)
	// =========================================================================
	describe('NanoIDRegex (consistência com configuração)', () => {
		/**
		 * A regex é construída dinamicamente a partir do env:
		 * `^[${env.IDENTIFIER_NANOID_ALPHABET}]{${env.IDENTIFIER_NANOID_SIZE}}$`
		 *
		 * Este teste verifica que a regex resultante aceita o ID de referência
		 * que criamos manualmente. Se a configuração mudar, este teste quebra
		 * imediatamente — o que é desejável.
		 */
		it('deve corresponder ao NanoID de referência', () => {
			expect(NanoIDRegex().test(validNanoId)).toBe(true);
		});

		it('deve rejeitar string com comprimento diferente do configurado', () => {
			expect(NanoIDRegex().test('curto')).toBe(false);
		});
	});

	// =========================================================================
	// Regexes de validação — verificar que as constantes estão corretas
	// =========================================================================
	describe('regexValidationToIdentitySupported (constantes de regex)', () => {
		/**
		 * Verificamos que as regexes das constantes aceitam IDs de referência válidos.
		 * Isso serve como smoke test: se alguém alterar as regexes em env.constants.ts,
		 * estes testes quebram imediatamente e alertam para a mudança.
		 */
		it('regex uuidv7 deve aceitar o UUIDv7 de referência', () => {
			expect(regexValidationToIdentitySupported.uuidv7.test(validUuidV7)).toBe(true);
		});

		it('regex uuidv4 deve aceitar o UUIDv4 de referência', () => {
			expect(regexValidationToIdentitySupported.uuidv4.test(validUuidV4)).toBe(true);
		});

		it('regex uuidv7 deve rejeitar UUIDv4', () => {
			expect(regexValidationToIdentitySupported.uuidv7.test(validUuidV4)).toBe(false);
		});

		it('regex uuidv4 deve rejeitar UUIDv7', () => {
			expect(regexValidationToIdentitySupported.uuidv4.test(validUuidV7)).toBe(false);
		});
	});
});
