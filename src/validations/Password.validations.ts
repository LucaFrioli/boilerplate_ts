/**
 * @module PasswordValidation
 * @description Mecanismo utilitário para medição de entropia e validação de força de senhas (passwords).
 *
 * ## Objetivo:
 * Fornece políticas pré-configuradas e seguras (Low, Medium, Strong) baseadas em comprimentos físicos,
 * variedade de alfabetos (minúsculas, maiúsculas, numéricos e símbolos) e análise de repetições,
 * permitindo também customizações específicas de acordo com os requisitos de negócio ou banco de dados.
 */

import validator from 'validator';
import { createChildLogger } from '@Configs/logger.js';

/**
 * Parâmetros de configuração para a validação de força de senha.
 */
type passwordStrengthParams = {
	/** Nível de segurança pré-configurado a ser aplicado ('low', 'medium', 'strong'). */
	securityLevel: 'low' | 'medium' | 'strong';
	/** Habilita o uso de um esquema de validação personalizado passado em `strengthSchema`. */
	personalize: boolean;
	/** Esquema com as restrições customizadas de validação de senha. Requerido se `personalize` for true. */
	strengthSchema?: passwordStrengthValues;
};

/**
 * Detalhes estruturais de validação de força de senha aplicados pelo validador.
 */
type passwordStrengthValues = {
	/** Comprimento mínimo exigido em número de caracteres. */
	minLength: number;
	/** Quantidade mínima exigida de letras minúsculas (a-z). */
	minLowercase?: number;
	/** Quantidade mínima exigida de letras maiúsculas (A-Z). */
	minUppercase?: number;
	/** Quantidade mínima exigida de algarismos numéricos (0-9). */
	minNumbers?: number;
	/** Quantidade mínima exigida de caracteres especiais ou símbolos. */
	minSymbols?: number;
	/** Se setado para true, retorna boolean. Caso contrário, retorna um score numérico de pontuação. */
	returnScore?: boolean;
	/** Fator de penalidade aplicado a cada caractere repetido consecutivamente. */
	pointsPerRepeat?: number;
	/** Multiplicador de bônus por variedade e quantidade de caracteres únicos. */
	pointsPerUnique?: number;
};

/**
 * Verifica se a senha atende aos requisitos mínimos de complexidade e entropia com base no nível configurado.
 *
 * ## Níveis de Segurança Padrão:
 * - **low:** Mínimo de 6 caracteres, pelo menos 1 minúscula, 1 maiúscula, 1 número.
 * - **medium:** Mínimo de 8 caracteres, pelo menos 1 minúscula, 1 maiúscula, 1 número, 1 símbolo.
 * - **strong:** Mínimo de 15 caracteres, pelo menos 3 minúsculas, 3 maiúsculas, 3 números, 3 símbolos.
 *
 * @param value A string contendo a senha a ser avaliada.
 * @param options Configurações de política de validação (padrão: nível médio sem personalização).
 * @returns Retorna um boolean indicando aprovação, ou um score numérico se configurado pelo esquema customizado.
 * @throws {Error} Se `personalize` for true mas nenhum `strengthSchema` for fornecido.
 */
function passwordStrength(
	value: string,
	options: passwordStrengthParams = { securityLevel: 'medium', personalize: false },
): boolean | number {
	const passwordValidationLogger = createChildLogger({
		module: 'password',
		fileType: 'validation',
		service: 'util',
	});
	const errorMessagePrefix = '[Development - ](Password validation module - passwordStrength) ';

	if (typeof value !== 'string') {
		passwordValidationLogger.warn(`${errorMessagePrefix} A senha deve ser uma string`);
		return false;
	}

	if (Object.hasOwn(options, 'personalize') && options.personalize) {
		try {
			if (!Object.hasOwn(options, 'strengthSchema'))
				throw new Error(
					'Caso você deseje alterar a validação de senha deve-se passar obrigatóriamente o objeto com suas customizações.',
				);
			const isStrong = validator.isStrongPassword(value, options.strengthSchema);
			return isStrong;
		} catch (e) {
			passwordValidationLogger.error({ error: e }, errorMessagePrefix);
			throw e;
		}
	}

	let defaultschema: passwordStrengthValues;
	switch (options.securityLevel) {
		case 'low':
			defaultschema = {
				minLength: 6,
				minLowercase: 1,
				minUppercase: 1,
				minNumbers: 1,
				minSymbols: 0,
			};
			break;

		case 'strong':
			defaultschema = {
				minLength: 15,
				minLowercase: 3,
				minUppercase: 3,
				minNumbers: 3,
				minSymbols: 3,
				pointsPerRepeat: 1,
				pointsPerUnique: 1,
			};
			break;

		case 'medium':
			defaultschema = {
				minLength: 8,
				minLowercase: 1,
				minNumbers: 1,
				minUppercase: 1,
				minSymbols: 1,
				pointsPerRepeat: 0.5,
				pointsPerUnique: 1,
			};
			break;

		default:
			passwordValidationLogger.warn(
				`${errorMessagePrefix} É preciso caso não haja personalização passar ao menos um nível de segurança!`,
			);
			return false;
	}

	const isStrong = validator.isStrongPassword(value, defaultschema);

	return isStrong;
}

export { passwordStrength };
