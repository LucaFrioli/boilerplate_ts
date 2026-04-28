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

import { createChildLogger } from '@Configs/logger.js';
import type { Brand } from './brand.type.js';
import { CpfValidator } from '@Validations/Cpf.validations.js';
import { env } from '@Configs/env.js';
import { cpf_raw_regexp } from '@Configs/constants/env.constants.js';

const piiLogger = createChildLogger({ fileType: 'type', module: 'PII', service: 'typo' });

export function maskPII(rawValue: unknown): string {
	try {
		String(rawValue);
	} catch (e) {
		piiLogger.error(
			{
				call: 'maskPII',
				typeofRawValue: typeof rawValue,
				error: e,
			},
			'Foi impossível transformar o valor em string',
		);
		throw new Error(
			'Impossível transicionar valor para string, atenção contate um administradorpor meio dos canias legais: ' +
				env.EMAIL_TO_CONTACT,
			{ cause: e },
		);
	}

	const onString = String(rawValue);

	return (
		onString.substring(0, 2) +
		'*'.repeat(onString.length - 4) +
		onString.substring(onString.length - 2, onString.length)
	);
}

/**
 * ValidCPF - cpf validado matemáticamente e sem máscaras.
 * Para validar corretamente utilezaz a função **`isValidCPF`**
 */
export type ValidCPF = Brand<string, 'ValidCPF'>;
export function isValidCPF(rawValue: unknown): rawValue is ValidCPF {
	const maskStringErrorMsg = 'String de entrada não corresponde a um CPF limpo';
	if (typeof rawValue !== 'string') {
		piiLogger.error(
			{
				function: 'isValidCPF',
				value: maskPII(rawValue),
				typeOfRawValue: typeof rawValue,
			},
			'Tentativa de validaçãode cpf, com valor diferente de uma string',
		);
		return false;
	}

	try {
		if (!cpf_raw_regexp.test(rawValue)) {
			piiLogger.error(
				{
					function: 'isValidCPF',
					value: maskPII(rawValue.replace(/\D/g, '')),
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
						? maskPII(rawValue.replace(/\D/g, ''))
						: maskPII(rawValue),
			},
			'Número de CPF Inválido',
		);
		return false;
	}
	return true;
}
