import { type AcceptedKeysCryptoAlphabets } from '@Configs/Constants';
import { createChildLogger } from '@Configs/logger.js';
import type pino from 'pino';

/**
 * Tipo união que representa as codificações criptográficas aceitas mais 'invalid'.
 */
export type CryptographyEncodingList = AcceptedKeysCryptoAlphabets | 'invalid';

/**
 * Classe responsável pela validação e classificação de alfabetos de codificação criptográfica.
 * Analisa os padrões das strings para identificar e validar as estruturas matemáticas de chaves de alta entropia.
 */
export class EncodingAlphabetsValidations {
	private static encodingAlphabetsValidationsLogger: pino.Logger = createChildLogger({
		fileType: 'validation',
		service: 'valuation',
		module: 'EncodingAlphabetsValidations',
	});

	/**
	 * Analisa e classifica o formato de codificação de um payload de chave criptográfica.
	 * Avalia estruturas Hexadecimal, Base32, Base58 e Base64 com base em suas
	 * propriedades matemáticas, conjuntos de caracteres e regras de preenchimento (padding).
	 *
	 * @param payload - A string da chave criptográfica a ser classificada.
	 * @returns O formato de codificação classificado da `CryptographyEncodingList`, ou 'invalid' se não for reconhecido.
	 */
	public static classifyCryptographyEncodingAlphabet(payload: string): CryptographyEncodingList {
		const len = payload.length;

		// ==========================================
		// 1. FILTRO HEXADECIMAL (O mais restritivo)
		// ==========================================
		// Permite apenas caracteres hexadecimais e exige comprimento par
		const isHexChars = /^[0-9a-fA-F]+$/.test(payload);
		if (isHexChars && len % 2 === 0) {
			return 'hex';
		}

		// ==========================================
		// 2. FILTRO BASE32 (RFC 4648)
		// ==========================================
		// Permite A-Z, 2-7 e padding '=' ao final (insensível a caixa para robustez)
		const isBase32Chars = /^([A-Z2-7]+=*|[a-z2-7]+=*)$/.test(payload);
		if (isBase32Chars) {
			// Regra de alinhamento Base32: blocos de 8 caracteres.
			// Padded deve ser múltiplo de 8. Unpadded não pode sobrar 1, 3 ou 6 em mod 8.
			const mod8 = len % 8;
			const isValidBase32Length = mod8 === 0 || [2, 4, 5, 7].includes(mod8);
			if (isValidBase32Length) {
				return 'base32';
			}
		}

		// ==========================================
		// 3. FILTRO BASE58 (Bitcoin)
		// ==========================================
		// Alfanumérico misto EXCLUINDO caracteres ambíguos: 0, O, I, l
		// Não possui símbolos (+, /) e não tem padding (=)
		const isBase58Chars = /^[1-9A-HJ-NP-Za-km-z]+$/.test(payload);
		if (isBase58Chars) {
			return 'base58';
		}

		// ==========================================
		// 4. FILTRO BASE64 (RFC 4648)
		// ==========================================
		// Aceita A-Z, a-z, 0-9, +, / e até dois '=' ao final
		const isBase64Chars = /^[a-zA-Z0-9+/]+={0,2}$/.test(payload);
		if (isBase64Chars && len % 4 !== 1) {
			return 'base64';
		}

		// Se falhou em todas as restrições matemáticas dos alfabetos de alta entropia
		return 'invalid';
	}
}
