/* eslint-disable @typescript-eslint/only-throw-error */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/unbound-method */
/* eslint-disable @typescript-eslint/explicit-function-return-type */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { toBytes, hexToBytes, base64ToBytes, base32ToBytes, base58ToBytes } from '@Shared/Helpers/EncodingToByte.js';

// Mock logger to verify error logging without stdout noise
const { mockError } = vi.hoisted(() => ({
	mockError: vi.fn(),
}));

vi.mock('@Configs/logger.js', () => ({
	createChildLogger: () => ({
		error: mockError,
	}),
}));

describe('Shared / Utils / EncodingToByte', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe('hexToBytes()', () => {
		it('deve converter uma string hexadecimal válida para Uint8Array', () => {
			const hex = '0001020a0f10ff';
			const expected = new Uint8Array([0, 1, 2, 10, 15, 16, 255]);
			expect(hexToBytes(hex)).toEqual(expected);
		});

		it('deve lidar com hexadecimal em letras maiúsculas', () => {
			const hex = 'A1B2C3D4';
			const expected = new Uint8Array([161, 178, 195, 212]);
			expect(hexToBytes(hex)).toEqual(expected);
		});
	});

	describe('base64ToBytes()', () => {
		it('deve converter uma string Base64 válida com padding', () => {
			// "hello" em Base64 é "aGVsbG8="
			const base64 = 'aGVsbG8=';
			const expected = new TextEncoder().encode('hello');
			expect(base64ToBytes(base64)).toEqual(expected);
		});

		it('deve converter uma string Base64 válida sem padding', () => {
			const base64 = 'aGVsbG8';
			const expected = new TextEncoder().encode('hello');
			expect(base64ToBytes(base64)).toEqual(expected);
		});
	});

	describe('base32ToBytes()', () => {
		it('deve decodificar strings Base32 RFC 4648 padrão', () => {
			// "MZXW6YTBOI======" é "foobar" em Base32
			const base32 = 'MZXW6YTBOI======';
			const expected = new TextEncoder().encode('foobar');
			expect(base32ToBytes(base32)).toEqual(expected);
		});

		it('deve ser insensível a maiúsculas e minúsculas', () => {
			const base32 = 'mzxw6ytboi';
			const expected = new TextEncoder().encode('foobar');
			expect(base32ToBytes(base32)).toEqual(expected);
		});

		it('deve rejeitar caracteres inválidos na Base32', () => {
			// '8' e '9' não fazem parte da Base32 padrão
			expect(() => base32ToBytes('MZXW6YTBOI89')).toThrow(
				/Caractere Base32 inválido detectado no payload:/
			);
		});

		it('deve cobrir a salvaguarda de caractere indefinido (falsy) via duck-typing', () => {
			const customBase32 = {
				toUpperCase() { return this; },
				replace() { return this; },
				length: 3,
				0: 'M',
				// Índice 1 ausente
				2: 'Z'
			} as unknown as string;

			// M = 12, Z = 25 -> 12 * 32 + 25 = 409 -> binário correspondente [102] (bytesLength = 1)
			expect(base32ToBytes(customBase32)).toEqual(new Uint8Array([102]));
		});
	});

	describe('base58ToBytes()', () => {
		it('deve retornar Uint8Array vazio para string vazia', () => {
			expect(base58ToBytes('')).toEqual(new Uint8Array(0));
		});

		it('deve decodificar strings Base58 válidas (Bitcoin Alphabet)', () => {
			// "USmTe" decodifica para "test"
			const base58 = 'USmTe';
			const expected = new Uint8Array([18, 130, 246, 209]);
			expect(base58ToBytes(base58)).toEqual(expected);
		});

		it('deve preservar zeros à esquerda representados pelo caractere "1"', () => {
			// "111USmTe" deve conter três bytes zeros à esquerda + "test"
			const base58 = '111USmTe';
			const expected = new Uint8Array([0, 0, 0, 18, 130, 246, 209]);
			expect(base58ToBytes(base58)).toEqual(expected);
		});

		it('deve decodificar string Base58 resultando em hex de comprimento ímpar', () => {
			// '3' representa o valor decimal 2, que em hex é '2' (comprimento 1, ímpar)
			expect(base58ToBytes('3')).toEqual(new Uint8Array([2]));
		});

		it('deve rejeitar caracteres inválidos da Base58 (ex: 0, O, I, l)', () => {
			expect(() => base58ToBytes('USmTe0')).toThrow(
				/Caractere Base58 inválido detectado no payload:/
			);
		});

		it('deve cobrir a salvaguarda de caractere indefinido (falsy) via duck-typing', () => {
			const customBase58 = {
				length: 3,
				0: 'U',
				// Índice 1 ausente
				2: 'S'
			} as unknown as string;

			// U = 27, S = 25 -> 27 * 58 + 25 = 1591 -> hex '637' -> binário [6, 55]
			expect(base58ToBytes(customBase58)).toEqual(new Uint8Array([6, 55]));
		});

		it('deve cobrir o fallback lógico hexSegment || "0" interceptando substring', () => {
			const originalSubstring = String.prototype.substring;
			// Força o retorno de string vazia temporariamente para simular falha de partição
			String.prototype.substring = () => '';
			try {
				const result = base58ToBytes('3');
				expect(result).toEqual(new Uint8Array([0])); // parseou '0' devido ao || '0'
			} finally {
				String.prototype.substring = originalSubstring;
			}
		});
	});

	describe('toBytes()', () => {
		it('deve rotear e decodificar hexadecimal automaticamente', () => {
			const value = 'a1b2c3d4';
			const expected = new Uint8Array([161, 178, 195, 212]);
			expect(toBytes(value)).toEqual(expected);
		});

		it('deve rotear e decodificar base64 automaticamente', () => {
			const value = 'aGVsbG8=';
			const expected = new TextEncoder().encode('hello');
			expect(toBytes(value)).toEqual(expected);
		});

		it('deve rotear e decodificar base32 automaticamente', () => {
			const value = 'mzxw6ytboi';
			const expected = new TextEncoder().encode('foobar');
			expect(toBytes(value)).toEqual(expected);
		});

		it('deve rotear e decodificar base58 automaticamente', () => {
			const value = 'USmTe';
			const expected = new Uint8Array([18, 130, 246, 209]);
			expect(toBytes(value)).toEqual(expected);
		});

		it('deve usar TextEncoder (UTF-8) como fallback para strings normais/não estruturadas', () => {
			const value = 'texto normal de teste';
			const expected = new TextEncoder().encode(value);
			expect(toBytes(value)).toEqual(expected);
		});

		it('deve capturar, registrar no logger e relançar erro estruturado se houver falha crítica de decodificação', () => {
			const value = 'aGVsbG8='; // Identificado como Base64

			// Forçamos o atob global a dar erro
			vi.spyOn(globalThis, 'atob').mockImplementationOnce(() => {
				throw new Error('Simulated Base64 Failure');
			});

			expect(() => toBytes(value)).toThrow(
				/Falha estrutural ao tentar decodificar payload BASE64: Simulated Base64 Failure/
			);

			expect(mockError).toHaveBeenCalledWith(
				expect.objectContaining({
					method: 'toBytes',
					formatDetected: 'base64',
					valueLength: value.length,
					error: expect.any(Error),
				}),
				'Erro crítico na decodificação de string para bytes.'
			);
		});

		it('deve converter erro não-instância de Error para Error genérico no catch', () => {
			const value = 'aGVsbG8=';
			vi.spyOn(globalThis, 'atob').mockImplementationOnce(() => {
				throw 'Raw String Error';
			});

			expect(() => toBytes(value)).toThrow(
				/Falha estrutural ao tentar decodificar payload BASE64: Raw String Error/
			);
		});
	});
});
