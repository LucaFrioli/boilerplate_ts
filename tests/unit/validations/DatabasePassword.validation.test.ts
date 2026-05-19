import { describe, it, expect } from 'vitest';
import { DatabasePasswordValidation } from '@Validations/DatabasePassword.validation.js';
import { validDbPassword, weakDbPassword } from '@tests/helpers/mocks/test.fixtures.js';

describe('DatabasePasswordValidation (Black-Box)', () => {

	describe('Senhas Válidas (NODE_ENV=test → nível medium)', () => {
		it('deve retornar true para senha forte com upper, lower, número e símbolo', () => {
			expect(DatabasePasswordValidation.isValid(validDbPassword)).toBe(true);
		});

		it('deve retornar true para senha com caracteres especiais variados', () => {
			expect(DatabasePasswordValidation.isValid('P@ssw0rd!Test')).toBe(true);
		});
	});

	describe('Senhas Inválidas', () => {
		it('deve retornar false para senha fraca (curta, sem complexidade)', () => {
			expect(DatabasePasswordValidation.isValid(weakDbPassword)).toBe(false);
		});

		it('deve retornar false para senha apenas numérica', () => {
			expect(DatabasePasswordValidation.isValid('12345678')).toBe(false);
		});

		it('deve retornar false para senha apenas lowercase', () => {
			expect(DatabasePasswordValidation.isValid('abcdefgh')).toBe(false);
		});
	});

	describe('Comportamentos Estruturais (Fail-Fast)', () => {
		it('deve lançar throw se o valor não for uma string', () => {
			expect(() => {
				DatabasePasswordValidation.isValid(12345);
			}).toThrow('Env maculada ou mal configurada!');
		});

		it('deve lançar throw se o valor for null', () => {
			expect(() => {
				DatabasePasswordValidation.isValid(null);
			}).toThrow('Env maculada ou mal configurada!');
		});

		it('deve lançar throw se o valor for undefined', () => {
			expect(() => {
				DatabasePasswordValidation.isValid(undefined);
			}).toThrow('Env maculada ou mal configurada!');
		});
	});
});
