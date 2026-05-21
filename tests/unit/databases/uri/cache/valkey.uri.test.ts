/* eslint-disable @typescript-eslint/explicit-function-return-type */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { vi, describe, it, expect, beforeEach } from 'vitest';

/**
 * @fileoverview Testes do ValkeyConnectionString + BaseMemUri (Fase 4).
 *
 * ## Estratégia de Mock
 * O constructor de ValkeyConnectionString chama BaseMemUri.init() que chama
 * validateBaseEnv(). Este faz safeParse via Zod contra o objeto `env`.
 * O schema memEnvValidationSchema tem .refine() em MEM_DB_USERNAME e
 * MEM_DB_PASSWORD que rejeitam undefined — logo os campos opcionais
 * devem ser REMOVIDOS do objeto (não setados como undefined).
 *
 * Para contornar, usamos um helper `createCleanEnv()` que retorna o objeto
 * sem as chaves opcionais, e um `resetEnv()` que limpa e recria o mock.
 */

function createCleanEnv(overrides: Record<string, unknown> = {}): object {
	const base: Record<string, unknown> = {
		NODE_ENV: 'development',
		MEM_DB_TYPE: 'valkey',
		MEM_DB_PROTOCOL: 'valkey',
		MEM_DB_HOST: 'localhost',
		MEM_DB_PORT: 6379,
		MEM_DB_INDEX_OR_PATH: 0,
		MEM_DB_SENTINEL_MASTER_ID: '',
		MEM_DB_SENTINEL_USERNAME: '',
		// Campos obrigatórios da env geral (usados em imports transitivos)
		HASHER_PROVIDER: 'argon2',
		APP_NAME: 'Boilerplate_Test',
		APP_TIMEZONE: 'UTC',
		APP_LOCALE: 'pt-BR',
		PORT: 3000,
		EMAIL_TO_CONTACT: 'test@test.local',
		DATABASE_TYPE: 'mongodb',
		DATABASE_HOST: 'localhost',
		DATABASE_PORT: 27017,
		DATABASE_NAME: 'test_db',
		DATABASE_PASSWORD: 'TestDb@Pass123!',
		DATABASE_ID_DEFAULT: 'uuidv7',
		HASHER_LENGTH: 32,
		HASHER_SALT_LENGTH: 16,
		HASHER_PARALLELISM: 2,
		HASHER_TIME_COST: 3,
		HASHER_MEMORY_COST: 65536,
		HASHER_SECURITY_PEPPER: 'Test@Pepper123#Ficticio!456',
		IDENTIFIER_PATTERN: 'nanoid',
		IDENTIFIER_NANOID_ALPHABET: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_',
		IDENTIFIER_NANOID_SIZE: 21,
	};
	// NOTE: NÃO incluir MEM_DB_USERNAME, MEM_DB_PASSWORD, MEM_DB_SENTINEL_PASSWORD
	// quando são undefined. O schema Zod .optional().refine() rejeita undefined.
	return { ...base, ...overrides };
}

const mockEnv = vi.hoisted(() => {
	const obj: Record<string, unknown> = {
		NODE_ENV: 'development',
		MEM_DB_TYPE: 'valkey',
		MEM_DB_PROTOCOL: 'valkey',
		MEM_DB_HOST: 'localhost',
		MEM_DB_PORT: 6379,
		MEM_DB_INDEX_OR_PATH: 0,
		MEM_DB_SENTINEL_MASTER_ID: '',
		MEM_DB_SENTINEL_USERNAME: '',
		HASHER_PROVIDER: 'argon2',
		APP_NAME: 'Boilerplate_Test',
		APP_TIMEZONE: 'UTC',
		APP_LOCALE: 'pt-BR',
		PORT: 3000,
		EMAIL_TO_CONTACT: 'test@test.local',
		DATABASE_TYPE: 'mongodb',
		DATABASE_HOST: 'localhost',
		DATABASE_PORT: 27017,
		DATABASE_NAME: 'test_db',
		DATABASE_PASSWORD: 'TestDb@Pass123!',
		DATABASE_ID_DEFAULT: 'uuidv7',
		HASHER_LENGTH: 32,
		HASHER_SALT_LENGTH: 16,
		HASHER_PARALLELISM: 2,
		HASHER_TIME_COST: 3,
		HASHER_MEMORY_COST: 65536,
		HASHER_SECURITY_PEPPER: 'Test@Pepper123#Ficticio!456',
		IDENTIFIER_PATTERN: 'nanoid',
		IDENTIFIER_NANOID_ALPHABET: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_',
		IDENTIFIER_NANOID_SIZE: 21,
	};
	return obj;
});

