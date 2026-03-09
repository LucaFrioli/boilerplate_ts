import validator from 'validator';
import { createChildLogger } from '@Configs/logger.js';

type passwordStrengthParams = {
	securityLevel: 'low' | 'medium' | 'strong';
	personalize: boolean;
	strengthSchema?: passwordStrengthValues;
};

type passwordStrengthValues = {
	minLength: number; // senha deve ter pelo menos x caracteres
	minLowercase?: number; // pelo menos x letra minúscula
	minUppercase?: number; // pelo menos x letra maiúscula
	minNumbers?: number; // pelo menos x número
	minSymbols?: number; // pelo menos x símbolo/caractere especial
	returnScore?: boolean; // retorna true/false em vez de pontuação
	pointsPerRepeat?: number; // penaliza repetições
	pointsPerUnique?: number; // bônus por variedade
};

// Verifica a força de uma senha, com termos pré definidos, porém permitindo poseteriormente personalização caso necessário
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
