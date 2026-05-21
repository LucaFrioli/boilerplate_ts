import { describe, it, expect } from 'vitest';
import { DatabaseUsernameValidator } from '@Validations/DatabaseUsername.validation.js';
import { validDbUsername, invalidDbUsernames } from '@tests/helpers/mocks/test.fixtures.js';

describe('DatabaseUsernameValidator (Black-Box)', () => {

	describe('Usernames Válidos', () => {
		it('deve retornar true para username com morfologia correta (tst)', () => {
			expect(DatabaseUsernameValidator.verifyUsername(validDbUsername, 'valkey')).toBe(true);
		});

		it('deve retornar true para ambiente prd', () => {
			expect(DatabaseUsernameValidator.verifyUsername('prd_api_rw_01_aB3dEf9xYz', 'valkey')).toBe(true);
		});

		it('deve retornar true para ambiente stg', () => {
			expect(DatabaseUsernameValidator.verifyUsername('stg_api_rw_01_aB3dEf9xYz', 'valkey')).toBe(true);
		});

		it('deve retornar true para ambiente dev', () => {
			expect(DatabaseUsernameValidator.verifyUsername('dev_api_rw_01_aB3dEf9xYz', 'valkey')).toBe(true);
		});

		it('deve retornar true para permissão ro (read-only)', () => {
			expect(DatabaseUsernameValidator.verifyUsername('tst_api_ro_01_aB3dEf9xYz', 'valkey')).toBe(true);
		});

		it('deve retornar true para permissão adm (admin)', () => {
			expect(DatabaseUsernameValidator.verifyUsername('tst_api_adm_01_aB3dEf9xYz', 'valkey')).toBe(true);
		});

		it('deve retornar true para dbName "envBoot"', () => {
			expect(DatabaseUsernameValidator.verifyUsername(validDbUsername, 'envBoot')).toBe(true);
		});

		it('deve retornar true para dbName "mongodb"', () => {
			expect(DatabaseUsernameValidator.verifyUsername(validDbUsername, 'mongodb')).toBe(true);
		});
	});

	describe('Usernames Inválidos', () => {
		it.each(invalidDbUsernames)('deve retornar false para "%s"', (uname) => {
			expect(DatabaseUsernameValidator.verifyUsername(uname, 'valkey')).toBe(false);
		});
	});

	describe('Comportamentos Estruturais (Fail-Fast)', () => {
		it('deve lançar throw se o valor não for uma string', () => {
			expect(() => {
				// @ts-expect-error - Forçando tipo incorreto para testar segurança runtime
				DatabaseUsernameValidator.verifyUsername(12345, 'valkey');
			}).toThrow();
		});

		it('deve lançar throw se o valor for null', () => {
			expect(() => {
				// @ts-expect-error - Forçando tipo incorreto
				DatabaseUsernameValidator.verifyUsername(null, 'valkey');
			}).toThrow();
		});

		it('deve retornar true mesmo com dbName fora da lista (regex não usa dbName)', () => {
			// O verifyUsername usa dbUsernamePattern.test(uname) que é independente do dbName.
			// O dbName é usado apenas no handlingError (quando input não é string).
			// @ts-expect-error - Forçando dbName inválido
			expect(DatabaseUsernameValidator.verifyUsername(validDbUsername, 'oracledb')).toBe(true);
		});

		it('deve lançar throw de erro crasso se o valor não for string e o dbName não for suportado', () => {
			expect(() => {
				// @ts-expect-error - Forçando tipo e dbName incorretos para testar fallback profundo
				DatabaseUsernameValidator.verifyUsername(12345, 'oracledb');
			}).toThrow('Erro crasso contate um dos canais legais');
		});
	});
});
