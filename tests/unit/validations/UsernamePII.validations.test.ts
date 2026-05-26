/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unsafe-return */
import { describe, it, expect, vi, beforeAll } from 'vitest';

// Mock do módulo env para isolar os testes unitários de validação de ambiente externa
vi.mock('@Configs/env.js', () => ({
	env: {
		HASHER_PROVIDER: 'argon2',
		HASHER_SECURITY_PEPPER: 'test-pepper-ultra-strong-sha256-ficticio',
		HASHER_LENGTH: 32,
		HASHER_SALT_LENGTH: 16,
		HASHER_BCRYPT_ROUNDS: 12,
		HASHER_PARALLELISM: 4,
		HASHER_TIME_COST: 3,
		HASHER_MEMORY_COST: 65536,
		IDENTIFIER_PATTERN: 'nanoid',
		IDENTIFIER_NANOID_ALPHABET: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_',
		IDENTIFIER_NANOID_SIZE: 21,
	},
}));

import { UsernameValidator } from '@Validations/UsernamePII.validations.js';

describe('UsernameValidator', () => {
	// Spies para capturar os logs e evitar a poluição do console durante as asserções de erro
	const errorSpy = vi.spyOn(UsernameValidator['unameValidationLogger'], 'error').mockImplementation(() => { return {} as any; });

	beforeAll(() => {
		// Resetar os spies antes de iniciar a execução da suíte
		errorSpy.mockClear();
	});

	describe('Validação de Tipos (Tipo Diferente de String)', () => {
		it('deve retornar false para valores nulos ou indefinidos', () => {
			expect(UsernameValidator.isValid(null)).toBe(false);
			expect(UsernameValidator.isValid(undefined)).toBe(false);
			expect(errorSpy).toHaveBeenCalled();
		});

		it('deve retornar false para valores não textuais (números, objetos, arrays)', () => {
			expect(UsernameValidator.isValid(12345)).toBe(false);
			expect(UsernameValidator.isValid({})).toBe(false);
			expect(UsernameValidator.isValid([])).toBe(false);
			expect(errorSpy).toHaveBeenCalled();
		});
	});

	describe('Validação de Formato Sintático - Happy Path (Usernames Válidos)', () => {
		it('deve retornar true para usernames válidos padrão ASCII sem separadores consecutivos', () => {
			const result = UsernameValidator.isValid('luca_frioli');
			expect(result).toBe(true);
		});

		it('deve retornar true para usernames curtos no limite mínimo aceito (3 caracteres)', () => {
			const result = UsernameValidator.isValid('Ana');
			expect(result).toBe(true);
		});

		it('deve retornar true para usernames complexos com múltiplos separadores válidos e distanciados', () => {
			const result = UsernameValidator.isValid('User-ExamPle_02.jhon');
			expect(result).toBe(true);
		});

		it('deve retornar true para usernames longos no limite máximo aceito (28 caracteres)', () => {
			const result = UsernameValidator.isValid('On3-B1g.USER_strange.F0rmcao');
			expect(result).toBe(true);
		});
	});

	describe('Validação de Formato Sintático - Boundary & Error Path (Usernames Inválidos)', () => {
		it('deve retornar false para usernames abaixo do limite de tamanho mínimo (2 caracteres)', () => {
			const result = UsernameValidator.isValid('lu');
			expect(result).toBe(false);
		});

		it('deve retornar false para usernames acima do limite de tamanho máximo (31 caracteres)', () => {
			const longUsername = 'a'.repeat(31);
			expect(UsernameValidator.isValid(longUsername)).toBe(false);
		});

		it('deve retornar false para usernames que iniciam com caractere especial', () => {
			expect(UsernameValidator.isValid('_luca')).toBe(false);
			expect(UsernameValidator.isValid('.luca')).toBe(false);
			expect(UsernameValidator.isValid('-luca')).toBe(false);
		});

		it('deve retornar false para usernames que terminam com caractere especial', () => {
			expect(UsernameValidator.isValid('luca_')).toBe(false);
			expect(UsernameValidator.isValid('luca.')).toBe(false);
			expect(UsernameValidator.isValid('luca-')).toBe(false);
		});

		it('deve retornar false para usernames com separadores especiais repetidos consecutivamente', () => {
			expect(UsernameValidator.isValid('luca..frioli')).toBe(false);
			expect(UsernameValidator.isValid('luca__frioli')).toBe(false);
			expect(UsernameValidator.isValid('luca--frioli')).toBe(false);
			expect(UsernameValidator.isValid('luca.-frioli')).toBe(false);
		});

		it('deve retornar false para usernames contendo caracteres acentuados ou cedilhas (Não-ASCII)', () => {
			// A string 'F0rmção-2' deve ser rejeitada pela regex [a-zA-Z0-9]
			expect(UsernameValidator.isValid('F0rmção-2')).toBe(false);
		});
	});

	describe('Exposição de Regras de Negócio (getFormalRules)', () => {
		it('deve retornar o objeto de regras formais e estéticas contendo limites, caracteres permitidos e requisitos descritos', () => {
			const rules = UsernameValidator.getFormalRules() as any;

			expect(rules).toBeDefined();
			expect(rules.requirements).toBeInstanceOf(Array);
			expect(rules.requirements.length).toBeGreaterThan(0);
			expect(rules.allowedSpecialCharacters).toEqual(['.', '-', '_']);
			expect(rules.limits).toEqual({
				min: 3,
				max: 30,
			});
		});
	});
});
