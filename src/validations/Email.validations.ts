import { createChildLogger } from '@/configs/logger.js';
import { HostValidator } from './Host.validations.js';
import { regexEmailFormat } from '@Configs/constants/env.constants.js';
import z from 'zod';

type EmailValidationPolicy = 'PUBLIC_INTERNET' | 'INTERNAL_VPC';

export class EmailValidator {
	private static emailValidationLogger = createChildLogger({
		fileType: 'validation',
		service: 'valuation',
		module: 'Email.validations',
	});

	// Regex pragmática padrão W3C (HTML5): valida a estrutura sem complexidade excessiva
	private static emailFormatRegex = regexEmailFormat;

	/**
	 * **isValid**
	 *
	 * @param value - unknow entry, pois não sabemos a entrada externa para a validação
	 * @param usePackageValidation [='PUBLIC_INTERNET' default] - deve ser uma das strings literais seguintes **'PUBLIC_INTERNET'** ou **'INTERNAL_VPC'**
	 * @returns `boolean` - define value is a `string`
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
