import z from 'zod';
import {
	supportedCryptographyEngineModes,
	supportedCryptographySimetricAlgs,
	supportedCryptographyAsimetricAlgs,
	supportedDigestCryptographyAlgs,
	supportedCipherAlgs,
} from '../constants/env.constants.js';
import { CryptographyKeysValidation } from '@Validations/CriptographyKeys.validations.js';

// Reutilizável: União segura Hex/Base64 de alta entropia
const secureCryptographicKeySchema = z.string().refine((val) => {
	return CryptographyKeysValidation.isValid(val);
}, 'Verifique se o pepper criptográfico confere aos padrões de segurança requeridos para aplicação, a chave no mínimo deve conter 256 bits');

export const criptographyEnvValidationSchema = z.object({
	CRIPTOGRAPHY_ENGINE_MODE: z.enum(supportedCryptographyEngineModes, {
		error: `Defina uma engine de criptografia válida contida dentro desta lista: ${supportedCryptographyEngineModes.join(', ')}`,
	}),

	CRIPTOGRAPHY_PASSWORDS_ALGORITHM: z.enum(supportedCryptographySimetricAlgs, {
		error: `O algoritmo de senhas deve estar dentro da lista de um dos seguintes suportados: ${supportedCryptographySimetricAlgs.join(', ')}`,
	}),

	CRIPTOGRAPHY_PASSWORDS_DIGESTOR: z.enum(supportedDigestCryptographyAlgs, {
		error: `O algoritmo digestor de senhas deve estar dentro da lista de um dos seguintes suportados: ${supportedDigestCryptographyAlgs.join(', ')}`,
	}),

	CRIPTOGRAPHY_SIGNATURE_ALGORITHM: z.enum(supportedCryptographyAsimetricAlgs, {
		error: `O algoritmo de assinatura deve estar dentro da lista de um dos seguintes suportados: ${supportedCryptographyAsimetricAlgs.join(', ')}`,
	}),

	CRIPTOGRAPHY_SINGATURE_DIGESTOR: z
		.enum(supportedDigestCryptographyAlgs, {
			error: `O algoritmo digestor de assinaturas deve estar dentro da lista de um dos seguintes suportados: ${supportedDigestCryptographyAlgs.join(', ')}`,
		})
		.optional(),

	CIPHER_ALGORITHM: z.enum(supportedCipherAlgs, {
		error: `O algoritmo de cifras deve estar dentro da lista de um dos seguintes suportados: ${supportedCipherAlgs.join(', ')}`,
	}),

	// 2. Chaves de alta entropia blindadas contra caracteres especiais e shell issues
	CRIPTOGRAPHY_SECURITY_PEPPER: secureCryptographicKeySchema,
	CIPHER_MASTER_KEY: secureCryptographicKeySchema,
});
