/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unused-vars */
import { describe, it, expect } from 'vitest';
import { criptographyEnvValidationSchema } from '@Configs/schemas/criptography.schema.js';

describe('criptography.schema (Black-Box)', () => {
	// Chaves de alta entropia perfeitamente válidas (32 bytes brutas)
	const validHexKey = 'a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2'; // Exatamente 64 caracteres hex
	const validBase64Key = 'YWJiY2NkZGVlZmZnZ2hoaWlqamtrbGxtbW5ub29wcHFycnNzdHV1dnd3eHg='; // Exatamente 60 caracteres base64 válidos (terminando com '=')
	const validBase64KeyNoPadding = 'YWJiY2NkZGVlZmZnZ2hoaWlqamtrbGxtbW5ub29wcHFycnNzdHV1dnd3eHg'; // Sem padding

	const validPayload = {
		CRIPTOGRAPHY_ENGINE_MODE: 'sync_node',
		CRIPTOGRAPHY_DERIVATION_KEY_ALGORITHM: 'hkdf',
		CRIPTOGRAPHY_DERIVATION_KEY_SALT: 32,
		CRIPTOGRAPHY_PASSWORDS_ALGORITHM: 'hmac',
		CRIPTOGRAPHY_PASSWORDS_DIGESTOR: 'sha256',
		CRIPTOGRAPHY_SIGNATURE_ALGORITHM: 'ed25519',
		CRIPTOGRAPHY_SINGATURE_DIGESTOR: 'sha384',
		CIPHER_ALGORITHM: 'aes-256-gcm',
		CRIPTOGRAPHY_SECURITY_PEPPER: validHexKey,
		CIPHER_MASTER_KEY: validHexKey
	};

	it('deve parsear com sucesso um payload criptográfico perfeitamente válido com chaves hexadecimais', () => {
		const result = criptographyEnvValidationSchema.safeParse(validPayload);
		expect(result.success).toBe(true);
	});

	it('deve parsear com sucesso utilizando chaves Base64 válidas (com e sem padding)', () => {
		const payloadWithBase64 = {
			...validPayload,
			CRIPTOGRAPHY_SECURITY_PEPPER: validBase64Key,
			CIPHER_MASTER_KEY: validBase64KeyNoPadding
		};
		const result = criptographyEnvValidationSchema.safeParse(payloadWithBase64);
		expect(result.success).toBe(true);
	});

	it('deve parsear com sucesso se CRIPTOGRAPHY_SINGATURE_DIGESTOR for omitido (campo opcional)', () => {
		const { CRIPTOGRAPHY_SINGATURE_DIGESTOR, ...payloadWithoutSignatureDigest } = validPayload;
		const result = criptographyEnvValidationSchema.safeParse(payloadWithoutSignatureDigest);
		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data.CRIPTOGRAPHY_SINGATURE_DIGESTOR).toBeUndefined();
		}
	});

	it('deve rejeitar uma engine de criptografia não suportada', () => {
		const payload = { ...validPayload, CRIPTOGRAPHY_ENGINE_MODE: 'invalid_engine' };
		const result = criptographyEnvValidationSchema.safeParse(payload);
		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error.issues[0]?.message).toContain('Defina uma engine de criptografia válida contida dentro desta lista');
		}
	});

	it('deve rejeitar um algoritmo de derivação de chaves não suportado', () => {
		const payload = { ...validPayload, CRIPTOGRAPHY_DERIVATION_KEY_ALGORITHM: 'pbkdf2' };
		const result = criptographyEnvValidationSchema.safeParse(payload);
		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error.issues[0]?.message).toContain('Defina um algoritimo de derivação de chave válido presente nesta lista');
		}
	});

	it('deve rejeitar um algoritmo de senha não suportado', () => {
		const payload = { ...validPayload, CRIPTOGRAPHY_PASSWORDS_ALGORITHM: 'bcrypt_direct' };
		const result = criptographyEnvValidationSchema.safeParse(payload);
		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error.issues[0]?.message).toContain('O algoritmo de senhas deve estar dentro da lista de um dos seguintes suportados');
		}
	});

	it('deve rejeitar um digestor de senha não suportado', () => {
		const payload = { ...validPayload, CRIPTOGRAPHY_PASSWORDS_DIGESTOR: 'md5' };
		const result = criptographyEnvValidationSchema.safeParse(payload);
		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error.issues[0]?.message).toContain('O algoritmo digestor de senhas deve estar dentro da lista de um dos seguintes suportados');
		}
	});

	it('deve rejeitar um algoritmo de assinatura assimétrica não suportado', () => {
		const payload = { ...validPayload, CRIPTOGRAPHY_SIGNATURE_ALGORITHM: 'rsa' };
		const result = criptographyEnvValidationSchema.safeParse(payload);
		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error.issues[0]?.message).toContain('O algoritmo de assinatura deve estar dentro da lista de um dos seguintes suportados');
		}
	});

	it('deve rejeitar um digestor de assinatura não suportado', () => {
		const payload = { ...validPayload, CRIPTOGRAPHY_SINGATURE_DIGESTOR: 'sha1' };
		const result = criptographyEnvValidationSchema.safeParse(payload);
		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error.issues[0]?.message).toContain('O algoritmo digestor de assinaturas deve estar dentro da lista de um dos seguintes suportados');
		}
	});

	it('deve rejeitar um algoritmo de cifra não suportado', () => {
		const payload = { ...validPayload, CIPHER_ALGORITHM: 'blowfish' };
		const result = criptographyEnvValidationSchema.safeParse(payload);
		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error.issues[0]?.message).toContain('O algoritmo de cifras deve estar dentro da lista de um dos seguintes suportados');
		}
	});

	describe('Validação de Chaves de Alta Entropia (Pepper e Master Key)', () => {
		it('deve rejeitar se o PEPPER for uma string fraca ou curta', () => {
			const payload = { ...validPayload, CRIPTOGRAPHY_SECURITY_PEPPER: 'chave_pequena' };
			const result = criptographyEnvValidationSchema.safeParse(payload);
			expect(result.success).toBe(false);
			if (!result.success) {
				expect(result.error.issues[0]?.message).toContain('Verifique se o pepper criptográfico confere aos padrões de segurança requeridos para aplicação, a chave no mínimo deve conter 256 bits');
			}
		});

		it('deve rejeitar se o PEPPER for uma chave de comprimento insuficiente (42 caracteres)', () => {
			const insufficientKey = 'YWJiY2NkZGVlZmZnZ2hoaWlqamtrbGxtbW5ub29wcQ'; // Exatamente 42 caracteres
			const payload = { ...validPayload, CRIPTOGRAPHY_SECURITY_PEPPER: insufficientKey };
			const result = criptographyEnvValidationSchema.safeParse(payload);
			expect(result.success).toBe(false);
		});

		it('deve rejeitar se a MASTER_KEY for uma string fraca ou curta', () => {
			const payload = { ...validPayload, CIPHER_MASTER_KEY: 'minha_master_key_fraca' };
			const result = criptographyEnvValidationSchema.safeParse(payload);
			expect(result.success).toBe(false);
			if (!result.success) {
				expect(result.error.issues[0]?.message).toContain('Verifique se o pepper criptográfico confere aos padrões de segurança requeridos para aplicação, a chave no mínimo deve conter 256 bits');
			}
		});

		it('deve rejeitar se a MASTER_KEY possuir caracteres inválidos de cifragem', () => {
			// Contém caracteres especiais que invalidam Base64/Hex como '#' ou '$'
			const invalidCharsKey = 'a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b#';
			const payload = { ...validPayload, CIPHER_MASTER_KEY: invalidCharsKey };
			const result = criptographyEnvValidationSchema.safeParse(payload);
			expect(result.success).toBe(false);
		});
	});

	describe('Validação do Salt de Derivação (CRIPTOGRAPHY_DERIVATION_KEY_SALT)', () => {
		it('deve rejeitar se o SALT for menor que 32', () => {
			const payload = { ...validPayload, CRIPTOGRAPHY_DERIVATION_KEY_SALT: 31 };
			const result = criptographyEnvValidationSchema.safeParse(payload);
			expect(result.success).toBe(false);
		});

		it('deve rejeitar se o SALT for maior que 64', () => {
			const payload = { ...validPayload, CRIPTOGRAPHY_DERIVATION_KEY_SALT: 65 };
			const result = criptographyEnvValidationSchema.safeParse(payload);
			expect(result.success).toBe(false);
		});

		it('deve coagir com sucesso uma string numérica para number', () => {
			const payload = { ...validPayload, CRIPTOGRAPHY_DERIVATION_KEY_SALT: '48' as any };
			const result = criptographyEnvValidationSchema.safeParse(payload);
			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data.CRIPTOGRAPHY_DERIVATION_KEY_SALT).toBe(48);
			}
		});
	});
});
