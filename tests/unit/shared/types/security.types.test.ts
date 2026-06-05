/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
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
import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest';

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

import { env } from '@Configs/env.js';

import {
	isHashedString,
	isValidUri,
	isDatabaseUri,
	isMemDatabaseUri,
	isDatabaseUsername,
	assertsDatabaseUsername,
	assertsMemDatabaseURI,
	isValidCryptoKey,
	assertsValidCryptoKey,
} from '@Types/security.types.js';
import {
	validDbUsername,
	validTcpUri,
	validCryptographyKeys,
	invalidCryptographyKeys,
} from '@tests/helpers/mocks/test.fixtures.js';

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

				expect(isHashedString(validArgon2Hash, env.HASHER_PROVIDER)).toBe(true);
			});

			/**
			 * Variações do Argon2 (argon2i e argon2d além do argon2id) são aceitas pela regex.
			 * O boilerplate usa argon2id por padrão mas o guard aceita qualquer variante.
			 */
			it('deve aceitar hash argon2i (variante do Argon2)', () => {
				const argon2iHash =
					'$argon2i$v=19$m=65536,t=3,p=4$c2FsdHNhbHRzYWx0c2FsdA$hashhashhashhashhashhash';

				expect(isHashedString(argon2iHash, env.HASHER_PROVIDER)).toBe(true);
			});

			/**
			 * 🔒 Senha em texto puro nunca deve ser aceita como HashedString.
			 * Esta é a garantia central do tipo — impede que senhas circulem sem hash.
			 */
			it('deve rejeitar senha em texto puro', () => {
				expect(isHashedString('minha_senha_123', env.HASHER_PROVIDER)).toBe(false);
			});

			/**
			 * 🔒 Hash Bcrypt não passa na regex Argon2 — providers são incompatíveis.
			 * Se alguém trocar o HASHER_PROVIDER sem migrar os hashes, isso detectaria.
			 */
			it('deve rejeitar hash Bcrypt quando provider é argon2', () => {
				const bcryptHash = '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/lewKyBAzMCLGu8OBu';

				expect(isHashedString(bcryptHash, env.HASHER_PROVIDER)).toBe(false);
			});

			/**
			 * String vazia não é hash válido.
			 */
			it('deve rejeitar string vazia', () => {
				expect(isHashedString('', env.HASHER_PROVIDER)).toBe(false);
			});
		});

		describe('quando configurado para bcrypt (env.HASHER_PROVIDER = "bcrypt")', () => {
			let originalProvider: typeof env.HASHER_PROVIDER;

			beforeEach(() => {
				originalProvider = env.HASHER_PROVIDER;
				env.HASHER_PROVIDER = 'bcrypt' as any;
			});

			afterEach(() => {
				env.HASHER_PROVIDER = originalProvider;
			});

			it('deve aceitar hash bcrypt válido', () => {
				const bcryptHash = '$2b$12$NqL7n20QnK2Qz1K1H4d5kO7T3tN0/v4PZzQ1pC3W5H6Q8G9X2U0L.';
				expect(isHashedString(bcryptHash, env.HASHER_PROVIDER)).toBe(true);
			});

			it('deve rejeitar hash argon2 (incompatível com a env configurada)', () => {
				const argon2Hash = '$argon2id$v=19$m=65536,t=3,p=4$R1hS2A7b9C3d4E5f$W8x9Y0z1A2b3C4d5E6f7G8h9I0j1K2l3M4n5O6p7Q8r9';
				expect(isHashedString(argon2Hash, env.HASHER_PROVIDER)).toBe(false);
			});
		});

		describe('quando configurado com provedor desconhecido (fallback default)', () => {
			let originalProvider: typeof env.HASHER_PROVIDER;

			beforeEach(() => {
				originalProvider = env.HASHER_PROVIDER;
				env.HASHER_PROVIDER = 'md5' as any;
			});

			afterEach(() => {
				env.HASHER_PROVIDER = originalProvider;
			});

			it('deve retornar false para qualquer string, já que não é suportado', () => {
				const anyString = '$argon2id$v=19$m=65536,t=3,p=4$R1hS2A7b9C3d4E5f$W8x9Y0z1A2b3C4d5E6f7G8h9I0j1K2l3M4n5O6p7Q8r9';
				expect(isHashedString(anyString, env.HASHER_PROVIDER)).toBe(false);
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
				expect(isHashedString(42 as unknown, env.HASHER_PROVIDER)).toBe(false);
			});

			it('deve retornar false para undefined', () => {
				expect(isHashedString(undefined, env.HASHER_PROVIDER)).toBe(false);
			});

			it('deve retornar false para null', () => {
				expect(isHashedString(null, env.HASHER_PROVIDER)).toBe(false);
			});

			it('deve retornar false para objeto', () => {
				expect(isHashedString({ hash: 'valor' }, env.HASHER_PROVIDER)).toBe(false);
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

	// =========================================================================
	// isDatabaseUsername — Fronteira contra usernames fora da morfologia
	// =========================================================================
	describe('isDatabaseUsername', () => {
		it('deve retornar true para username com morfologia válida', () => {
			expect(isDatabaseUsername(validDbUsername, 'valkey')).toBe(true);
		});

		it('deve retornar false para username com morfologia inválida', () => {
			expect(isDatabaseUsername('admin', 'valkey')).toBe(false);
		});

		it('deve retornar false para valor não-string', () => {
			expect(isDatabaseUsername(123, 'valkey')).toBe(false);
		});

		it('deve retornar false para null', () => {
			expect(isDatabaseUsername(null, 'valkey')).toBe(false);
		});

		it('deve retornar false para string vazia', () => {
			expect(isDatabaseUsername('', 'valkey')).toBe(false);
		});
	});

	// =========================================================================
	// assertsDatabaseUsername — Fail-Fast para username inválido
	// =========================================================================
	describe('assertsDatabaseUsername', () => {
		it('não deve lançar throw para username válido', () => {
			expect(() => {
				assertsDatabaseUsername(validDbUsername, 'valkey');
			}).not.toThrow();
		});

		it('deve lançar throw para username com morfologia inválida', () => {
			expect(() => {
				assertsDatabaseUsername('admin', 'valkey');
			}).toThrow('A morfologia do username foi violada. Execução abortada por segurança.');
		});

		it('deve lançar throw para valor null', () => {
			expect(() => {
				assertsDatabaseUsername(null, 'valkey');
			}).toThrow();
		});
	});

	// =========================================================================
	// isMemDatabaseUri — Fronteira contra protocolos in-memory
	// =========================================================================
	describe('isMemDatabaseUri', () => {
		it('deve aceitar URI com protocolo redis', () => {
			expect(isMemDatabaseUri('redis://localhost:6379', 'redis')).toBe(true);
		});

		it('deve aceitar URI com protocolo rediss (seguro)', () => {
			expect(isMemDatabaseUri('rediss://localhost:6379', 'redis')).toBe(true);
		});

		it('deve aceitar URI com protocolo valkey', () => {
			expect(isMemDatabaseUri(validTcpUri, 'valkey')).toBe(true);
		});

		it('deve aceitar URI com protocolo valkeys (seguro)', () => {
			expect(isMemDatabaseUri('valkeys://localhost:6379', 'valkey')).toBe(true);
		});

		it('deve rejeitar URI com protocolo mongodb (não autorizado)', () => {
			expect(isMemDatabaseUri('mongodb://localhost:27017/db', 'valkey')).toBe(false);
		});

		it('deve rejeitar URI HTTP (não é banco em memória)', () => {
			expect(isMemDatabaseUri('https://example.com', 'valkey')).toBe(false);
		});

		it('deve rejeitar string inválida como URI', () => {
			expect(isMemDatabaseUri('nao-e-uma-uri', 'valkey')).toBe(false);
		});

		it('deve rejeitar para valor não nulo ou incorreto (typeof fails)', () => {
			expect(isMemDatabaseUri(null, 'valkey')).toBe(false);
			expect(isMemDatabaseUri(undefined, 'valkey')).toBe(false);
		});
	});

	// =========================================================================
	// assertsMemDatabaseURI — Fail-Fast para URI de banco em memória inválida
	// =========================================================================
	describe('assertsMemDatabaseURI', () => {
		it('não deve lançar throw para URI valkey válida', () => {
			expect(() => {
				assertsMemDatabaseURI(validTcpUri, 'valkey');
			}).not.toThrow();
		});

		it('deve lançar throw para URI com protocolo não aceito', () => {
			expect(() => {
				assertsMemDatabaseURI('http://localhost:6379', 'valkey');
			}).toThrow('Tentativa de validação de uri de banco de memória inválida');
		});

		it('deve lançar throw para string inválida', () => {
			expect(() => {
				assertsMemDatabaseURI('nao-e-uri', 'valkey');
			}).toThrow();
		});

		it('deve lançar throw para valor null', () => {
			expect(() => {
				assertsMemDatabaseURI(null, 'valkey');
			}).toThrow();
		});
	});

	// =========================================================================
	// isValidCryptoKey & assertsValidCryptoKey — Fronteira de Entropia de Chaves
	// =========================================================================
	describe('isValidCryptoKey', () => {
		it('deve aceitar chave hexadecimal de alta entropia válida', () => {
			expect(isValidCryptoKey(validCryptographyKeys.hex)).toBe(true);
		});

		it('deve aceitar chave base64 de alta entropia válida', () => {
			expect(isValidCryptoKey(validCryptographyKeys.base64)).toBe(true);
		});

		it('deve aceitar chave base32 de alta entropia válida', () => {
			expect(isValidCryptoKey(validCryptographyKeys.base32)).toBe(true);
		});

		it('deve aceitar chave base58 de alta entropia válida', () => {
			expect(isValidCryptoKey(validCryptographyKeys.base58)).toBe(true);
		});

		it('deve rejeitar chave hexadecimal curta', () => {
			expect(isValidCryptoKey(invalidCryptographyKeys.hexTooShort)).toBe(false);
		});

		it('deve rejeitar chave base64 curta', () => {
			expect(isValidCryptoKey(invalidCryptographyKeys.base64TooShort)).toBe(false);
		});

		it('deve rejeitar chave base58 com caracteres inválidos', () => {
			expect(isValidCryptoKey(invalidCryptographyKeys.base58BadChars)).toBe(false);
		});

		it('deve retornar false para tipos não-string', () => {
			expect(isValidCryptoKey(42)).toBe(false);
			expect(isValidCryptoKey(null)).toBe(false);
			expect(isValidCryptoKey(undefined)).toBe(false);
		});
	});

	describe('assertsValidCryptoKey', () => {
		it('não deve lançar throw para chave válida', () => {
			expect(() => {
				assertsValidCryptoKey(validCryptographyKeys.hex);
			}).not.toThrow();
		});

		it('deve lançar throw para chave inválida', () => {
			expect(() => {
				assertsValidCryptoKey(invalidCryptographyKeys.hexTooShort);
			}).toThrow('A chave de seguraÇa é inválida processo abortado, entre em contato com a equipe;');
		});

		it('deve lançar throw para valor não-string', () => {
			expect(() => {
				assertsValidCryptoKey(null);
			}).toThrow();
		});
	});
});
