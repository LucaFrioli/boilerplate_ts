import z from 'zod';
import {
	supportedCriptograpyEngineModes,
	supportedCriptographySimetricAlgs,
	supportedCriptographyAsimetricAlgs,
	supportedDigestCriptographyAlgs,
	supportedCipherAlgs,
	regexValidationToHexadecimalKeyMinimalRequire,
	regexValidationToBase64KeyMinimalRequire,
} from '../constants/env.constants.js';

// 1. Schemas de chaves seguras utilizando 'error' compatível com o seu workspace
const hexKeySchema = z.string().regex(regexValidationToHexadecimalKeyMinimalRequire, {
	error: 'A chave deve ser uma string de pelo menos 64 caracteres hexadecimais (32 bytes).',
});

const base64KeySchema = z.string().regex(regexValidationToBase64KeyMinimalRequire, {
	error: 'A chave deve ser uma string Base64 válida de no mínimo 43 caracteres (32 bytes).',
});

// Reutilizável: União segura Hex/Base64 de alta entropia
const secureCryptographicKeySchema = z.union([hexKeySchema, base64KeySchema], {
	error: () => ({
		message:
			'A chave deve ser codificada em Hexadecimal ou Base64 válido contendo pelo menos 256 bits (32 bytes) de entropia para evitar força bruta.',
	}),
});

export const criptographyEnvValidationSchema = z.object({
	CRIPTOGRAPHY_ENGINE_MODE: z.enum(supportedCriptograpyEngineModes, {
		error: `Defina uma engine de criptografia válida contida dentro desta lista: ${supportedCriptograpyEngineModes.join(', ')}`,
	}),

	CRIPTOGRAPHY_PASSWORDS_ALGORITHM: z.enum(supportedCriptographySimetricAlgs, {
		error: `O algoritmo de senhas deve estar dentro da lista de um dos seguintes suportados: ${supportedCriptographySimetricAlgs.join(', ')}`,
	}),

	CRIPTOGRAPHY_PASSWORDS_DIGESTOR: z.enum(supportedDigestCriptographyAlgs, {
		error: `O algoritmo digestor de senhas deve estar dentro da lista de um dos seguintes suportados: ${supportedDigestCriptographyAlgs.join(', ')}`,
	}),

	CRIPTOGRAPHY_SIGNATURE_ALGORITHM: z.enum(supportedCriptographyAsimetricAlgs, {
		error: `O algoritmo de assinatura deve estar dentro da lista de um dos seguintes suportados: ${supportedCriptographyAsimetricAlgs.join(', ')}`,
	}),

	CRIPTOGRAPHY_SINGATURE_DIGESTOR: z
		.enum(supportedDigestCriptographyAlgs, {
			error: `O algoritmo digestor de assinaturas deve estar dentro da lista de um dos seguintes suportados: ${supportedDigestCriptographyAlgs.join(', ')}`,
		})
		.optional(),

	CIPHER_ALGORITHM: z.enum(supportedCipherAlgs, {
		error: `O algoritmo de cifras deve estar dentro da lista de um dos seguintes suportados: ${supportedCipherAlgs.join(', ')}`,
	}),

	// 2. Chaves de alta entropia blindadas contra caracteres especiais e shell issues
	CRIPTOGRAPHY_SECURITY_PEPPER: secureCryptographicKeySchema,
	CIPHER_MASTER_KEY: secureCryptographicKeySchema,
});
