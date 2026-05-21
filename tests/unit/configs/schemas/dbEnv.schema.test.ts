import { describe, it, expect } from 'vitest';
import { dbEnvValidationSchema } from '@Configs/schemas/dbEnv.schema.js';
import { weakPassword } from '@Mocks/test.fixtures.js';

describe('dbEnv.schema (Black-Box)', () => {
	
	const validPayload = {
		DATABASE_TYPE: 'mongodb',
		DATABASE_HOST: '127.0.0.1',
		DATABASE_PORT: 27017,
		DATABASE_NAME: 'habitos_db',
		DATABASE_USERNAME: 'admin',
		DATABASE_PASSWORD: 'UmaSenhaForte@2026!',
		DATABASE_ID_DEFAULT: 'uuidv7'
	};

	it('deve parsear com sucesso um env de database perfeitamente válido', () => {
		const result = dbEnvValidationSchema.safeParse(validPayload);
		expect(result.success).toBe(true);
	});

	it('deve adicionar defaults (localhost e uuidv7) para os campos caso faltem', () => {
		const result = dbEnvValidationSchema.safeParse({
			DATABASE_TYPE: 'mongodb',
			DATABASE_PORT: 27017,
			DATABASE_NAME: 'habitos_db',
		});
		
		expect(result.success).toBe(true);
		if(result.success) {
			expect(result.data.DATABASE_HOST).toBe('localhost');
			expect(result.data.DATABASE_ID_DEFAULT).toBe('uuidv7');
		}
	});

	it('deve rejeitar uma porta que não seja número (ou coercível para número inteiro)', () => {
		const payload = { ...validPayload, DATABASE_PORT: 'porta_clara' };
		const result = dbEnvValidationSchema.safeParse(payload);
		expect(result.success).toBe(false);
	});

	it('deve rejeitar e exigir que a DATABASE_PASSWORD seja FORTE quando provida (Fail-Fast na segurança)', () => {
		const payloadLength = { ...validPayload, DATABASE_PASSWORD: weakPassword }; // '123456' é muito curta e fraca
		const resultLength = dbEnvValidationSchema.safeParse(payloadLength);
		expect(resultLength.success).toBe(false);
		if(!resultLength.success) {
			// ZodErrorMessage: 'String must contain at least 10 character(s)'
			expect(resultLength.error.issues[0]?.message.includes('10')).toBe(true);
		}

		// Mesmo que a senha seja grande, se for fraca o passwordStrength do validator deve rejeitar
		const weakLargePassword = { ...validPayload, DATABASE_PASSWORD: 'senhamuitolongaemaisde15char' }; // Sem symbol, Uppercase, Num
		const resultWeak = dbEnvValidationSchema.safeParse(weakLargePassword);
		expect(resultWeak.success).toBe(false);
		if(!resultWeak.success) {
			expect(resultWeak.error.issues[0]?.message).toBe('A senha do banco não atende os requisitos de segurança');
		}
	});

	it('deve aceitar DATABASE_PASSWORD como string vazia e convertê-la para undefined (Comportamento de Pre-processamento)', () => {
		const payload = { ...validPayload, DATABASE_PASSWORD: '' };
		const result = dbEnvValidationSchema.safeParse(payload);
		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data.DATABASE_PASSWORD).toBeUndefined();
		}
	});

	it('deve rejeitar um database type não suportado', () => {
		const payload = { ...validPayload, DATABASE_TYPE: 'oracle' };
		const result = dbEnvValidationSchema.safeParse(payload);
		expect(result.success).toBe(false);
		if(!result.success) {
			expect(result.error.issues[0]?.message).toContain('Ops aparentemente o db desejado ainda não está disponível');
		}
	});
});
