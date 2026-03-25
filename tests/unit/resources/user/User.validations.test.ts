/**
 * @fileoverview Testes das Validações da Entidade User.
 */
import { describe, it, expect, vi } from 'vitest';
import { CpfValidator } from '@Validations/Cpf.validations.js';
import { passwordStrength } from '@Validations/Password.validations.js';
import { usernameValidationSchema } from '@Resources/User/User.validation.js';

// Mock de env completo
vi.mock('@Configs/env.js', () => ({
	env: {
		HASHER_PROVIDER: 'argon2',
		HASHER_SECURITY_PEPPER: 'test-pepper-ultra-strong-sha256-ficticio',
		HASHER_LENGTH: 32,
		HASHER_SALT_LENGTH: 16,
		HASHER_PARALLELISM: 1,
		HASHER_TIME_COST: 2,
		HASHER_MEMORY_COST: 19456,
		IDENTIFIER_PATTERN: 'uuidv7',
		IDENTIFIER_NANOID_ALPHABET: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_',
		IDENTIFIER_NANOID_SIZE: 21,
		DATABASE_ID_DEFAULT: 'uuidv7',
	},
}));

describe('User Validations', () => {
	describe('CpfValidator', () => {
		it('deve aceitar um CPF válido e retornar apenas números', () => {
			const validCpf = '123.456.789-09';
			const sanitized = CpfValidator.validateAndSanitize(validCpf);
			expect(sanitized).toBe('12345678909');
		});

		it('deve rejeitar CPF com dígitos verificadores inválidos', () => {
			const invalidCpf = '123.456.789-00';
			expect(() => {
				CpfValidator.validateAndSanitize(invalidCpf);
			}).toThrow('Ops! Digite um cpf válido');
		});

		it('deve rejeitar CPF com números repetidos', () => {
			const repeatedCpf = '111.111.111-11';
			expect(() => {
				CpfValidator.validateAndSanitize(repeatedCpf);
			}).toThrow();
		});
	});

	describe('passwordStrength', () => {
		it('deve retornar true para senhas fortes', () => {
			expect(passwordStrength('Senh@Forte!2024')).toBe(true);
		});

		it('deve retornar false para senhas curtas', () => {
			expect(passwordStrength('123456')).toBe(false);
		});
	});

	describe('usernameValidationSchema', () => {
		it('deve aceitar usernames válidos', () => {
			const result = usernameValidationSchema.safeParse('luca_frioli');
			expect(result.success).toBe(true);
		});

		it('deve rejeitar usernames com caracteres especiais @', () => {
			const result = usernameValidationSchema.safeParse('luca@frioli');
			expect(result.success).toBe(false);
		});
	});
});
