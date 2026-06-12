/**
 * @module EmailValidator
 * @description Validador de endereços de e-mail baseado nas especificações RFC 5321, RFC 5322 e W3C.
 *
 * ## Objetivo:
 * Enforça regras sintáticas (regex, limites de tamanho de 254 caracteres) e semânticas (verificação do
 * domínio DNS do e-mail através do `HostValidator`), garantindo que apenas e-mails estruturados e aptos
 * para comunicação/registro transitem pelo sistema.
 */

import { createChildLogger } from '@Configs/logger.js';
import { HostValidator } from './Host.validations.js';
import { regexEmailFormat } from '@Configs/Constants';
import z from 'zod';

/**
 * Define a política de validação do domínio do e-mail.
 * - `PUBLIC_INTERNET`: Enforça que o domínio seja um DNS de internet pública legítimo e válido no Zod.
 * - `INTERNAL_VPC`: Permite domínios internos/privados específicos da nuvem/infraestrutura.
 */
type EmailValidationPolicy = 'PUBLIC_INTERNET' | 'INTERNAL_VPC';

/**
 * @class EmailValidator
 * @description Classe utilitária estática para auditoria e validação de morfologia de emails.
 */
export class EmailValidator {
	/**
	 * Logger estruturado do validador de e-mails.
	 */
	private static emailValidationLogger = createChildLogger({
		fileType: 'validation',
		service: 'valuation',
		module: 'Email.validations',
	});

	/**
	 * Regex pragmática padrão W3C (HTML5): valida a estrutura sintática sem complexidade de grafos excessiva.
	 */
	private static emailFormatRegex = regexEmailFormat;

	/**
	 * Realiza validação estrutural completa do e-mail.
	 *
	 * ## Passos de Validação:
	 * 1. Verifica se o tipo de entrada é uma string e se o tamanho é inferior ou igual a 254 caracteres (RFC 5321).
	 * 2. Compara a morfologia com a Regex padrão W3C para validar os delimitadores (`@`, `.`).
	 * 3. Extrai e valida se a porção do domínio constitui um Host DNS legítimo (via `HostValidator`).
	 * 4. Opcional: Aplica a validação profunda do validador interno Zod em caso de política `PUBLIC_INTERNET`.
	 *
	 * @param value O valor de entrada a ser atestado.
	 * @param usePackageValidation A política de validação de rede ativa (padrão: `PUBLIC_INTERNET`).
	 * @returns Retorna true se o valor for um e-mail válido sob a política ativa, caso contrário retorna false.
	 */
	public static isValid(
		value: unknown,
		usePackageValidation: EmailValidationPolicy = 'PUBLIC_INTERNET',
	): value is string {
		const method = 'isValid' as const;
		const stringLengthExpected = 254 as const;

		if (!value || typeof value !== 'string') {
			this.emailValidationLogger.error(
				{
					method,
					error: {
						typeOfValueReceived: typeof value,
						rawValue: value,
					},
				},
				'A entrada de email deve ser uma String',
			);
			return false;
		}

		// Defesa básica de tamanho máximo (RFC 5321 define limite de 254 caracteres)
		if (value.length > stringLengthExpected) {
			this.emailValidationLogger.error(
				{
					method,
					error: {
						stringLengthExpected,
						stringLengthReceived: value.length,
					},
				},
				`Um email não pode conter mais de ${String(stringLengthExpected)} caracteres.`,
			);
			return false;
		}

		// Validação sintática rápida
		if (!this.emailFormatRegex.test(value)) {
			this.emailValidationLogger.error(
				{
					method,
					error: {
						rawValue: value,
						details: 'Incondizente com verificação básica RFC 5322',
					},
				},
				'Formato de email inválido!',
			);
			return false;
		}

		// O prefixo '_' avisa ao compilador que a variável é intencionalmente ignorada.
		// Isolação do domínio do e-mail e garantia de que ele seja um host DNS válido, primeiro elemento é ignorado pois sempre será um username
		const [_ignoredUserPart, domain = ''] = value.split('@');

		// Reaproveito do HostValidator
		const domainType = HostValidator.validateHostType(domain);

		// Em produção, e-mails corporativos/públicos legítimos devem possuir domínio DNS válido
		if (domainType !== 'DNS') return false;

		if (usePackageValidation === 'PUBLIC_INTERNET') {
			if (!this.externalValidation(value)) return false;
		}

		return true;
	}

	/**
	 * Realiza validação profunda utilizando o analisador e tratador Zod.
	 *
	 * @param value O e-mail a ser validado pelo parser do Zod.
	 * @returns Retorna true se for aprovado no parse do Zod, caso contrário false.
	 */
	private static externalValidation(value: string): boolean {
		const method: string = 'externalValidation' as const;
		const emailSchemaZod = z.email({ error: 'Email inválido' });

		const isValidEmail = emailSchemaZod.safeParse(value);

		if (!isValidEmail.success) {
			this.emailValidationLogger.error(
				{
					method,
					errors: z.treeifyError(isValidEmail.error),
				},
				`Validação zod falhou: ${isValidEmail.error}`,
			);
			return false;
		}
		return true;
	}
}
