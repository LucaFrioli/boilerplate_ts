/* eslint-disable @typescript-eslint/unbound-method */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

describe('configs/env.ts', () => {
	let originalEnv: NodeJS.ProcessEnv;

	beforeEach(() => {
		// Salva o env original para restaurar depois
		originalEnv = { ...process.env };

		// Limpa o ambiente atual para evitar vazamentos de variáveis locais (.env)
		for (const key in process.env) {
			// eslint-disable-next-line @typescript-eslint/no-dynamic-delete
			delete process.env[key];
		}

		// Injetamos um processo 100% sadio para o Happy Path garantido
		process.env.APP_NAME = 'Boilerplate_Test_Env';
		process.env.NODE_ENV = 'test';
		process.env.EMAIL_TO_CONTACT = 'admin@admin.com';

		// Database (Obrigatórios no schema)
		process.env.DATABASE_TYPE = 'mongodb';
		process.env.DATABASE_PORT = '27017';
		process.env.DATABASE_NAME = 'test_db';
		process.env.DATABASE_PASSWORD = 'SuperStrongP@ssw0rd!2026';

		// MemDB
		process.env.MEM_DB_PASSWORD = 'SuperStrongP@ssw0rd!2026';

		process.env.HASHER_PROVIDER = 'argon2';
		// Password super forte para passar no passwordStrength (uppercase, lowercase, number, special char, > 20 chars)
		process.env.HASHER_SECURITY_PEPPER = 'SuperStrongP@ssw0rd!2026-Ficticio';
		process.env.HASHER_LENGTH = '32';
		process.env.HASHER_SALT_LENGTH = '16';
		process.env.HASHER_PARALLELISM = '2';
		process.env.HASHER_TIME_COST = '3';
		process.env.HASHER_MEMORY_COST = '65536';
		process.env.IDENTIFIER_PATTERN = 'nanoid';
		process.env.IDENTIFIER_NANOID_ALPHABET =
			'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
		process.env.IDENTIFIER_NANOID_SIZE = '21';
		process.env.DATABASE_ID_DEFAULT = 'uuidv7';


		process.env.MEM_DB_TYPE= 'valkey';
		process.env.MEM_DB_PROTOCOL = 'valkey';
		process.env.MEM_DB_HOST = 'localhost';
		process.env.MEM_DB_PORT = '6379';
		process.env.MEM_DB_USERNAME = 'testeUname';
		process.env.MEM_DB_PASSWORD = 'Password@T3st0fEnv';
		process.env.MEM_DB_INDEX_OR_PATH = '0';

		// Limpa o cache para forçar env.ts a re-avaliar o process.env a cada teste
		vi.resetModules();

		// Fazemos spy/mock do process.exit para o Vitest não morrer
		vi.spyOn(process, 'exit').mockImplementation(() => {
			throw new Error('PROCESS_EXIT_CALLED');
		});

		// Mockamos apenas globais, pois vi.resetModules cria novas referências locais
		vi.spyOn(console, 'error').mockImplementation(() => { });
		vi.spyOn(console, 'dir').mockImplementation(() => { });
	});

	afterEach(() => {
		// Restaura as vi.spys
		vi.restoreAllMocks();

		// Restaura o ambiente original limpo
		process.env = originalEnv;
	});

	it('deve formatar o env corretamente e exporta-lo como um valor válido quando process.env for são', async () => {
		// No Vitest, nosso .env.test injetado já é válido.
		// Basta importar e ver que não lança erro
		const module = await import('@Configs/env.js');
		expect(module.env).toBeDefined();
		expect(module.env.NODE_ENV).toBe('test'); // garantido pelo ambiente test
		expect(process.exit).not.toHaveBeenCalled();
	});

	it('deve chamar process.exit(1) e logar erros graves se alguma env config obrigatória faltar/falhar', async () => {
		// Removemos intencionalmente uma chave obrigatória (ex: EMAIL_TO_CONTACT do base env schema)
		delete process.env.EMAIL_TO_CONTACT;

		await expect(async () => {
			// Ao importar, o arquivo roda o Zod parse solto. E vai cair no if (!_env.success)
			await import('@Configs/env.js');
		}).rejects.toThrow('PROCESS_EXIT_CALLED');

		expect(console.error).toHaveBeenCalledWith('‼️ ‼️ Erro grave na configuração de ambiente ‼️ ‼️');
		expect(console.dir).toHaveBeenCalled();
		expect(process.exit).toHaveBeenCalledWith(1);
	});
});
