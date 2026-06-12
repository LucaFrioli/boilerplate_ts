/**
 * @module DatabasePasswordValidation
 * @description Validador especializado em conformidade e força de senhas de Banco de Dados.
 *
 * ## Objetivo:
 * Garante que as credenciais de banco de dados cadastradas ou configuradas nas variáveis
 * de ambiente (especialmente em ambientes de produção) sigam as políticas mais rígidas de
 * segurança corporativa (como tamanho mínimo de 15 caracteres e alta entropia), prevenindo
 * ataques de força bruta e comprometimento de infraestrutura.
 */

import { createChildLogger } from '@Configs/logger.js';
import { passwordStrength } from '@Validations/Password.validations.js';
import type pino from 'pino';

/**
 * @class DatabasePasswordValidation
 * @description Classe utilitária estática para validação robusta de senhas de conexões com banco de dados.
 */
export class DatabasePasswordValidation {
	/**
	 * Logger estruturado do validador de senhas de banco de dados.
	 */
	private static pwdDatabaseLogger = createChildLogger({
		fileType: 'util',
		module: 'DatabasePassword',
		service: 'util',
	});

	/**
	 * Garante que o retorno do validador subjacente seja estritamente booleano (Defensive Programming).
	 *
	 * @param result O resultado bruto retornado pelo motor de força de senha.
	 * @returns O mesmo resultado assegurado como boolean.
	 * @throws {Error} Se o resultado não for booleano, indicando corrupção nas dependências de validação.
	 */
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
	 * Valida se a senha fornecida para o banco de dados atende às políticas de segurança exigidas pelo ambiente.
	 *
	 * ## Regras Aplicadas:
	 * - **Produção:** Mínimo de 15 caracteres e entropia classificada como "strong" (mistura de maiúsculas, minúsculas, números e símbolos).
	 * - **Desenvolvimento / Teste:** Passa pelas regras de força de senha padrão (permitindo senhas mais curtas para conveniência).
	 *
	 * @param password O valor correspondente à senha a ser validada (deve ser string).
	 * @param logger Opcional. Instância de Logger externo para correlação de traces.
	 * @returns Retorna true se a senha for aprovada nos critérios do ambiente, caso contrário retorna false.
	 * @throws {Error} Se o valor do parâmetro password for diferente de string (Fail-Fast de Integridade).
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