vi.mock('@Configs/env.js', () => ({
	env: mockEnv,
}));

vi.mock('@Types/security.types.js', async (importOriginal) => {
	const actual = await importOriginal<typeof import('@Types/security.types.js')>();
	return {
		...actual,
		// eslint-disable-next-line @typescript-eslint/no-unused-vars
		assertsMemDatabaseURI: (uri: unknown, dbName: string) => {
			if (typeof uri === 'string' && (uri.startsWith('baddb://') || uri.includes('[invalid_ipv6'))) {
				throw new Error('Tentativa de validação de uri de banco de memória inválida');
			}
		},
	};
});

/**
 * Reseta o objeto mock limpando todas as chaves e aplicando valores padrão.
 * Isso garante que chaves opcionais como MEM_DB_USERNAME não existam
 * quando não explicitamente setadas.
 */
function resetEnv(overrides: Record<string, unknown> = {}): void {
	// Limpa todas as chaves existentes
	for (const key of Object.keys(mockEnv)) {
		// eslint-disable-next-line @typescript-eslint/no-dynamic-delete
		delete mockEnv[key];
	}
	// Aplica valores padrão + overrides
	Object.assign(mockEnv, createCleanEnv(overrides));
}

import { ValkeyConnectionString } from '@DbUri/cache/valkey.uri.js';

