/* eslint-disable @typescript-eslint/no-confusing-void-expression */
/* eslint-disable @typescript-eslint/unbound-method */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { isValidCPF, isValidEmail, assertValidEmail, piiLogger } from '@Types/pii.types.js';
import { CpfValidator } from '@Validations/Cpf.validations.js';
import { EmailValidator } from '@Validations/Email.validations.js';

// Mock do CpfValidator para controlar as falhas matemáticas
vi.mock('@Validations/Cpf.validations.js', () => ({
	CpfValidator: {
		validateAndSanitize: vi.fn(),
	},
}));

// Mock do EmailValidator para controlar as validações sintáticas
vi.mock('@Validations/Email.validations.js', () => ({
	EmailValidator: {
		isValid: vi.fn(),
	},
}));

// Mock do env para evitar erros de importação/inicialização
vi.mock('@Configs/env.js', () => ({
	env: {
		EMAIL_TO_CONTACT: 'admin@test.com',
	},
}));

describe('PII Types - CPF Validation (isValidCPF)', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		// Espiona e silencia os logs de erro para não poluir o console de testes
		vi.spyOn(piiLogger, 'error').mockImplementation(() => {});
	});

	it('deve retornar false se o valor não for uma string', () => {
		const result = isValidCPF(12345678901);
		expect(result).toBe(false);
		expect(piiLogger.error).toHaveBeenCalled();
	});

	it('deve retornar false se a string não corresponder a um CPF limpo (11 dígitos)', () => {
		const resultMasked = isValidCPF('123.456.789-01');
		expect(resultMasked).toBe(false);
		expect(piiLogger.error).toHaveBeenCalled();

		const resultWrongSize = isValidCPF('1234567890');
		expect(resultWrongSize).toBe(false);

		const resultWithLetters = isValidCPF('1234567890a');
		expect(resultWithLetters).toBe(false);
	});

	it('deve retornar false se o CPF for matematicamente inválido', () => {
		const invalidCpf = '12345678901';
		vi.mocked(CpfValidator.validateAndSanitize).mockImplementation(() => {
			throw new Error('Ops! Digite um cpf válido');
		});

		const result = isValidCPF(invalidCpf);
		expect(result).toBe(false);
		expect(CpfValidator.validateAndSanitize).toHaveBeenCalledWith(invalidCpf, false);
		expect(piiLogger.error).toHaveBeenCalled();
	});

	it('deve retornar true para um CPF válido e limpo', () => {
		const validCpf = '12345678909';
		vi.mocked(CpfValidator.validateAndSanitize).mockReturnValue(validCpf);

		const result = isValidCPF(validCpf);
		expect(result).toBe(true);
		expect(CpfValidator.validateAndSanitize).toHaveBeenCalledWith(validCpf, false);
	});

	it('deve lidar com erros inesperados no CpfValidator e mascarar o valor no log', () => {
		const rawValue = '12345678901';
		vi.mocked(CpfValidator.validateAndSanitize).mockImplementation(() => {
			throw new Error('Unexpected error');
		});

		const result = isValidCPF(rawValue);
		expect(result).toBe(false);
		expect(piiLogger.error).toHaveBeenCalled();
	});
});

describe('PII Types - Email Validation (isValidEmail)', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.spyOn(piiLogger, 'error').mockImplementation(() => {});
	});

	it('deve retornar false e registrar erro no logger se o e-mail não for do tipo string', () => {
		const result = isValidEmail(12345);
		expect(result).toBe(false);
		expect(piiLogger.error).toHaveBeenCalled();
	});

	it('deve retornar true se a string de email for considerada válida pelo EmailValidator', () => {
		vi.mocked(EmailValidator.isValid).mockReturnValue(true);
		const result = isValidEmail('valido@empresa.com');
		expect(result).toBe(true);
		expect(EmailValidator.isValid).toHaveBeenCalledWith('valido@empresa.com');
	});

	it('deve retornar false se a string de email for considerada inválida pelo EmailValidator', () => {
		vi.mocked(EmailValidator.isValid).mockReturnValue(false);
		const result = isValidEmail('invalido@domain');
		expect(result).toBe(false);
		expect(EmailValidator.isValid).toHaveBeenCalledWith('invalido@domain');
	});
});

describe('PII Types - Email Assertion (assertValidEmail)', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.spyOn(piiLogger, 'fatal').mockImplementation(() => {});
	});

	it('deve retornar undefined sem lançar erros se a entrada for um e-mail válido', () => {
		vi.mocked(EmailValidator.isValid).mockReturnValue(true);
		expect(() => assertValidEmail('valido@empresa.com')).not.toThrow();
	});

	it('deve lançar erro e acionar piiLogger.fatal se a entrada for inválida', () => {
		vi.mocked(EmailValidator.isValid).mockReturnValue(false);
		expect(() => assertValidEmail('invalido@domain')).toThrow('Entrada de email inválida');
		expect(piiLogger.fatal).toHaveBeenCalled();
	});
});
