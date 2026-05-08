import { describe, it, expect, vi, afterEach } from 'vitest';
import { memEnvValidationSchema } from '@Configs/schemas/memDbEnv.schema.js';
import { weakPassword } from '@Mocks/test.fixtures.js';

describe('memDbEnv.schema (Black-Box)', () => {

	const validPayload = {
		MEM_DB_TYPE: 'redis',
		MEM_DB_PROTOCOL: 'valkey',
		MEM_DB_HOST: 'valkey_host',
		MEM_DB_PORT: 6379,
		MEM_DB_USERNAME: 'default',
		MEM_DB_PASSWORD: 'UmaSenhaForte@2026!SimSenhor#', // Grande E Forte (3 symbols @ ! #)
		MEM_DB_INDEX_OR_PATH: 0
	};

	afterEach(() => {
		vi.resetModules();
		// Garante restauro dinâmico da branch
		process.env.NODE_ENV = 'test';
	});

	it('deve parsear com sucesso o ambiente em memória', () => {
		const result = memEnvValidationSchema.safeParse(validPayload);
		expect(result.success).toBe(true);
	});

	it('deve embutir os defaults corretos, como port 6379 e valkey para protocol', () => {
		const payload = {}; // tudo os de memória sao ou default ou opcionais
		const result = memEnvValidationSchema.safeParse(payload);
		expect(result.success).toBe(true);
		if(result.success) {
			expect(result.data.MEM_DB_PORT).toBe(6379);
			expect(result.data.MEM_DB_PROTOCOL).toBe('valkey');
			expect(result.data.MEM_DB_HOST).toBe('localhost');
			expect(result.data.MEM_DB_INDEX_OR_PATH).toBe(0);
		}
	});

	it('deve lançar erro em desenvolvimento se a senha for muito curta (< 10)', () => {
		process.env.NODE_ENV = 'development';
		const payload = { MEM_DB_PASSWORD: weakPassword }; // '123456'
		const result = memEnvValidationSchema.safeParse(payload);
		expect(result.success).toBe(false);
		if(!result.success) {
			expect(result.error.issues[0]?.message).toBe(' A senha do banco de dados em memória deve pelo menos ter 10 cracteres');
		}
	});

	it('deve barrar a senha em produção se for menor que 15 caracteres (Mesmo sendo Forte!)', () => {
		process.env.NODE_ENV = 'production';
		// Senha forte por padrão porém com apenas 12 chars:
		const shortStrongPassword = { MEM_DB_PASSWORD: 'Str@ng123pwd' };
		const result = memEnvValidationSchema.safeParse(shortStrongPassword);
		expect(result.success).toBe(false);
		if(!result.success) {
			expect(result.error.issues[0]?.message.includes('não corresponnde ao padrão recomendado para segurnaça da aplicação')).toBe(true);
		}
	});

	it('deve passar em produção com senha FORTE + TAMANHO >= 15', () => {
		process.env.NODE_ENV = 'production';
		const goodProdPayload = { MEM_DB_PASSWORD: 'UmaSenhaSuperForte$$2026!' };
		const result = memEnvValidationSchema.safeParse(goodProdPayload);
		expect(result.success).toBe(true);
	});

	it('deve rejeitar senha se ultrapassar 120 caracteres', () => {
		const veryLong = { MEM_DB_PASSWORD: 'A'.repeat(121) };
		const result = memEnvValidationSchema.safeParse(veryLong);
		expect(result.success).toBe(false);
		if(!result.success) {
			expect(result.error.issues[0]?.message).toBe('A senha do banco de dados em memória não pode exceder 120 caracteres');
		}
	});

	it('deve aceitar string para index quando valkey path socket', () => {
		const socketPayload = { MEM_DB_INDEX_OR_PATH: '/var/run/redis/redis.sock' };
		const result = memEnvValidationSchema.safeParse(socketPayload);
		expect(result.success).toBe(true);
		if(result.success) {
			expect(result.data.MEM_DB_INDEX_OR_PATH).toBe('/var/run/redis/redis.sock');
		}
	});
});
