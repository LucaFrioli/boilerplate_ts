import { createChildLogger } from '@Configs/logger.js';
import { passwordStrength } from '@Validations/Password.validations.js';
import type pino from 'pino';

export class DatabasePasswordValidation {
	private static pwdDatabaseLogger = createChildLogger({
		fileType: 'util',
		module: 'DatabasePassword',
		service: 'util',
	});

	private static determineResult(result: unknown): boolean {
		if (typeof result !== 'boolean') {
			const patternedMsg = 'Erro interno resultado deve ser booleano';
			this.pwdDatabaseLogger.debug(
				{
					typeofExpected: 'boolean',
					typeRecived: typeof result,
				},
				patternedMsg,
			);
			throw new Error(patternedMsg);
		}

		return result;
	}

	/**
	 * isValid
	 * @param password - valor de entrada que será validado
	 * @param [logger=null] - Caso queira utilizar um logger ddiferente do interno, ele poderá ser injetado aqui
	 *
	 * Esta validação é considerada uma 0 level dentro do sistema
	 */
	public static isValid(password: unknown, logger: pino.Logger | null = null): boolean {
		if (typeof password !== 'string') {
			const patternedMsg = 'Env maculada ou mal configurada!';
			const useLogger = logger ? logger : this.pwdDatabaseLogger;
			useLogger.fatal(
				{
					typeofExpected: 'string',
					typeRecived: typeof password,
				},
				patternedMsg,
			);
			throw new Error(patternedMsg);
		}

		if (process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test') {
			return this.determineResult(passwordStrength(password));
		}

		if (password.length < 15) {
			this.pwdDatabaseLogger.fatal(
				{ length: password.length },
				'A senha do banco de dados em produção deve ser configurada com ao menos 15 caracters',
			);
			return false;
		}

		return this.determineResult(
			passwordStrength(password, { securityLevel: 'strong', personalize: false }),
		);
	}
}
