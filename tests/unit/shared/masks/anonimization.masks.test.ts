/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { vi, describe, it, expect } from 'vitest';
import type { DatabaseUsername } from '@Types/security.types.js';
import { maskLogDatabaseUsername, maskPII } from '@Masks';
import type pino from 'pino';

/**
 * Mock de env.ts para fornecer o email de contato
 */
vi.mock('@Configs/env.js', () => ({
	env: {
		EMAIL_TO_CONTACT: 'suporte@empresa.com',
	},
}));

describe('maskLogDatabaseUsername (Black-Box)', () => {
	describe('Mascaramento bem-sucedido', () => {
		it('deve mascarar a entropia mantendo o contexto (ambiente_servico_permissao_id)', () => {
			const username = 'prd_api_rw_01_aB3dEf9xYz' as DatabaseUsername;
			const masked = maskLogDatabaseUsername(username);
			expect(masked).toBe('prd_api_rw_01_************');
		});

		it('deve mascarar com contexto stg', () => {
			const username = 'stg_cache_adm_02_ZzYyXxWw123' as DatabaseUsername;
			const masked = maskLogDatabaseUsername(username);
			expect(masked).toBe('stg_cache_adm_02_************');
		});

		it('deve mascarar com contexto dev', () => {
			const username = 'dev_session_ro_99_LongEntropy123' as DatabaseUsername;
			const masked = maskLogDatabaseUsername(username);
			expect(masked).toBe('dev_session_ro_99_************');
		});
	});

	describe('Fallback de segurança total', () => {
		it('deve retornar máscara completa se o username tiver menos de 5 partes', () => {
			const username = 'admin' as DatabaseUsername;
			const masked = maskLogDatabaseUsername(username);
			expect(masked).toBe('***********');
		});

		it('deve retornar máscara completa se o username for apenas underscores', () => {
			const username = 'a_b_c' as DatabaseUsername;
			const masked = maskLogDatabaseUsername(username);
			expect(masked).toBe('***********');
		});

		it('deve retornar máscara completa se o username tiver 4 partes', () => {
			const username = 'prd_api_rw_01' as DatabaseUsername;
			const masked = maskLogDatabaseUsername(username);
			expect(masked).toBe('***********');
		});
	});
});

describe('maskPII (Black-Box)', () => {
	const mockLogger = {
		error: vi.fn(),
		info: vi.fn(),
		warn: vi.fn(),
		debug: vi.fn(),
	} as unknown as pino.Logger;

	describe('Mascaramento de e-mails legítimos (DNS)', () => {
		it('deve mascarar emails com comprimento padrão de username (user.length > 2)', () => {
			// 'luca' tem length 4. Math.max(0, 4 - 2) = 2. repeatCountVerification <= 3 ? 3 : 2 -> repeatCount = 3.
			// endChar = 'a'.
			// maskedUser = 'l' + '***' + 'a' = 'l***a'.
			expect(maskPII('luca@gmail.com', mockLogger)).toBe('l***a@gmail.com');
		});

		it('deve mascarar emails com username de comprimento 1 (user.length = 1)', () => {
			// 'a' tem length 1. Math.max(0, 1 - 2) = 0. repeatCount = 3.
			// endChar = '' (user.length > 1 is false).
			// maskedUser = 'a' + '***' + '' = 'a***'.
			expect(maskPII('a@gmail.com', mockLogger)).toBe('a***@gmail.com');
		});

		it('deve mascarar emails com username de comprimento 2 (user.length = 2)', () => {
			// 'ab' tem length 2. Math.max(0, 2 - 2) = 0. repeatCount = 3.
			// endChar = 'b'.
			// maskedUser = 'a' + '***' + 'b' = 'a***b'.
			expect(maskPII('ab@gmail.com', mockLogger)).toBe('a***b@gmail.com');
		});

		it('deve mascarar emails com username longo (user.length > 5)', () => {
			// 'abcdef' tem length 6. Math.max(0, 6 - 2) = 4. repeatCountVerification <= 3 ? 3 : 4 -> repeatCount = 4.
			// endChar = 'f'.
			// maskedUser = 'a' + '****' + 'f' = 'a****f'.
			expect(maskPII('abcdef@gmail.com', mockLogger)).toBe('a****f@gmail.com');
		});
	});

	describe('Fallback para strings não-email ou emails sem domínios DNS legítimos', () => {
		it('deve retornar a própria string se o comprimento for menor ou igual a 4', () => {
			expect(maskPII('12', mockLogger)).toBe('12');
			expect(maskPII('1234', mockLogger)).toBe('1234');
		});

		it('deve mascarar strings comuns com comprimento maior que 4', () => {
			// '12345' -> length 5. repeatCount = 5 - 4 = 1. endOffset = 3.
			// substring(0, 2) = '12'. '*' = '*'. substring(3) = '45'.
			// Retorno: '12*45'.
			expect(maskPII('12345', mockLogger)).toBe('12*45');

			// CPF fictício com 11 caracteres -> '12345678901' -> length 11.
			// repeatCount = 11 - 4 = 7. endOffset = 9.
			// substring(0, 2) = '12'. '*'.repeat(7) = '*******'. substring(9) = '01'.
			// Retorno: '12*******01'.
			expect(maskPII('12345678901', mockLogger)).toBe('12*******01');
		});

		it('deve aplicar fallback de string geral se o email possuir domínio que não seja DNS', () => {
			// 'usuario@192.168.0.1' -> HostValidator classifica como 'IPv4', então vai para o fluxo geral
			const ipEmail = 'usuario@192.168.0.1';
			const repeatCount = ipEmail.length - 4; // 19 - 4 = 15
			const endOffset = ipEmail.length - 2; // 17
			const expected = ipEmail.substring(0, 2) + '*'.repeat(repeatCount) + ipEmail.substring(endOffset);
			expect(maskPII(ipEmail, mockLogger)).toBe(expected);
		});
	});

	describe('Tratamento de Erros de Conversão (Robustez)', () => {
		it('deve lançar erro e acionar o logger se a conversão para string falhar', () => {
			const throwingObj = Object.create(null);

			expect(() => maskPII(throwingObj, mockLogger)).toThrow('Impossível transicionar valor para string');
			expect(mockLogger.error).toHaveBeenCalled();
		});
	});
});
