import { describe, it, expect } from 'vitest';
import { EncodingAlphabetsValidations } from '@Validations/EncondingAlphabets.validations.js';
import { validCryptographyKeys, invalidCryptographyKeys } from '@Mocks/test.fixtures.js';

describe('EncodingAlphabetsValidations', () => {
	describe('Método classifyCryptographyEncodingAlphabet', () => {
		describe('Filtro Hexadecimal', () => {
			it('deve classificar corretamente uma string hexadecimal válida de tamanho par', () => {
				expect(
					EncodingAlphabetsValidations.classifyCryptographyEncodingAlphabet(
						validCryptographyKeys.hex,
					),
				).toBe('hex');
			});

			it('deve classificar como base64 se a string for hexadecimal mas de tamanho ímpar (caindo na branch len % 2 !== 0)', () => {
				// '000' tem apenas caracteres hex, mas comprimento 3 (ímpar).
				// Como '0' é inválido na Base32 e Base58, ela pula esses filtros e cai no filtro Base64.
				// Como 3 % 4 === 3 !== 1, ela é classificada como base64.
				expect(
					EncodingAlphabetsValidations.classifyCryptographyEncodingAlphabet('000'),
				).toBe('base64');
			});
		});

		describe('Filtro Base32', () => {
			it('deve classificar corretamente uma string base32 válida', () => {
				expect(
					EncodingAlphabetsValidations.classifyCryptographyEncodingAlphabet(
						validCryptographyKeys.base32,
					),
				).toBe('base32');
			});

			it('deve falhar na classificação de base32 e retornar invalid se o comprimento mod 8 for inválido (1, 3 ou 6)', () => {
				// 'O' repetido 9 vezes (comprimento 9, mod 8 === 1).
				// 'O' é válido em Base32, mas inválido em Base58 (caractere ambíguo).
				// Comprimento 9 mod 4 === 1, logo também falha no filtro Base64, retornando 'invalid'.
				const badLengthBase32 = 'O'.repeat(9);
				expect(
					EncodingAlphabetsValidations.classifyCryptographyEncodingAlphabet(badLengthBase32),
				).toBe('invalid');
			});
		});

		describe('Filtro Base58', () => {
			it('deve classificar corretamente uma string base58 válida', () => {
				expect(
					EncodingAlphabetsValidations.classifyCryptographyEncodingAlphabet(
						validCryptographyKeys.base58,
					),
				).toBe('base58');
			});

			it('deve desconsiderar base58 se contiver caracteres ambíguos (como 0, O, I, l)', () => {
				expect(
					EncodingAlphabetsValidations.classifyCryptographyEncodingAlphabet(
						invalidCryptographyKeys.base58BadChars,
					),
				).toBe('invalid');
			});
		});

		describe('Filtro Base64', () => {
			it('deve classificar corretamente uma string base64 válida', () => {
				expect(
					EncodingAlphabetsValidations.classifyCryptographyEncodingAlphabet(
						validCryptographyKeys.base64,
					),
				).toBe('base64');
			});

			it('deve desconsiderar base64 e retornar invalid se o comprimento mod 4 for igual a 1 (RFC 4648 length restriction)', () => {
				// '+' repetido 5 vezes (comprimento 5, mod 4 === 1).
				// '+' é válido em Base64, mas inválido em Hex, Base32 e Base58.
				const badLengthBase64 = '+'.repeat(5);
				expect(
					EncodingAlphabetsValidations.classifyCryptographyEncodingAlphabet(badLengthBase64),
				).toBe('invalid');
			});
		});

		describe('Casos de Falha Geral', () => {
			it('deve retornar invalid para chaves contendo caracteres totalmente inválidos em todos os alfabetos', () => {
				expect(
					EncodingAlphabetsValidations.classifyCryptographyEncodingAlphabet(
						invalidCryptographyKeys.hexBadChars,
					),
				).toBe('invalid');

				expect(
					EncodingAlphabetsValidations.classifyCryptographyEncodingAlphabet(
						invalidCryptographyKeys.base32BadChars,
					),
				).toBe('invalid');

				expect(
					EncodingAlphabetsValidations.classifyCryptographyEncodingAlphabet(
						invalidCryptographyKeys.base64BadChars,
					),
				).toBe('invalid');
			});
		});
	});
});
