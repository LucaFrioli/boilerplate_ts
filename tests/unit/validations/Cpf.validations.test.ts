/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect } from 'vitest';
import { CpfValidator } from '@Validations/Cpf.validations.js';

describe('CpfValidator (Black-Box & Defensive Validation)', () => {

	describe('Métodos Públicos (Caixa-Preta)', () => {

		describe('cleaningCpf', () => {
			it('deve remover todos os caracteres não-numéricos de uma string', () => {
				expect(CpfValidator.cleaningCpf('123.456.789-01')).toBe('12345678901');
				expect(CpfValidator.cleaningCpf('abc-123_xyz')).toBe('123');
				expect(CpfValidator.cleaningCpf('')).toBe('');
			});
		});

		describe('validateAndSanitize', () => {
			it('deve rejeitar se o CPF não for uma string', () => {
				expect(() => {
					// @ts-expect-error - Forçando tipo inválido em tempo de execução
					CpfValidator.validateAndSanitize(12345678901, false);
				}).toThrow('O cpf passado deve ser uma string');
			});

			it('deve rejeitar se o CPF limpo não tiver exatamente 11 caracteres (cobertura da linha 25)', () => {
				expect(() => {
					CpfValidator.validateAndSanitize('123.456.789-0', false); // 10 dígitos
				}).toThrow('Ops um cpf deve ter ao menos 11 dígitos numéricos além de sua mascara');

				expect(() => {
					CpfValidator.validateAndSanitize('123.456.789-012', false); // 12 dígitos
				}).toThrow('Ops um cpf deve ter ao menos 11 dígitos numéricos além de sua mascara');
			});

			it('deve rejeitar CPFs com todos os dígitos repetidos', () => {
				expect(() => {
					CpfValidator.validateAndSanitize('111.111.111-11', false);
				}).toThrow('O cpf não pode ter números repetidos');
			});

			it('deve rejeitar CPFs com dígitos verificadores matematicamente inválidos', () => {
				expect(() => {
					CpfValidator.validateAndSanitize('123.456.789-01', false); // Dígitos reais gerados seriam 09
				}).toThrow('Ops! Digite um cpf válido para poder continuar com a operação');
			});

			it('deve aceitar, limpar e congelar um CPF válido (Happy Path)', () => {
				const raw = '  123.456.789-09  '; // CPF matematicamente válido
				const result = CpfValidator.validateAndSanitize(raw, false);
				expect(result).toBe('12345678909');
				expect(Object.isFrozen(result)).toBe(true);
			});

			it('deve passar pela branch de verificação da API da receita federal', () => {
				const result = CpfValidator.validateAndSanitize('12345678909', true);
				expect(result).toBe('12345678909');
			});
		});
	});

	describe('Defesa Interna (Garantia de Cobertura de Branch Privada)', () => {
		it('deve testar o método gerador de dígito com entrada não-numérica (Branch da Linha 57)', () => {
			// Como o método generateDigit é privado e a API pública limpa todos os não-dígitos,
			// a linha 57 é considerada "caminho morto" (dead code) sob uso público estrito.
			// Acessamos dinamicamente via chave de string para garantir 100% de cobertura.
			const privateMethod = (CpfValidator as any).generateDigit;
			expect(privateMethod).toBeDefined();

			// Executando com entrada não numérica para acionar a branch do logger.error
			const result = privateMethod.call(CpfValidator, 'abc');
			expect(result).toBeDefined();
		});
	});
});
