/**
 * @module EncodingToByte
 * @description Utilitário compartilhado de infraestrutura para decodificação agnóstica de runtime.
 *
 * ## Filosofia e Design:
 * 1. **Independência de Engine (Universal/Edge):** Evita o uso do construtor global `Buffer` do Node.js,
 *    permitindo que as conversões funcionem de forma idêntica e rápida no navegador, Cloudflare Workers
 *    ou ambientes baseados em V8 Isolates.
 * 2. **Prevenção de Bugs Conceituais:** Fornece tradução real de strings estruturadas (Hex, Base64, etc.)
 *    de volta para seus bytes binários nativos (`Uint8Array`), prevenindo o erro comum de aplicar
 *    `TextEncoder` diretamente em representações textuais de chaves de alta entropia.
 */

import { EncodingAlphabetsValidations } from '@Validations/EncondingAlphabets.validations.js';
import { createChildLogger } from '@Configs/logger.js';

/**
 * Logger estruturado e contextualizado para auditorias de segurança do módulo de codificação.
 */
const encodingLogger = createChildLogger({
	fileType: 'util',
	module: 'EncodingToByte',
	service: 'cryptography',
});

/**
 * Decodifica uma string representada em formato Hexadecimal para um array de bytes brutas (`Uint8Array`).
 * Cada par de caracteres hexadecimais (ex: '0a') é convertido em exatamente 1 byte.
 *
 * @param hex - A string hexadecimal a ser convertida. Deve possuir comprimento par.
 * @returns Um array tipado contendo os bytes decodificados correspondentes.
 * @throws {Error} Se a string hexadecimal tiver tamanho ímpar ou caracteres inválidos (tratado pelo parser superior).
 */
export function hexToBytes(hex: string): Uint8Array<ArrayBuffer> {
	const len = hex.length;
	const bytes = new Uint8Array(len / 2);
	for (let i = 0; i < len; i += 2) {
		bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16);
	}
	return bytes;
}

/**
 * Decodifica uma string codificada em Base64 (RFC 4648) para um array de bytes brutas (`Uint8Array`).
 * Utiliza o método nativo `atob` suportado universalmente em navegadores e runtimes modernos de servidor.
 * Remove caracteres de preenchimento ('=') à direita de forma segura antes da tradução.
 *
 * @param base64 - A string Base64 a ser convertida.
 * @returns Um array tipado contendo os bytes decodificados correspondentes.
 */
export function base64ToBytes(base64: string): Uint8Array<ArrayBuffer> {
	const binString = atob(base64.replace(/=+$/, ''));
	const bytes = new Uint8Array(binString.length);
	for (let i = 0; i < binString.length; i++) {
		bytes[i] = binString.charCodeAt(i);
	}
	return bytes;
}

/**
 * Decodifica uma string codificada em Base32 (RFC 4648) para um array de bytes brutas (`Uint8Array`).
 * Agrupa bits em blocos de 5 bits por caractere.
 * Suporta caixa alta/baixa de forma insensível e descarta preenchimentos '=' automáticos.
 *
 * @param base32 - A string Base32 a ser convertida.
 * @returns Um array tipado contendo os bytes decodificados correspondentes.
 * @throws {Error} Se um caractere fora do alfabeto Base32 (A-Z, 2-7) for detectado.
 */
export function base32ToBytes(base32: string): Uint8Array<ArrayBuffer> {
	const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
	const cleaned = base32.toUpperCase().replace(/=+$/, '');
	const len = cleaned.length;
	const bytes = new Uint8Array(Math.floor((len * 5) / 8));

	let buffer = 0;
	let next = 0;
	let byteIndex = 0;

	for (let i = 0; i < len; i++) {
		const char = cleaned[i];
		if (!char) continue;
		const val = alphabet.indexOf(char);
		if (val === -1) {
			throw new Error(`Caractere Base32 inválido detectado no payload: ${char}`);
		}

		buffer = (buffer << 5) | val;
		next += 5;

		if (next >= 8) {
			bytes[byteIndex++] = (buffer >> (next - 8)) & 0xff;
			next -= 8;
		}
	}

	return bytes;
}

