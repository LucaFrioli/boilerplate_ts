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

import { ValkeyConnectionString } from '@/databases/uri/valkey.uri.js';

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
				MEM_DB_PROTOCOL: 'valkeys',
				MEM_DB_USERNAME: 'prd_api_rw_01_aB3dEf9xYz',
				MEM_DB_PASSWORD: 'Senh@Forte123!',
				MEM_DB_INDEX_OR_PATH: '/var/run/valkey/valkey.sock',
			});

			expect(() => new ValkeyConnectionString()).toThrow(
				/socket com protocolo inválido/
			);
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

	// Produção — Fail-Fast: sem credenciais ─

	describe('Produção — Fail-Fast sem credenciais', () => {
		it('deve lançar throw em produção sem credenciais', () => {
			resetEnv({
				NODE_ENV: 'production',
				MEM_DB_PROTOCOL: 'valkeys',
			});

			expect(() => new ValkeyConnectionString()).toThrow(
				/produção adicione as credências/
			);
		});
	});

	// Produção — Protocolo plaintext proibido em TCP ─

	describe('Produção — Protocolo plaintext proibido em TCP', () => {
		it('deve lançar throw para valkey:// em produção via TCP (sem socket)', () => {
			resetEnv({
				NODE_ENV: 'production',
				MEM_DB_PROTOCOL: 'valkey',
				MEM_DB_USERNAME: 'prd_api_rw_01_aB3dEf9xYz',
				MEM_DB_PASSWORD: 'Senh@Forte123!',
				MEM_DB_INDEX_OR_PATH: 0, // numérico = TCP, não socket
			});

			// valkey + TCP(numérico) em produção → proibido
			expect(() => new ValkeyConnectionString()).toThrow();
		});
	});
});
