import { describe, it, expect } from 'vitest';
import { passwordStrength } from '@Validations/Password.validations.js';

describe('Password Validation Util (Black-Box)', () => {

	describe('Comportamentos Estruturais', () => {
		it('deve retornar false se o valor não for uma string (fail-safe interno)', () => {
			// @ts-expect-error - Forçando tipo incorreto para atestar a segurança em run-time
			const result = passwordStrength(123456);
			expect(result).toBe(false);
		});

		it('deve retornar false se um nível de segurança desconhecido for passado sem personalização', () => {
			// @ts-expect-error - Testando runtime para entradas não mapeadas
			const result = passwordStrength('SenhaForte123!', { securityLevel: 'invalid_level' });
			expect(result).toBe(false);
		});
	});

	describe('Níveis de Segurança Predefinidos', () => {

		it('deve aceitar senha para o nível LOW (min 6 chars, 1 lower, 1 upper, 1 num)', () => {
			expect(passwordStrength('Aa1234', { securityLevel: 'low', personalize: false })).toBe(true);
			
			// Falsos negativos:
			expect(passwordStrength('aaaaaa', { securityLevel: 'low', personalize: false })).toBe(false); // Sem num e upper
			expect(passwordStrength('A1', { securityLevel: 'low', personalize: false })).toBe(false); // Curta
		});

		it('deve aceitar senha para o nível MEDIUM (min 8 chars, 1 lower, 1 upper, 1 num, 1 symbol)', () => {
			// A função default quando não passa options é medium, personaliza=false
			expect(passwordStrength('User@2026')).toBe(true);
			
			// Falsos negativos:
			expect(passwordStrength('User2026', { securityLevel: 'medium', personalize: false })).toBe(false); // Sem symbol
		});

		it('deve aceitar senha para o nível STRONG (min 15 chars, 3 lower, 3 upper, 3 num, 3 symbol)', () => {
			const validStrong = 'AaaBbbCcc123!@#'; // 15 chars, 3 Uppers
			expect(passwordStrength(validStrong, { securityLevel: 'strong', personalize: false })).toBe(true);
			
			// Falsos negativos (faltam symbolos):
			const invalidStrong = 'AaaBbbCcc123ddd'; 
			expect(passwordStrength(invalidStrong, { securityLevel: 'strong', personalize: false })).toBe(false);
		});

	});

	describe('Personalização (Personalize = true)', () => {

		it('deve lançar throw caso a opção de personalizar seja true mas falte o strengthSchema', () => {
			expect(() => 
				passwordStrength('AnyPassword!', { securityLevel: 'medium', personalize: true })
			).toThrow('Caso você deseje alterar a validação de senha deve-se passar obrigatóriamente o objeto com suas customizações.');
		});

		it('deve respeitar as configurações passadas via strengthSchema', () => {
			// Testa apenas o que personalizamos: minLength de 4 e pelo menos 1 número, nada mais de obrigatório
			const isStrong = passwordStrength('1abc', { 
				securityLevel: 'low', 
				personalize: true,
				strengthSchema: {
					minLength: 4,
					minNumbers: 1,
					minUppercase: 0,
					minLowercase: 0,
					minSymbols: 0,
				}
			});
			expect(isStrong).toBe(true);
		});

		it('deve retornar falso se usar options inválidas sem dar throw de runtime por padrao da lib', () => {
			const isStrong = passwordStrength('Any!', { 
					securityLevel: 'medium', 
					personalize: true,
					// @ts-expect-error - Passando valor corrompido para o validator explodir ou dar bypass
					strengthSchema: { minLength: 'nada-a-ver', minSymbols: 50 }
				});
			expect(isStrong).toBe(false);
		});

	});

});