/**
 * Decodifica uma string codificada em Base58 (Alfabeto Bitcoin/Flickr) para um array de bytes brutas (`Uint8Array`).
 * Utiliza aritmética de precisão arbitrária (`BigInt`) para a conversão de base numérica sem perda de precisão.
 * Preserva explicitamente a quantidade de zeros à esquerda (mapeados a partir do caractere '1' do alfabeto Base58).
 *
 * @param base58 - A string Base58 a ser convertida.
 * @returns Um array tipado contendo os bytes decodificados correspondentes.
 * @throws {Error} Se um caractere fora do alfabeto Base58 (sem 0, O, I, l) for detectado.
 */
export function base58ToBytes(base58: string): Uint8Array<ArrayBuffer> {
	const alphabet = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
	if (base58.length === 0) return new Uint8Array(0);

	// 1. Contar caracteres '1' (que equivalem a bytes zero à esquerda)
	let zeroes = 0;
	while (zeroes < base58.length && base58[zeroes] === '1') {
		zeroes++;
	}

	// 2. Converter base 58 para BigInt (Base 256)
	let value = 0n;
	const base = 58n;
	for (let i = 0; i < base58.length; i++) {
		const char = base58[i];
		if (!char) continue;
		const index = alphabet.indexOf(char);
		if (index === -1) {
			throw new Error(`Caractere Base58 inválido detectado no payload: ${char}`);
		}
		value = value * base + BigInt(index);
	}

	// 3. Extrair os bytes correspondentes do BigInt
	const hex = value.toString(16);
	const bytesLength = Math.ceil(hex.length / 2);
	const bytes = new Uint8Array(zeroes + bytesLength);

	// Preencher os bytes de controle de zeros à esquerda
	for (let i = 0; i < zeroes; i++) {
		bytes[i] = 0;
	}

	// Traduzir a representação hexadecimal interna do BigInt para a array de bytes
	let hexPos = hex.length % 2 === 1 ? -1 : 0;
	for (let i = 0; i < bytesLength; i++) {
		const start = Math.max(0, hexPos);
		const end = hexPos + 2;
		const hexSegment = hex.substring(start, end);
		bytes[zeroes + i] = parseInt(hexSegment || '0', 16);
		hexPos += 2;
	}

	return bytes;
}

/**
 * Traduz automaticamente uma string de chave criptográfica para seus bytes originais correspondentes.
 * Analisa e classifica o alfabeto da string no ar e aplica a rotina matemática ideal de decodificação.
 * Envolve a decodificação em uma camada defensiva de log e tratamento de erros.
 *
 * ## Comportamento de Fallback:
 * Caso o formato não seja nenhum alfabeto de alta entropia estruturado (Hex, Base64, Base32, Base58),
 * a string será convertida como texto convencional em codificação de caracteres UTF-8.
 *
 * @param value - A string de dados ou chave a ser processada.
 * @returns O array tipado contendo os bytes brutos resultantes.
 * @throws {Error} Caso a decodificação matemática detecte dados corrompidos.
 */
export function toBytes(value: string): Uint8Array<ArrayBuffer> {
	const method = 'toBytes' as const;
	const format = EncodingAlphabetsValidations.classifyCryptographyEncodingAlphabet(value);

	try {
		switch (format) {
			case 'hex':
				return hexToBytes(value);
			case 'base64':
				return base64ToBytes(value);
			case 'base32':
				return base32ToBytes(value);
			case 'base58':
				return base58ToBytes(value);
			default:
				return new TextEncoder().encode(value);
		}
	} catch (e) {
		const error = e instanceof Error ? e : new Error(String(e));

		encodingLogger.error(
			{
				method,
				formatDetected: format,
				error,
				valueLength: value.length,
			},
			'Erro crítico na decodificação de string para bytes.',
		);

		throw new Error(
			`Falha estrutural ao tentar decodificar payload ${format.toUpperCase()}: ${error.message}`,
			{ cause: e },
		);
	}
}