describe('ValkeyConnectionString + BaseMemUri (Black-Box)', () => {

	beforeEach(() => {
		resetEnv();
	});

	// TCP/IP sem credenciais

	describe('Development — TCP/IP sem credenciais', () => {
		it('deve instanciar e gerar URI valkey:// apontando para localhost', () => {
			const instance = new ValkeyConnectionString();
			const uri = instance.uri;

			expect(typeof uri).toBe('string');
			expect(uri).toContain('valkey://');
			expect(uri).toContain('localhost');
		});

		it('a URI deve conter o índice do banco padrão (/0)', () => {
			const instance = new ValkeyConnectionString();
			expect(instance.uri).toMatch(/\/0$/);
		});

		it('a URI não deve conter @ quando não há credenciais', () => {
			const instance = new ValkeyConnectionString();
			expect(instance.uri).not.toContain('@');
		});
	});

	// TCP/IP com credenciais

	describe('Development — TCP/IP com credenciais completas', () => {
		it('deve incluir username e password na URI', () => {
			resetEnv({
				MEM_DB_USERNAME: 'tst_api_rw_01_aB3dEf9xYz',
				MEM_DB_PASSWORD: 'Senh@Forte123!',
			});

			const instance = new ValkeyConnectionString();
			const uri = instance.uri;

			expect(uri).toContain('tst_api_rw_01_aB3dEf9xYz');
			expect(uri).toContain('@');
		});

		it('deve gerar auth somente com password (password-only)', () => {
			resetEnv({
				MEM_DB_PASSWORD: 'Senh@Forte123!',
			});

			const instance = new ValkeyConnectionString();
			const uri = instance.uri;

			expect(uri).toContain('@');
		});
	});

	// Fail-Fast: Guards ─

	describe('Fail-Fast — Guards de integridade', () => {
		it('deve lançar throw quando MEM_DB_TYPE não é valkey', () => {
			resetEnv({ MEM_DB_TYPE: 'redis' });

			expect(() => new ValkeyConnectionString()).toThrow(
				/Tentativa de formar ValkeyURI/
			);
		});
	});

	// Getter uri: idempotência
	describe('Getter uri — Idempotência', () => {
		it('deve retornar a mesma URI em chamadas consecutivas', () => {
			const instance = new ValkeyConnectionString();
			const first = instance.uri;
			const second = instance.uri;
			expect(first).toBe(second);
		});
	});

	// Índice customizado

	describe('Development — Índice customizado', () => {
		it('deve usar o índice especificado (ex: /3)', () => {
			resetEnv({ MEM_DB_INDEX_OR_PATH: 3 });

			const instance = new ValkeyConnectionString();
			expect(instance.uri).toMatch(/\/3$/);
		});
	});

	// Produção — TLS (valkeys://)
	describe('Produção — TLS (valkeys://)', () => {
		it('deve gerar URI valkeys:// para produção', () => {
			resetEnv({
				NODE_ENV: 'production',
				MEM_DB_PROTOCOL: 'valkeys',
				MEM_DB_USERNAME: 'prd_api_rw_01_aB3dEf9xYz',
				MEM_DB_PASSWORD: 'Senh@Forte123!',
				MEM_DB_HOST: 'cache.infra.internal',
				MEM_DB_PORT: 6380,
				MEM_DB_INDEX_OR_PATH: 0,
			});

			const instance = new ValkeyConnectionString();
			const uri = instance.uri;

			expect(uri).toContain('valkeys://');
			expect(uri).toContain('cache.infra.internal');
			expect(uri).toContain('6380');
		});
	});

	// Produção — Socket UDS ─

	describe('Produção — Socket UDS (valkey://)', () => {
		it('deve lançar throw para socket com protocolo TLS (valkeys)', () => {
			resetEnv({
				NODE_ENV: 'production',
				MEM_DB_TYPE: 'valkey',
				MEM_DB_PROTOCOL: 'valkeys',
				MEM_DB_INDEX_OR_PATH: '/tmp/valkey.sock',
				MEM_DB_USERNAME: 'prd_api_rw_01_aB3dEf9xYz',
				MEM_DB_PASSWORD: 'prd_password_secure',
			});
			expect(() => new ValkeyConnectionString()).toThrow();
		});

		it('deve gerar URI valkey:// apontando para um socket com credenciais em produção (bypass fs check via Object.create)', () => {
			const instance = Object.create(ValkeyConnectionString.prototype);
			const mockLogger = { fatal: vi.fn(), error: vi.fn(), warn: vi.fn(), info: vi.fn() };
			Object.assign(instance, { _internalLogger: mockLogger, _auth: 'prd_api_rw_01_aB3dEf9xYz:prd_password_secure@', dbName: 'valkey' });

			const uri = instance.generateUriProd({
				MEM_DB_PROTOCOL: 'valkey',
				MEM_DB_INDEX_OR_PATH: '/tmp/valkey.sock',
				MEM_DB_USERNAME: 'prd_api_rw_01_aB3dEf9xYz',
				MEM_DB_PASSWORD: 'prd_password_secure',
			});

			expect(uri).toBe('valkey://prd_api_rw_01_aB3dEf9xYz:prd_password_secure@/tmp/valkey.sock?maxRetriesPerRequest=3&enableReadyCheck=true');
			expect(mockLogger.info).toHaveBeenCalled();
		});
	});

	// Produção — Sentinel
	describe('Produção — Sentinel (valkey+sentinel://)', () => {
		it('deve gerar URI Sentinel com masterId', () => {
			resetEnv({
				NODE_ENV: 'production',
				MEM_DB_PROTOCOL: 'valkey+sentinel',
				MEM_DB_USERNAME: 'prd_api_rw_01_aB3dEf9xYz',
				MEM_DB_PASSWORD: 'Senh@Forte123!',
				MEM_DB_HOST: '10.0.0.1:26379,10.0.0.2:26379,10.0.0.3:26379',
				MEM_DB_PORT: 26379,
				MEM_DB_INDEX_OR_PATH: 0,
				MEM_DB_SENTINEL_MASTER_ID: 'mymaster',
			});

			const instance = new ValkeyConnectionString();
			const uri = instance.uri;

			expect(uri).toContain('valkey+sentinel://');
			expect(uri).toContain('sentinelMasterId=mymaster');
			expect(uri).toContain('10.0.0.1:26379');
		});

		it('deve gerar URI Sentinel com um único host (cobertura da branch isMultiHost = false)', () => {
			resetEnv({
				NODE_ENV: 'production',
				MEM_DB_PROTOCOL: 'valkey+sentinel',
				MEM_DB_USERNAME: 'prd_api_rw_01_aB3dEf9xYz',
				MEM_DB_PASSWORD: 'Senh@Forte123!',
				MEM_DB_HOST: '10.0.0.1',
				MEM_DB_PORT: 26379,
				MEM_DB_INDEX_OR_PATH: 0,
				MEM_DB_SENTINEL_MASTER_ID: 'mymaster',
			});

			const instance = new ValkeyConnectionString();
			const uri = instance.uri;

			expect(uri).toContain('valkey+sentinel://');
			expect(uri).toContain('10.0.0.1:26379');
		});

		it('deve incluir credenciais do Sentinel quando configuradas', () => {
			resetEnv({
				NODE_ENV: 'production',
				MEM_DB_PROTOCOL: 'valkey+sentinel',
				MEM_DB_USERNAME: 'prd_api_rw_01_aB3dEf9xYz',
				MEM_DB_PASSWORD: 'Senh@Forte123!',
				MEM_DB_HOST: '10.0.0.1:26379,10.0.0.2:26379',
				MEM_DB_PORT: 26379,
				MEM_DB_INDEX_OR_PATH: 0,
				MEM_DB_SENTINEL_MASTER_ID: 'mymaster',
				MEM_DB_SENTINEL_USERNAME: 'prd_sentinel_rw_01_xYzAbC123',
				MEM_DB_SENTINEL_PASSWORD: 'SentinelP@ss123!',
			});

			const instance = new ValkeyConnectionString();
			const uri = instance.uri;

			expect(uri).toContain('sentinelUsername=');
			expect(uri).toContain('sentinelPassword=');
		});

		it('deve lidar corretamente com Sentinel tendo apenas Username configurado (sem Password) (cobertura da branch line 185 = false)', () => {
			resetEnv({
				NODE_ENV: 'production',
				MEM_DB_PROTOCOL: 'valkey+sentinel',
				MEM_DB_USERNAME: 'prd_api_rw_01_aB3dEf9xYz',
				MEM_DB_PASSWORD: 'Senh@Forte123!',
				MEM_DB_HOST: '10.0.0.1:26379,10.0.0.2:26379',
				MEM_DB_PORT: 26379,
				MEM_DB_INDEX_OR_PATH: 0,
				MEM_DB_SENTINEL_MASTER_ID: 'mymaster',
				MEM_DB_SENTINEL_USERNAME: 'prd_sentinel_rw_01_xYzAbC123',
				// MEM_DB_SENTINEL_PASSWORD omitido
			});

			const instance = new ValkeyConnectionString();
			const uri = instance.uri;

			expect(uri).toContain('valkey+sentinel://');
			expect(uri).not.toContain('sentinelUsername=');
		});

		it('deve lançar throw para Sentinel sem masterId', () => {
			resetEnv({
				NODE_ENV: 'production',
				MEM_DB_PROTOCOL: 'valkey+sentinel',
				MEM_DB_USERNAME: 'prd_api_rw_01_aB3dEf9xYz',
				MEM_DB_PASSWORD: 'Senh@Forte123!',
				MEM_DB_HOST: '10.0.0.1:26379',
				MEM_DB_PORT: 26379,
				MEM_DB_INDEX_OR_PATH: 0,
				MEM_DB_SENTINEL_MASTER_ID: '',
			});

			expect(() => new ValkeyConnectionString()).toThrow(
				/MEM_DB_SENTINEL_MASTER_ID é obrigatória/
			);
		});
	});

	// Produção — Fail-Fast sem credenciais

	describe('Produção — Fail-Fast sem credenciais', () => {
		it('deve lançar throw em produção sem credenciais', () => {
			resetEnv({
				NODE_ENV: 'production',
				MEM_DB_PROTOCOL: 'valkeys',
				MEM_DB_HOST: 'cache.infra.internal',
				MEM_DB_PORT: 6380,
				MEM_DB_INDEX_OR_PATH: 0,
				// omitindo credenciais intencionalmente
			});

			expect(() => new ValkeyConnectionString()).toThrow(
				/Em produção adicione as credências/
			);
		});
	});

	// Produção — Protocolo plaintext proibido em TCP

	describe('Produção — Protocolo plaintext proibido em TCP', () => {
		it('deve lançar throw para valkey:// em produção via TCP (sem socket)', () => {
			resetEnv({
				NODE_ENV: 'production',
				MEM_DB_PROTOCOL: 'valkey',
				MEM_DB_USERNAME: 'prd_api_rw_01_aB3dEf9xYz',
				MEM_DB_PASSWORD: 'Senh@Forte123!',
				MEM_DB_HOST: 'cache.infra.internal',
				MEM_DB_PORT: 6380,
				MEM_DB_INDEX_OR_PATH: 0,
			});

			expect(() => new ValkeyConnectionString()).toThrow(
				/não deve ser Valkey em produção por motivos de segurança/
			);
		});
	});

	// -------------------------------------------------------------------------
	// ─── CENÁRIOS ESPECÍFICOS PARA 100% LINE COVERAGE (BLACK-BOX & BYPASS) ───
	// -------------------------------------------------------------------------

	describe('Development — UDS Socket & Auth Parcial', () => {
		it('deve gerar URI valkey:// apontando para um socket', () => {
			resetEnv({
				MEM_DB_INDEX_OR_PATH: '/var/run/valkey/valkey.sock',
			});
			const instance = new ValkeyConnectionString();
			expect(instance.uri).toContain('valkey:///var/run/valkey/valkey.sock');
		});

		it('deve gerar auth apenas com username (sem password)', () => {
			resetEnv({
				MEM_DB_USERNAME: 'tst_api_rw_01_aB3dEf9xYz',
			});
			const instance = new ValkeyConnectionString();
			expect(instance.uri).toContain('tst_api_rw_01_aB3dEf9xYz:@localhost');
		});
	});

	describe('Defense-in-Depth / Dead-Code (Bypass via Object.create)', () => {
		/**
		 * Para testar as linhas de erro fatal dentro de guardBroken e métodos
		 * protegidos que nunca seriam alcançadas normalmente porque a validação
		 * Zod (BaseMemUri) aborta antes.
		 */
		const mockLogger = { fatal: vi.fn(), error: vi.fn(), warn: vi.fn(), info: vi.fn() };

		it('deve disparar fatal se _baseEnvMemDb for nulo no guardBroken', () => {
			const instance = Object.create(ValkeyConnectionString.prototype);
			Object.assign(instance, { _internalLogger: mockLogger, dbName: 'valkey' });
			expect(() => instance.guardBroken()).toThrow(/Algo deu errado ao instânciar/);
		});

		it('deve disparar fatal se MEM_DB_PASSWORD não for string', () => {
			const instance = Object.create(ValkeyConnectionString.prototype);
			Object.assign(instance, { _internalLogger: mockLogger, dbName: 'valkey', _baseEnvMemDb: { MEM_DB_TYPE: 'valkey', MEM_DB_PASSWORD: 123 } });
			expect(() => instance.guardBroken()).toThrow(/A senha deve ser obrigatóriamente uma string/);
		});

		it('deve disparar fatal se MEM_DB_USERNAME não for string', () => {
			const instance = Object.create(ValkeyConnectionString.prototype);
			Object.assign(instance, { _internalLogger: mockLogger, dbName: 'valkey', _baseEnvMemDb: { MEM_DB_TYPE: 'valkey', MEM_DB_USERNAME: 123 } });
			expect(() => instance.guardBroken()).toThrow(/Username do banco de dados deve ser obrigatóriamente uma string/);
		});

		it('deve disparar fatal se generateUriDev for chamado sem auth', () => {
			const instance = Object.create(ValkeyConnectionString.prototype);
			Object.assign(instance, { _internalLogger: mockLogger, dbName: 'valkey' });
			expect(() => instance.generateUriDev({ MEM_DB_PROTOCOL: 'valkey', MEM_DB_HOST: 'lh', MEM_DB_PORT: 6379, MEM_DB_INDEX_OR_PATH: 0 }))
				.toThrow(/Tentativa de maculação ou alteração de credências/);
		});

		it('deve disparar fatal se generateUriProd for chamado sem auth', () => {
			const instance = Object.create(ValkeyConnectionString.prototype);
			Object.assign(instance, { _internalLogger: mockLogger, dbName: 'valkey' });
			expect(() => instance.generateUriProd({ MEM_DB_PROTOCOL: 'valkeys', MEM_DB_HOST: 'lh', MEM_DB_PORT: 6379, MEM_DB_INDEX_OR_PATH: 0 }))
				.toThrow(/Tentativa de criar String de conexão para valkey sem credências/);
		});

		it('deve disparar fatal em generateUriProd se socketPath não tiver protocolo valkey', () => {
			const instance = Object.create(ValkeyConnectionString.prototype);
			Object.assign(instance, { _internalLogger: mockLogger, _auth: 'user:pass@' });
			// simulando que passou pelos primeiros checks de prod
			expect(() => instance.generateUriProd({ MEM_DB_PROTOCOL: 'valkeys', MEM_DB_INDEX_OR_PATH: '/tmp/sock' }))
				.toThrow(/conexão via socket com protocolo inválido/);
		});

		it('deve disparar fatal em generateUriProd se Sentinel tiver path de socket (string)', () => {
			const instance = Object.create(ValkeyConnectionString.prototype);
			Object.assign(instance, { _internalLogger: mockLogger, _auth: 'user:pass@' });
			expect(() => instance.generateUriProd({ MEM_DB_PROTOCOL: 'valkey+sentinel', MEM_DB_INDEX_OR_PATH: [] }))
				.toThrow(/TLS em prod com index invalido/);
		});

		it('deve disparar fatal em generateUriProd se valkeys tiver path de socket (string)', () => {
			const instance = Object.create(ValkeyConnectionString.prototype);
			Object.assign(instance, { _internalLogger: mockLogger, _auth: 'user:pass@' });
			expect(() => instance.generateUriProd({ MEM_DB_PROTOCOL: 'valkeys', MEM_DB_INDEX_OR_PATH: [], MEM_DB_HOST: 'lh', MEM_DB_PORT: 6379 }))
				.toThrow(/TLS em prod com index invalido/);
		});

		it('deve capturar falha no catch de generateUriDev se string for inválida e falhar assert', () => {
			const instance = Object.create(ValkeyConnectionString.prototype);
			Object.assign(instance, { _internalLogger: mockLogger, _auth: 'user:pass@', dbName: 'valkey' });
			// protocolo inválido para forçar falha no regex do assert final
			expect(() => instance.generateUriDev({ MEM_DB_PROTOCOL: 'baddb', MEM_DB_INDEX_OR_PATH: 0, MEM_DB_HOST: 'lh', MEM_DB_PORT: 6379 }))
				.toThrow(/não é valida para banco de dados/);
		});

		it('deve capturar falha no catch de generateUriProd se string for inválida e falhar assert', () => {
			const instance = Object.create(ValkeyConnectionString.prototype);
			Object.assign(instance, { _internalLogger: mockLogger, _auth: 'user:pass@', dbName: 'valkey' });
			// bypass initial checks by providing valkeys, but make host fail regex
			expect(() => instance.generateUriProd({ MEM_DB_PROTOCOL: 'valkeys', MEM_DB_INDEX_OR_PATH: 0, MEM_DB_HOST: '[invalid_ipv6', MEM_DB_PORT: 6379 }))
				.toThrow(/não é valida para banco de dados/);
		});

		it('deve disparar fatal em generateUriDev se a memória for alterada em runtime e candidateUri ficar vazia', () => {
			const instance = Object.create(ValkeyConnectionString.prototype);
			Object.assign(instance, { _internalLogger: mockLogger, _auth: 'user:pass@', dbName: 'valkey' });
			// Simulamos a injeção de memória onde o campo candidateUri se recusa a ser populado corretamente
			Object.defineProperty(instance, 'candidateUri', {
				get: () => '',
				set: () => { /* ignora o set para manter vazio */ }
			});
			expect(() => instance.generateUriDev({ MEM_DB_PROTOCOL: 'valkey', MEM_DB_INDEX_OR_PATH: 0, MEM_DB_HOST: 'lh', MEM_DB_PORT: 6379 }))
				.toThrow(/não é valida para banco de dados/);
		});

		it('deve disparar fatal em generateUriProd se a memória for alterada em runtime e candidateUri ficar vazia', () => {
			const instance = Object.create(ValkeyConnectionString.prototype);
			Object.assign(instance, { _internalLogger: mockLogger, _auth: 'user:pass@', dbName: 'valkey' });
			// Simulamos a injeção de memória onde o campo candidateUri se recusa a ser populado corretamente
			Object.defineProperty(instance, 'candidateUri', {
				get: () => '',
				set: () => { /* ignora o set para manter vazio */ }
			});
			expect(() => instance.generateUriProd({ MEM_DB_PROTOCOL: 'valkeys', MEM_DB_INDEX_OR_PATH: 0, MEM_DB_HOST: 'localhost', MEM_DB_PORT: 6379 }))
				.toThrow(/não é valida para banco de dados/);
		});

		it('deve disparar fatal se generateUriDev for chamado com auth igual a null (cobertura de branch do ternary na linha 214)', () => {
			const instance = Object.create(ValkeyConnectionString.prototype);
			Object.assign(instance, { _internalLogger: mockLogger, dbName: 'valkey', _auth: null });
			expect(() => instance.generateUriDev({ MEM_DB_PROTOCOL: 'valkey', MEM_DB_HOST: 'lh', MEM_DB_PORT: 6379, MEM_DB_INDEX_OR_PATH: 0 }))
				.toThrow(/Tentativa de maculação ou alteração de credências/);
		});

		it('deve disparar fatal se generateUriProd for chamado com auth sendo um número (não string) (cobertura de branch do ternary na linha 274)', () => {
			const instance = Object.create(ValkeyConnectionString.prototype);
			Object.assign(instance, { _internalLogger: mockLogger, dbName: 'valkey', _auth: 123 });
			expect(() => instance.generateUriProd({ MEM_DB_PROTOCOL: 'valkeys', MEM_DB_HOST: 'lh', MEM_DB_PORT: 6379, MEM_DB_INDEX_OR_PATH: 0 }))
				.toThrow(/Tentativa de criar String de conexão para valkey sem credências/);
		});
	});
});
