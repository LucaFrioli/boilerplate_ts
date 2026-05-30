/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect } from 'vitest';
import { CryptographyKeysValidation } from '@Validations/CriptographyKeys.validations.js';
import { validCryptographyKeys, invalidCryptographyKeys } from '@Mocks/test.fixtures.js';

describe('CryptographyKeysValidation (Black-Box & Validação Defensiva)', () => {
	describe('Métodos Públicos (Caixa-Preta)', () => {
		describe('isValid', () => {
			it('deve rejeitar se o payload não for uma string', () => {

				expect(CryptographyKeysValidation.isValid(123456789)).toBe(false);

				expect(CryptographyKeysValidation.isValid(null)).toBe(false);

				expect(CryptographyKeysValidation.isValid({})).toBe(false);
			});

			it('deve rejeitar se o alfabeto for inválido', () => {
				expect(CryptographyKeysValidation.isValid('abc!')).toBe(false);
			});

			describe('Formato Hexadecimal', () => {
				it('deve aceitar uma chave hexadecimal válida com 64 caracteres ou mais', () => {
					expect(CryptographyKeysValidation.isValid(validCryptographyKeys.hex)).toBe(true);
				});

				it('deve rejeitar chave hexadecimal se for muito curta (< 64 caracteres)', () => {
					expect(CryptographyKeysValidation.isValid(invalidCryptographyKeys.hexTooShort)).toBe(false);
				});

				it('deve rejeitar chave hexadecimal contendo caracteres inválidos', () => {
					expect(CryptographyKeysValidation.isValid(invalidCryptographyKeys.hexBadChars)).toBe(false);
				});
			});

			describe('Formato Base64', () => {
				it('deve aceitar uma chave base64 válida com 43 caracteres ou mais', () => {
					expect(CryptographyKeysValidation.isValid(validCryptographyKeys.base64)).toBe(true);
				});

				it('deve rejeitar chave base64 se for muito curta (< 43 caracteres)', () => {
					expect(CryptographyKeysValidation.isValid(invalidCryptographyKeys.base64TooShort)).toBe(false);
				});

				it('deve rejeitar chave base64 contendo caracteres inválidos', () => {
					expect(CryptographyKeysValidation.isValid(invalidCryptographyKeys.base64BadChars)).toBe(false);
				});

				it('deve rejeitar chave base64 que decodifica para um buffer com menos de 32 bytes', () => {
					// 'A'.repeat(42) + '==' tem comprimento 44, mas decodifica para exatamente 31 bytes
					const thinBase64 = 'A'.repeat(42) + '==';
					expect(CryptographyKeysValidation.isValid(thinBase64)).toBe(false);
				});
			});

			describe('Formato Base32', () => {
				it('deve aceitar uma chave base32 válida com 52 caracteres ou mais', () => {
					expect(CryptographyKeysValidation.isValid(validCryptographyKeys.base32)).toBe(true);
				});

				it('deve rejeitar chave base32 se for muito curta (< 52 caracteres)', () => {
					expect(CryptographyKeysValidation.isValid(invalidCryptographyKeys.base32TooShort)).toBe(false);
				});

				it('deve rejeitar chave base32 contendo caracteres inválidos', () => {
					expect(CryptographyKeysValidation.isValid(invalidCryptographyKeys.base32BadChars)).toBe(false);
				});
			});

			describe('Formato Base58', () => {
				it('deve aceitar uma chave base58 válida com 44 caracteres ou mais', () => {
					expect(CryptographyKeysValidation.isValid(validCryptographyKeys.base58)).toBe(true);
				});

				it('deve rejeitar chave base58 se for muito curta (< 44 caracteres)', () => {
					expect(CryptographyKeysValidation.isValid(invalidCryptographyKeys.base58TooShort)).toBe(false);
				});

				it('deve rejeitar chave base58 contendo caracteres inválidos', () => {
					expect(CryptographyKeysValidation.isValid(invalidCryptographyKeys.base58BadChars)).toBe(false);
				});
			});
		});
	});

	describe('Defesa Interna (Garantia de Cobertura de Branches Privadas)', () => {
		it('deve rejeitar no método privado se useBuffer for ativado sem informar o encodingType', () => {
			const privateMethod = (CryptographyKeysValidation as any).validateAndExpectBuffer;
			expect(privateMethod).toBeDefined();

			// Executa a chamada forçando isToUse = true mas sem passar encodingType
			const result = privateMethod.call(
				CryptographyKeysValidation,
				'testMethod',
				validCryptographyKeys.hex,
				validCryptographyKeys.hex.length,
				64,
				/^[0-9a-fA-F]+$/,
				{ isToUse: true },
			);

			expect(result).toBe(false);
		});

		it('deve rejeitar no método privado se o buffer decodificado for menor que 32 bytes no Hex', () => {
			const privateMethod = (CryptographyKeysValidation as any).validateAndExpectBuffer;

			// Força a validação de uma string hexadecimal muito curta no buffer (8 bytes),
			// informando que o comprimento do payload atende ao limite de 64 caracteres
			const shortHex = '0123456789abcdef';
			const result = privateMethod.call(
				CryptographyKeysValidation,
				'testMethod',
				shortHex,
				64,
				64,
				/^[0-9a-fA-F]+$/,
				{ isToUse: true, encodingType: 'hex' },
			);

			expect(result).toBe(false);
		});
	});
});
