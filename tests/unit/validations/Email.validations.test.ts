import { describe, it, expect } from 'vitest';
import { EmailValidator } from '@Validations/Email.validations.js';

describe('EmailValidator (Black-Box)', () => {
	describe('Validação de Tipos e Inputs Nulos/Vazios', () => {
		it('deve retornar false para valores nulos ou indefinidos', () => {
			expect(EmailValidator.isValid(null)).toBe(false);
			expect(EmailValidator.isValid(undefined)).toBe(false);
		});

		it('deve retornar false para valores não textuais', () => {
			expect(EmailValidator.isValid(123)).toBe(false);
			expect(EmailValidator.isValid(true)).toBe(false);
			expect(EmailValidator.isValid({})).toBe(false);
			expect(EmailValidator.isValid([])).toBe(false);
		});

		it('deve retornar false para strings vazias', () => {
			expect(EmailValidator.isValid('')).toBe(false);
			expect(EmailValidator.isValid('   ')).toBe(false);
		});
	});

	describe('Defesa de Tamanho Máximo', () => {
		it('deve rejeitar e-mails com comprimento maior que 254 caracteres', () => {
			// 245 caracteres locais + 10 caracteres de '@gmail.com' = 255 caracteres
			const longLocalPart = 'a'.repeat(245);
			const longEmail = `${longLocalPart}@gmail.com`;
			expect(longEmail.length).toBe(255);
			expect(EmailValidator.isValid(longEmail)).toBe(false);
		});

		it('deve aceitar e-mails com exatamente 254 caracteres', () => {
			// 244 caracteres locais + 10 caracteres de '@gmail.com' = 254 caracteres
			const longLocalPart = 'a'.repeat(244);
			const longEmail = `${longLocalPart}@gmail.com`;
			expect(longEmail.length).toBe(254);
			expect(EmailValidator.isValid(longEmail, 'INTERNAL_VPC')).toBe(true);
		});
	});

	describe('Validação de Formato Sintático (Regex)', () => {
		it('deve aceitar e-mails em formato alfanumérico padrão', () => {
			expect(EmailValidator.isValid('usuario.comum@provedor.com')).toBe(true);
			expect(EmailValidator.isValid('user+filtro@empresa.com.br')).toBe(true);
		});

		it('deve rejeitar e-mails sem caractere @', () => {
			expect(EmailValidator.isValid('usuario.comum.provedor.com')).toBe(false);
		});

		it('deve rejeitar e-mails com múltiplos caracteres @', () => {
			expect(EmailValidator.isValid('usuario@comum@provedor.com')).toBe(false);
		});

		it('deve rejeitar e-mails sem a parte local', () => {
			expect(EmailValidator.isValid('@provedor.com')).toBe(false);
		});

		it('deve rejeitar e-mails sem a parte do domínio', () => {
			expect(EmailValidator.isValid('usuario@')).toBe(false);
		});

		it('deve rejeitar e-mails com pontos consecutivos na parte local', () => {
			expect(EmailValidator.isValid('usuario..comum@provedor.com')).toBe(false);
		});

		it('deve rejeitar e-mails com hífens inválidos no início/fim de subdomínios', () => {
			expect(EmailValidator.isValid('usuario@dominio-.com')).toBe(false);
			expect(EmailValidator.isValid('usuario@-dominio.com')).toBe(false);
		});

		it('deve rejeitar e-mails com caracteres inválidos no domínio', () => {
			expect(EmailValidator.isValid('usuario@dom_inio.com')).toBe(false);
			expect(EmailValidator.isValid('usuario espaço@provedor.com')).toBe(false);
		});
	});

	describe('Validação do Tipo de Domínio (HostValidator)', () => {
		it('deve rejeitar e-mails com domínio IPv4', () => {
			expect(EmailValidator.isValid('usuario@192.168.0.1')).toBe(false);
		});

		it('deve rejeitar e-mails com domínio IPv6', () => {
			expect(EmailValidator.isValid('usuario@::1')).toBe(false);
		});

		it('deve rejeitar e-mails com domínios inválidos ou inexistentes do ponto de vista de rede', () => {
			expect(EmailValidator.isValid('usuario@dominio_invalido')).toBe(false);
		});
	});

	describe('Validação de Pacotes Externos (Zod integration)', () => {
		it('deve passar e-mails legítimos pela validação adicional do Zod por padrão', () => {
			expect(EmailValidator.isValid('usuario@empresa.com')).toBe(true);
		});

		it('deve rejeitar e-mails se a validação externa falhar (ex: localhost com usePackageValidation = true)', () => {
			// HostValidator aceita localhost como DNS válido, mas o validador nativo do Zod rejeita por falta de TLD.
			expect(EmailValidator.isValid('usuario@localhost', 'PUBLIC_INTERNET')).toBe(false);
		});

		it('deve aceitar e-mails se a validação externa for desabilitada (ex: localhost com usePackageValidation = false)', () => {
			expect(EmailValidator.isValid('usuario@localhost', 'INTERNAL_VPC')).toBe(true);
		});
	});
});
