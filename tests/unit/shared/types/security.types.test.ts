/**
 * @fileoverview Testes dos Type Guards de Segurança — `security.types.ts`.
 *
 * ## Mapa do que é testado
 *
 * Este arquivo contém 3 funções de validação runtime, cada uma sendo uma
 * "fronteira de segurança" que impede que tipos incompatíveis circulem
 * pelo sistema como se fossem válidos:
 *
 * ### `isHashedString(rawValue)`
 * Valida se uma string corresponde ao formato do algoritmo de hash configurado.
 * Configurado via `env.HASHER_PROVIDER` (argon2 ou bcrypt).
 * Em nosso `.env.test`, `HASHER_PROVIDER=argon2`.
 *
 * ### `isValidUri(uri)`
 * Valida se uma string é uma URL semanticamente válida via `new URL(uri)`.
 * Pura — não depende de env.
 *
 * ### `isDatabaseUri(uri)`
 * Valida se a URI além de ser válida usa protocolos aceitos pela aplicação
 * (mongodb, mongodb+srv, postgres, postgresql).
 *
 * ## Nota sobre `HashedString` e Brand Types
 * O tipo `Brand<string, 'HashedString'>` é verificado em compile-time pelo TS.
 * O runtime não sabe que uma string é `HashedString` — apenas `isHashedString()`
 * faz essa verificação. Portanto, testar as funções de guarda É testar o Brand Type.
 *
 * ## Por que vi.mock aqui?
 * `security.types.ts` importa `env.ts` no nível de módulo.
 * O `env.ts` chama `process.exit(1)` se as variáveis Zod falharem — isso acontece
 * antes de qualquer teste rodar. `vi.mock()` é hoistado pelo Vitest acima de
 * qualquer import, substituindo `env.ts` por um objeto controlado e seguro.
 *
 * @see {@link src/shared/types/security.types.ts}
 * @see {@link src/configs/constants/env.constants.ts} — regexes dos hashes
 */
import { vi, describe, it, expect } from 'vitest';

/**
 * Mock de env.ts — fornece apenas HASHER_PROVIDER que security.types.ts consome.
 * Usar `vi.mock` com factory garante que o módulo mockado está disponível
 * antes mesmo do import de `security.types.ts` ser processado.
 */
vi.mock('@Configs/env.js', () => ({
	env: {
		HASHER_PROVIDER: 'argon2',
	},
}));

import { isHashedString, isValidUri, isDatabaseUri, isMemDatabaseUri } from '@Types/security.types.js';

