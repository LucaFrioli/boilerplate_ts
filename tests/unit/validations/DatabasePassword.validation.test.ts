/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { describe, it, expect, vi, afterEach } from 'vitest';
import { DatabasePasswordValidation } from '@Validations/DatabasePassword.validation.js';
import { validDbPassword, weakDbPassword } from '@tests/helpers/mocks/test.fixtures.js';
import validator from 'validator';

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

	describe('Validação em Produção (NODE_ENV=production → nível strong)', () => {
		afterEach(() => {
			process.env.NODE_ENV = 'test';
		});

		it('deve rejeitar senha com menos de 15 caracteres', () => {
			process.env.NODE_ENV = 'production';
			expect(DatabasePasswordValidation.isValid('P@ss123!')).toBe(false);
		});

		it('deve aceitar senha forte com tamanho >= 15', () => {
			process.env.NODE_ENV = 'production';
			expect(DatabasePasswordValidation.isValid('UmaSenhaSuperForte$$2026!')).toBe(true);
		});

		it('deve rejeitar senha com tamanho >= 15 mas sem os requisitos de complexidade strong', () => {
			process.env.NODE_ENV = 'production';
			expect(DatabasePasswordValidation.isValid('123456789012345')).toBe(false);
		});
	});

	describe('Casos de Borda e Erros Estruturais Internos', () => {
		it('deve usar o logger customizado se fornecido em caso de erro de tipo', () => {
			const mockLogger = {
				fatal: vi.fn(),
			} as any;
			expect(() => {
				DatabasePasswordValidation.isValid(123, mockLogger);
			}).toThrow('Env maculada ou mal configurada!');
			expect(mockLogger.fatal).toHaveBeenCalled();
		});

		it('deve lançar erro se o validador retornar um tipo não booleano (determineResult)', () => {
			const spy = vi.spyOn(validator, 'isStrongPassword').mockReturnValue(123 as any);
			expect(() => {
				DatabasePasswordValidation.isValid('qualquer_coisa');
			}).toThrow('Erro interno resultado deve ser booleano');
			spy.mockRestore();
		});
	});
});

