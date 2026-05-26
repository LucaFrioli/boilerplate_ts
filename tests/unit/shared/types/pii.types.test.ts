/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-confusing-void-expression */
/* eslint-disable @typescript-eslint/unbound-method */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
	isValidCPF,
	isValidEmail,
	assertValidEmail,
	isValidUsernamePii,
	assertValidUsernamePii,
	piiLogger,
} from '@Types/pii.types.js';
import { CpfValidator } from '@Validations/Cpf.validations.js';
import { EmailValidator } from '@Validations/Email.validations.js';
import { UsernameValidator } from '@Validations/UsernamePII.validations.js';

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

// Mock do UsernameValidator para isolar os testes
vi.mock('@Validations/UsernamePII.validations.js', () => ({
	UsernameValidator: {
		isValid: vi.fn(),
		getFormalRules: vi.fn(() => ({
			requirements: ['requisito de teste'],
			allowedSpecialCharacters: ['.', '-', '_'],
			limits: { min: 3, max: 30 }
		}))
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
		vi.spyOn(piiLogger, 'error').mockImplementation(() => { return {} as any; });
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
		vi.spyOn(piiLogger, 'error').mockImplementation(() => { return {} as any; });
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
		vi.spyOn(piiLogger, 'fatal').mockImplementation(() => { return {} as any; });
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

describe('PII Types - Username Validation (isValidUsernamePii)', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.spyOn(piiLogger, 'warn').mockImplementation(() => { return {} as any; });
	});

	it('deve retornar false imediatamente e sem emitir warn logs caso o valor não seja string', () => {
		const result = isValidUsernamePii(9999);
		expect(result).toBe(false);
		expect(piiLogger.warn).not.toHaveBeenCalled();
	});

	it('deve retornar true se a entrada for considerada válida pelo UsernameValidator', () => {
		vi.mocked(UsernameValidator.isValid).mockReturnValue(true);
		const result = isValidUsernamePii('luca_frioli');
		expect(result).toBe(true);
		expect(UsernameValidator.isValid).toHaveBeenCalledWith('luca_frioli');
		expect(piiLogger.warn).not.toHaveBeenCalled();
	});

	it('deve retornar false, logar aviso com regras aplicadas e mascarar o valor se o UsernameValidator recusar', () => {
		vi.mocked(UsernameValidator.isValid).mockReturnValue(false);
		const result = isValidUsernamePii('lu');
		expect(result).toBe(false);
		expect(UsernameValidator.isValid).toHaveBeenCalledWith('lu');
		expect(piiLogger.warn).toHaveBeenCalled();
	});
});

describe('PII Types - Username Assertion (assertValidUsernamePii)', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.spyOn(piiLogger, 'fatal').mockImplementation(() => { return {} as any; });
	});

	it('deve passar em silêncio se o username for válido', () => {
		vi.mocked(UsernameValidator.isValid).mockReturnValue(true);
		expect(() => assertValidUsernamePii('luca_frioli')).not.toThrow();
		expect(piiLogger.fatal).not.toHaveBeenCalled();
	});

	it('deve lançar erro do tipo Error, mascarar o valor e acionar logger fatal com metadados estruturais caso inválido', () => {
		vi.mocked(UsernameValidator.isValid).mockReturnValue(false);
		expect(() => assertValidUsernamePii('lu')).toThrow('Username inválido por gentileza confira sua morfologia');
		expect(piiLogger.fatal).toHaveBeenCalled();
	});
});