describe('security.types', () => {
	// =========================================================================
	// isHashedString — Fronteira contra senhas em texto puro
	// =========================================================================
	describe('isHashedString', () => {
		/**
		 * Contexto: .env.test define HASHER_PROVIDER=argon2.
		 * Portanto `isHashedString` usa a regex de Argon2 neste ambiente.
		 *
		 * Formato Argon2id válido (PHC String Format):
		 * $argon2id$v=19$m=65536,t=3,p=4$<salt_base64>$<hash_base64>
		 */
		describe('com HASHER_PROVIDER=argon2 (.env.test)', () => {
			/**
			 * Hash Argon2id no formato PHC exato.
			 * Gerado manualmente para representar output real do provider.
			 */
			it('deve aceitar hash Argon2id no formato PHC válido', () => {
				const validArgon2Hash =
					'$argon2id$v=19$m=65536,t=3,p=4$c2FsdHNhbHRzYWx0c2FsdA$hashhashhashhashhashhash';

				expect(isHashedString(validArgon2Hash)).toBe(true);
			});

			/**
			 * Variações do Argon2 (argon2i e argon2d além do argon2id) são aceitas pela regex.
			 * O boilerplate usa argon2id por padrão mas o guard aceita qualquer variante.
			 */
			it('deve aceitar hash argon2i (variante do Argon2)', () => {
				const argon2iHash =
					'$argon2i$v=19$m=65536,t=3,p=4$c2FsdHNhbHRzYWx0c2FsdA$hashhashhashhashhashhash';

				expect(isHashedString(argon2iHash)).toBe(true);
			});

			/**
			 * 🔒 Senha em texto puro nunca deve ser aceita como HashedString.
			 * Esta é a garantia central do tipo — impede que senhas circulem sem hash.
			 */
			it('deve rejeitar senha em texto puro', () => {
				expect(isHashedString('minha_senha_123')).toBe(false);
			});

			/**
			 * 🔒 Hash Bcrypt não passa na regex Argon2 — providers são incompatíveis.
			 * Se alguém trocar o HASHER_PROVIDER sem migrar os hashes, isso detectaria.
			 */
			it('deve rejeitar hash Bcrypt quando provider é argon2', () => {
				const bcryptHash = '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/lewKyBAzMCLGu8OBu';

				expect(isHashedString(bcryptHash)).toBe(false);
			});

			/**
			 * String vazia não é hash válido.
			 */
			it('deve rejeitar string vazia', () => {
				expect(isHashedString('')).toBe(false);
			});
		});

		// -----------------------------------------------------------------------
		// Falhas de tipo (runtime safety)
		// -----------------------------------------------------------------------
		describe('quando o valor não é uma string', () => {
			/**
			 * O guard verifica `typeof rawValue !== 'string'` antes da regex.
			 * Isso é necessário porque TypeScript é apagado em runtime —
			 * qualquer `unknown` de API pode chegar aqui.
			 */
			it('deve retornar false para número', () => {
				expect(isHashedString(42 as unknown)).toBe(false);
			});

			it('deve retornar false para undefined', () => {
				expect(isHashedString(undefined)).toBe(false);
			});

			it('deve retornar false para null', () => {
				expect(isHashedString(null)).toBe(false);
			});

			it('deve retornar false para objeto', () => {
				expect(isHashedString({ hash: 'valor' })).toBe(false);
			});
		});
	});

	// =========================================================================
	// isValidUri — Fronteira contra strings malformadas em campos de URL
	// =========================================================================
	describe('isValidUri', () => {
		/**
		 * URLs completamente formadas devem ser aceitas.
		 */
		it('deve aceitar URL HTTP válida', () => {
			expect(isValidUri('http://example.com')).toBe(true);
		});

		it('deve aceitar URL HTTPS válida', () => {
			expect(isValidUri('https://api.example.com/v1/users')).toBe(true);
		});

		it('deve aceitar URI MongoDB válida', () => {
			expect(isValidUri('mongodb://localhost:27017/mydb')).toBe(true);
		});

		it('deve aceitar URI MongoDB+SRV válida', () => {
			expect(isValidUri('mongodb+srv://user:pass@cluster.mongodb.net/db')).toBe(true);
		});

		/**
		 * Strings sem protocolo reconhecido não são URIs válidas.
		 * NOTA: `new URL('localhost:27017')` é considerada VÁLIDA pelo Node.js
		 * (trata 'localhost' como protocolo e '27017' como pathname).
		 * Usamos strings genuinamente mal-formadas para testar a rejeição.
		 */
		it('deve rejeitar string textual sem estrutura de URL', () => {
			expect(isValidUri('nao-e-uma-url-valida')).toBe(false);
		});

		it('deve rejeitar string arbitrária', () => {
			expect(isValidUri('isso nao e uma uri')).toBe(false);
		});

		it('deve rejeitar string vazia', () => {
			expect(isValidUri('')).toBe(false);
		});

		/**
		 * O guard verifica `typeof uri !== 'string'` antes de tentar `new URL()`.
		 */
		it('deve retornar false para tipos não-string', () => {
			expect(isValidUri(null)).toBe(false);
			expect(isValidUri(undefined)).toBe(false);
			expect(isValidUri(42)).toBe(false);
		});
	});

	// =========================================================================
	// isDatabaseUri — Fronteira contra protocolos de banco não autorizados
	// =========================================================================
	describe('isDatabaseUri', () => {
		/**
		 * Protocolos autorizados: mongodb, mongodb+srv, postgres, postgresql.
		 */
		it('deve aceitar URI com protocolo mongodb', () => {
			expect(isDatabaseUri('mongodb://localhost:27017/db')).toBe(true);
		});

		it('deve aceitar URI com protocolo mongodb+srv', () => {
			expect(isDatabaseUri('mongodb+srv://user:pass@host.mongodb.net/db')).toBe(true);
		});

		it('deve aceitar URI com protocolo postgres', () => {
			expect(isDatabaseUri('postgres://localhost:5432/mydb')).toBe(true);
		});

		it('deve aceitar URI com protocolo postgresql', () => {
			expect(isDatabaseUri('postgresql://user:pass@localhost:5432/mydb')).toBe(true);
		});

		/**
		 * 🔒 Protocolos não autorizados devem ser rejeitados.
		 * Alguém tentando injetar uma URI Redis, MySQL ou HTTP não autorizado
		 * seria bloqueado aqui antes de qualquer tentativa de conexão.
		 */
		it('deve rejeitar URI com protocolo redis (não autorizado)', () => {
			expect(isDatabaseUri('redis://localhost:6379')).toBe(false);
		});

		it('deve rejeitar URI com protocolo mysql (não autorizado)', () => {
			expect(isDatabaseUri('mysql://localhost:3306/db')).toBe(false);
		});

		it('deve rejeitar URI HTTP (não é banco de dados)', () => {
			expect(isDatabaseUri('https://example.com')).toBe(false);
		});

		/**
		 * URI inválida (sem protocolo) deve ser rejeitada pela camada `isValidUri`
		 * antes mesmo de chegar na checagem de protocolo.
		 */
		it('deve rejeitar string inválida como URI', () => {
			expect(isDatabaseUri('nao-e-uma-uri')).toBe(false);
		});

		it('deve rejeitar string vazia', () => {
			expect(isDatabaseUri('')).toBe(false);
		});
	});

	// isMemDatabaseUri — Fronteira contra protocolos in-memory
	describe('isMemDatabaseUri', () => {
		it('deve aceitar URI com protocolo redis', () => {
			expect(isMemDatabaseUri('redis://localhost:6379')).toBe(true);
		});

		it('deve aceitar URI com protocolo rediss (seguro)', () => {
			expect(isMemDatabaseUri('rediss://user:pass@host.cache.net:6379')).toBe(true);
		});

		it('deve aceitar URI com protocolo valkey', () => {
			expect(isMemDatabaseUri('valkey://localhost:6379')).toBe(true);
		});

		it('deve aceitar URI com protocolo valkeys (seguro)', () => {
			expect(isMemDatabaseUri('valkeys://user:pass@host.cache.net:6379')).toBe(true);
		});

		it('deve rejeitar URI com protocolo mongodb (não autorizado)', () => {
			expect(isMemDatabaseUri('mongodb://localhost:27017/db')).toBe(false);
		});

		it('deve rejeitar URI HTTP (não é banco em memória)', () => {
			expect(isMemDatabaseUri('https://example.com')).toBe(false);
		});

		it('deve rejeitar string inválida como URI', () => {
			expect(isMemDatabaseUri('nao-e-uma-uri')).toBe(false);
		});

		it('deve rejeitar para valor não nulo ou incorreto (typeof fails)', () => {
			expect(isMemDatabaseUri(null)).toBe(false);
			expect(isMemDatabaseUri(undefined)).toBe(false);
		});
	});
});
