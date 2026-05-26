/**
 * @fileoverview Testes das Validações da Entidade User.
 */
import { describe, it, expect, vi } from 'vitest';
import { CpfValidator } from '@Validations/Cpf.validations.js';
import { passwordStrength } from '@Validations/Password.validations.js';
import baseUserSchema, {
	usernameValidationSchema,
	cpfValidationSchema,
	emailValidationSchema,
} from '@Resources/User/User.validation.js';
import { validUuidV7 } from '@Mocks/test.fixtures.js';
import z from 'zod';

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
			const sanitized = CpfValidator.validateAndSanitize(validCpf, false);
			expect(sanitized).toBe('12345678909');
		});

		it('deve rejeitar CPF com dígitos verificadores inválidos', () => {
			const invalidCpf = '123.456.789-00';
			expect(() => {
				CpfValidator.validateAndSanitize(invalidCpf, false);
			}).toThrow('Ops! Digite um cpf válido');
		});

		it('deve rejeitar CPF com números repetidos', () => {
			const repeatedCpf = '111.111.111-11';
			expect(() => {
				CpfValidator.validateAndSanitize(repeatedCpf, false);
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

		it('deve rejeitar usernames que não seja string', ()=>{
			expect(usernameValidationSchema.safeParse(123456789).success).toBe(false);
			expect(usernameValidationSchema.safeParse(undefined).success).toBe(false);
			expect(usernameValidationSchema.safeParse(null).success).toBe(false);
		});

		it('deve rejeitar usernames com caracteres especiais @', () => {
			const result = usernameValidationSchema.safeParse('luca@frioli');
			expect(result.success).toBe(false);
		});

		it('deve rejeitar usernames iniciando ou terminando com caracteres especiais válidos ou em sequência', ()=>{
			expect(usernameValidationSchema.safeParse('_luca.frioli').success).toBe(false);
			expect(usernameValidationSchema.safeParse('luca_frioli_').success).toBe(false);
			expect(usernameValidationSchema.safeParse('_luca_frioli_').success).toBe(false);
			expect(usernameValidationSchema.safeParse('luca._frioli').success).toBe(false);
			expect(usernameValidationSchema.safeParse('luca..frioli').success).toBe(false);
		})
	});

	describe('cpfValidationSchema', () => {
		it('deve aceitar um CPF válido (com ou sem máscara)', () => {
			expect(cpfValidationSchema.safeParse('123.456.789-09').success).toBe(true);
			expect(cpfValidationSchema.safeParse('12345678909').success).toBe(true);
		});

		it('deve rejeitar CPF que não seja string', () => {
			expect(cpfValidationSchema.safeParse(12345678909).success).toBe(false);
			expect(cpfValidationSchema.safeParse(null).success).toBe(false);
		});

		it('deve rejeitar CPF matematicamente inválido', () => {
			expect(cpfValidationSchema.safeParse('12345678900').success).toBe(false);
		});

		it('deve rejeitar CPF com formato de string inválido (não 11 dígitos após limpeza)', () => {
			expect(cpfValidationSchema.safeParse('123.456.78').success).toBe(false);
		});
	});

	describe('emailValidationSchema', () => {
		it('deve aceitar um e-mail válido', () => {
			expect(emailValidationSchema.safeParse('teste@provedor.com').success).toBe(true);
		});

		it('deve rejeitar e-mail que não seja string', () => {
			expect(emailValidationSchema.safeParse(123456).success).toBe(false);
			expect(emailValidationSchema.safeParse(null).success).toBe(false);
		});

		it('deve rejeitar e-mail com formato inválido', () => {
			expect(emailValidationSchema.safeParse('email-sem-arroba').success).toBe(false);
		});
	});

	describe('baseUserSchema', () => {
		it('deve testar os defaults e transforms nulos e de data corretamente (createdAt, updatedAt, deletedAt nulos/string)', () => {
			const mockPayload = {
				id: validUuidV7,
				publicId: validUuidV7,
				active: true,
				username: 'luca_teste',
				email: 'teste@teste.com',
				// Simulamos como hash Argon2 válido via regex para passar type guard
				passwordHash: '$argon2id$v=19$m=65536,t=3,p=4$c2FsdHNhbHRzYWx0c2FsdA$hashhashhashhashhashhash',
				cpf: '123.456.789-09',
				profileId: validUuidV7,
				// omitimos stripeId, walletId, updatedAt e deletedAt para checar defaults nulos
				createdAt: new Date().toISOString(), // iso string obrigatorio
			};

			const parsed = baseUserSchema.safeParse(mockPayload);
			if (!parsed.success) { console.error('baseUserSchema parsing failed:', z.treeifyError(parsed.error)); }
			expect(parsed.success).toBe(true);

			if (parsed.success) {
				// Assert defaults nulables formados corretamente
				expect(parsed.data.stripeId).toBe(null);
				expect(parsed.data.walletId).toBe(null);
				expect(parsed.data.updatedAt).toBe(null);
				expect(parsed.data.deletedAt).toBe(null);
				// Assert transform Date
				expect(parsed.data.createdAt).toBeInstanceOf(Date);
			}
		});

		it('deve rejeitar atributos (id, publicId, passwordHash) que não sejam strings no z.custom', () => {
			const basePayload = {
				id: validUuidV7,
				publicId: validUuidV7,
				active: true,
				username: 'luca_teste',
				email: 'teste@teste.com',
				passwordHash: '$argon2id$v=19$m=65536,t=3,p=4$c2FsdHNhbHRzYWx0c2FsdA$hashhashhashhashhashhash',
				cpf: '123.456.789-09',
				profileId: validUuidV7,
				createdAt: new Date().toISOString(),
			};

			// Fails id string check (line 33)
			expect(baseUserSchema.safeParse({ ...basePayload, id: 1234 }).success).toBe(false);
			// Fails publicId string check (line 62)
			expect(baseUserSchema.safeParse({ ...basePayload, publicId: 1234 }).success).toBe(false);
			// Fails passwordHash string check (line 70)
			expect(baseUserSchema.safeParse({ ...basePayload, passwordHash: { hash: 123 } }).success).toBe(false);
			// Fails cpf string check (line 53)
			expect(baseUserSchema.safeParse({ ...basePayload, cpf: 12345678909 }).success).toBe(false);
		});

		it('deve formatar updatedAt e deletedAt caso sejam passados via data', () => {
			const date1 = new Date('2026-03-25T10:00:00Z').toISOString();
			const date2 = new Date('2026-03-26T10:00:00Z').toISOString();

			const mockPayload = {
				id: validUuidV7,
				publicId: validUuidV7,
				active: false,
				username: 'luca_teste',
				email: 'teste@teste.com',
				passwordHash: '$argon2id$v=19$m=65536,t=3,p=4$c2FsdHNhbHRzYWx0c2FsdA$hashhashhashhashhashhash',
				cpf: '123.456.789-09',
				profileId: validUuidV7,
				createdAt: new Date().toISOString(),
				// values passed explicitly
				updatedAt: date1,
				deletedAt: date2,
				stripeId: 'xyz',
			};

			const parsed = baseUserSchema.safeParse(mockPayload);
			if (!parsed.success) { console.error('baseUserSchema parsing failed (dates passing):', z.treeifyError(parsed.error)); }
			expect(parsed.success).toBe(true);

			if (parsed.success) {
				// Lines 79-87 transform
				expect(parsed.data.updatedAt).toBeInstanceOf(Date);
				expect(parsed.data.updatedAt?.toISOString()).toBe(date1);
				expect(parsed.data.deletedAt).toBeInstanceOf(Date);
				expect(parsed.data.deletedAt?.toISOString()).toBe(date2);
				expect(parsed.data.stripeId).toBe('xyz');
			}
		});
	});
});
