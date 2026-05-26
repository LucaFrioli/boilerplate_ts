/**
 * Descrição para conveniência futura, saber oq colocar aqui!
 * @module PII
 * PII - Personally Identifiable Information
 *
 * Este módulo centraliza tipos de dados que podem identificar, direta ou indiretamente,
 * um usuário (Pessoa Física ou Jurídica) dentro do sistema.
 *
 * Exemplos:
 * - Documentos Governamentais (CPF, CNPJ, CF, PIV, EIN, SSN, CIN)
 * - Contatos (E-mail, Celular, Fax)
 * - Chaves Naturais / Identificadores Externos
 * - Web3 Identifiers (Wallet Addresses, ENS Names, DIDs)
 */

import type { Brand } from './brand.type.js';
import { createChildLogger } from '@Configs/logger.js';
import { cpf_raw_regexp } from '@Configs/constants/env.constants.js';
import { CpfValidator } from '@Validations/Cpf.validations.js';
import { EmailValidator } from '@Validations/Email.validations.js';
import { UsernameValidator } from '@Validations/UsernamePII.validations.js';
import { maskPII } from '@Masks';
import type pino from 'pino';

/**
 * **A constante deste logger só deve ser importada dentro de testes automatizados**
 */
export const piiLogger: pino.Logger = createChildLogger({
	fileType: 'type',
	module: 'PII',
	service: 'typo',
});

/**
 * ValidCPF - cpf validado matemáticamente e sem máscaras.
 * Para validar corretamente utilezar a função **`isValidCPF`**
 */
export type ValidCPF = Brand<string, 'ValidCPF'>;
export function isValidCPF(rawValue: unknown): rawValue is ValidCPF {
	const maskStringErrorMsg = 'String de entrada não corresponde a um CPF limpo';
	if (typeof rawValue !== 'string') {
		piiLogger.error(
			{
				function: 'isValidCPF',
				value: maskPII(rawValue, piiLogger),
				typeOfRawValue: typeof rawValue,
			},
			'Tentativa de validação de cpf, com valor diferente de uma string',
		);
		return false;
	}

	try {
		if (!cpf_raw_regexp.test(rawValue)) {
			piiLogger.error(
				{
					function: 'isValidCPF',
					value: maskPII(rawValue.replace(/\D/g, ''), piiLogger),
					typeofValue: typeof rawValue,
				},
				maskStringErrorMsg,
			);

			throw new Error(maskStringErrorMsg);
		}

		CpfValidator.validateAndSanitize(rawValue, false);
	} catch (e) {
		piiLogger.error(
			{
				error: e,
				rawValue:
					e instanceof Error && e.message === maskStringErrorMsg
						? maskPII(rawValue.replace(/\D/g, ''), piiLogger)
						: maskPII(rawValue, piiLogger),
			},
			'Número de CPF Inválido',
		);
		return false;
	}
	return true;
}

/**
 * ValidEmail - permite de além de cobri casos de borda com zod,
 * cobrir de maneira estrutural dentro do nosso próprio sistema,
 * tornando o código ligeiramente mais agnóstico
 *
 *  - Use **isValidEmail** para verificar se o email é um pii válido e permitido
 * para transitar dentro da aplicação de forma condicional;
 *
 * - Use **assertValidEmail** para fluxos críticos onde automaticamente devemos tipar e
 * garantir a integridade do dado, e acionar um erro caso não for;
 */
export type ValidEmail = Brand<string, 'ValidEmail'>;
export function isValidEmail(rawValue: unknown): rawValue is ValidEmail {
	const functionName = 'isValidEmail' as const;
	if (typeof rawValue !== 'string') {
		piiLogger.error(
			{
				functionName,
				value: maskPII(rawValue, piiLogger),
				typeofRawvalue: typeof rawValue,
				expectedType: 'string',
			},
			'Tentativa de validação de um email Diferente de uma string',
		);
		return false;
	}

	return EmailValidator.isValid(rawValue);
}

export function assertValidEmail(rawValue: unknown): asserts rawValue is ValidEmail {
	const fnucntionName = 'assertValidEmail' as const;
	const defaultMessage: string = 'Entrada de email inválida';

	if (isValidEmail(rawValue)) return;

	piiLogger.fatal(
		{
			fnucntionName,
			value: maskPII(rawValue, piiLogger),
			typeofRawValue: typeof rawValue,
		},
		defaultMessage,
	);
	throw new Error(defaultMessage);
}


export type ValidUsernamePii = Brand<string, 'ValidUsernamePii'>;
export function isValidUsernamePii(rawValue: unknown): rawValue is ValidUsernamePii {
	const functionName = 'isValidUsernamePii';
	const defaultMessage = 'Entrada de Username Inválida';

	if (typeof rawValue !== 'string') return false;

	if (!UsernameValidator.isValid(rawValue)) {
		piiLogger.warn({
			functionName,
			errors: UsernameValidator.getFormalRules(),
			valueEntry: maskPII(rawValue, piiLogger),
		}, defaultMessage);
		return false;
	}

	return true;
}

export function assertValidUsernamePii(rawValue: unknown): asserts rawValue is ValidUsernamePii {
	const functioName = 'assertValidUsernamePii';
	const defaultMessage = 'Username inválido por gentileza confira sua morfologia';
	if (isValidUsernamePii(rawValue)) return;

	piiLogger.fatal(
		{
			functioName,
			typeofRawVAlue: typeof rawValue,
			typeofExpected: 'string',
			validationRules: UsernameValidator.getFormalRules(),
			value: maskPII(rawValue, piiLogger)
		},
		defaultMessage
	);

	throw new Error(defaultMessage);
}
