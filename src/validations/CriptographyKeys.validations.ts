import {
	regexValidationToBase64KeyMinimalRequire,
	regexValidationToHexadecimalKeyMinimalRequire,
	regexValidationToBase32KeyMinimalRequire,
	regexValidationToBase58KeyMinimalRequire,
} from '@Configs/Constants';
import { createChildLogger } from '@Configs/logger.js';
import {
	type CryptographyEncodingList,
	EncodingAlphabetsValidations,
} from './EncondingAlphabets.validations.js';

/**
 * Classe de validação para chaves criptográficas.
 * Garante que as chaves usadas para o boot do sistema, geração de pepper e outras tarefas
 * de criptografia estejam em conformidade com regras estritas de segurança, requisitos mínimos de entropia
 * e alfabetos de codificação válidos.
 */
export class CryptographyKeysValidation {
	private static criptoValidationLogger = createChildLogger({
		fileType: 'validation',
		service: 'valuation',
		module: 'CryptographyKeyValidation',
	});

	/**
	 * Valida se o payload fornecido é uma chave criptográfica segura e de alta entropia.
	 * Classifica o alfabeto de codificação da chave (Hex, Base32, Base58, Base64) e aplica
	 * propriedades matemáticas específicas, comprimento mínimo de string e capacidade mínima de bytes brutos.
	 *
	 * @param payload - O payload da chave criptográfica a ser validado.
	 * @returns True se a chave for válida e garantir o requisito de boot seguro do sistema, caso contrário, false.
	 */
	public static isValid(payload: unknown): boolean {
		const method = 'isValid' as const;
		if (typeof payload !== 'string') {
			this.criptoValidationLogger.fatal(
				{
					method,
					expectedType: 'string',
					receivedType: typeof payload,
				},
				'A chave criptográfica obrigatoriamente precisa ser uma string',
			);
			return false;
		}

		const payloadAlphabetClass: CryptographyEncodingList =
			EncodingAlphabetsValidations.classifyCryptographyEncodingAlphabet(payload);
		const payloadLength: number = payload.length;

		switch (payloadAlphabetClass) {
			case 'hex':
				return this.validateAndExpectBuffer(
					method,
					payload,
					payloadLength,
					64,
					regexValidationToHexadecimalKeyMinimalRequire,
					{
						isToUse: true,
						encodingType: 'hex',
					},
				);
			case 'base64':
				return this.validateAndExpectBuffer(
					method,
					payload,
					payloadLength,
					43,
					regexValidationToBase64KeyMinimalRequire,
					{
						isToUse: true,
						encodingType: 'base64',
					},
				);
			case 'base32':
				return this.validateAndExpectBuffer(
					method,
					payload,
					payloadLength,
					52,
					regexValidationToBase32KeyMinimalRequire,
				);
			case 'base58':
				return this.validateAndExpectBuffer(
					method,
					payload,
					payloadLength,
					44,
					regexValidationToBase58KeyMinimalRequire,
				);
			case 'invalid':
			default:
				return false;
		}
	}

	/**
	 * Valida as restrições de comprimento da chave, verifica a capacidade de bytes brutos usando Buffers (se necessário)
	 * e realiza a validação por expressão regular para impor os caracteres e a entropia.
	 *
	 * @param methodChaining - O nome do método chamador para rastreabilidade nos logs.
	 * @param payload - A string da chave criptográfica.
	 * @param payloadLength - O comprimento da string da chave.
	 * @param payloadExpectedLength - O comprimento mínimo de string permitido.
	 * @param regexValidation - A expressão regular estrita a ser aplicada.
	 * @param useBuffer - Configuração opcional para habilitar a checagem da capacidade de bytes brutos.
	 * @returns True se todos os critérios forem atendidos, caso contrário, false.
	 */
	private static validateAndExpectBuffer(
		methodChaining: string,
		payload: string,
		payloadLength: number,
		payloadExpectedLength: number,
		regexValidation: RegExp,
		useBuffer: {
			isToUse: boolean;
			encodingType?: BufferEncoding;
		} = { isToUse: false },
	): boolean {
		const method = 'validateAndExpectBuffer';
		if (payloadLength < payloadExpectedLength) {
			this.criptoValidationLogger.fatal(
				{
					methodChaining,
					method,
					expectedLength: `A chave deve ser de ${String(payloadExpectedLength)} caracteres ou maior`,
					realLength: String(payloadLength),
				},
				'Tamanho de chave inseguro',
			);
			return false;
		}

		if (useBuffer.isToUse) {
			if (!useBuffer.encodingType) {
				this.criptoValidationLogger.fatal(
					{
						methodChaining,
						method,
						typeofEncodingType: typeof useBuffer.encodingType,
					},
					'É necessário passar um tipo de encoding para validar o buffer',
				);
				return false;
			}

			if (Buffer.from(payload, useBuffer.encodingType).length < 32) {
				this.criptoValidationLogger.fatal({
					methodChaining,
					method,
					bufferExpected: 'O buffer deve ser maior ou igual a 32 bytes',
					receivedBuffer: `Infelizmente foi recebida uma string com buffer de ${String(Buffer.from(payload, useBuffer.encodingType).length)} bytes`,
				});
				return false;
			}
		}

		return regexValidation.test(payload);
	}
}
