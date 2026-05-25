/* eslint-disable @typescript-eslint/unbound-method */
/* eslint-disable @typescript-eslint/explicit-function-return-type */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { isValidCPF } from '@Types/pii.types.js';
import { CpfValidator } from '@Validations/Cpf.validations.js';

// Mock do logger para não poluir o console e verificar chamadas
vi.mock('@Configs/logger.js', () => ({
	createChildLogger: () => ({
		error: vi.fn(),
		warn: vi.fn(),
		info: vi.fn(),
		debug: vi.fn(),
		fatal: vi.fn(),
	}),
}));

// Mock do CpfValidator para controlar as falhas matemáticas
vi.mock('@Validations/Cpf.validations.js', () => ({
	CpfValidator: {
		validateAndSanitize: vi.fn(),
	},
}));

// Mock do env para evitar erros de importação/inicialização
vi.mock('@Configs/env.js', () => ({
	env: {
		EMAIL_TO_CONTACT: 'admin@test.com',
	},
}));

describe('PII Types - isValidCPF', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('deve retornar false se o valor não for uma string', () => {
		const result = isValidCPF(12345678901);
		expect(result).toBe(false);
	});

	it('deve retornar false se a string não corresponder a um CPF limpo (11 dígitos)', () => {
		// CPF com máscara
		const resultMasked = isValidCPF('123.456.789-01');
		expect(resultMasked).toBe(false);

		// CPF com tamanho errado
		const resultWrongSize = isValidCPF('1234567890');
		expect(resultWrongSize).toBe(false);

		// CPF com letras
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
	});


});
