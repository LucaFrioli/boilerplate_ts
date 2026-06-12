/**
 * @module UsernameValidator
 * @description Validador estrutural e estético para Nomes de Usuário (Usernames) considerados PII.
 *
 * ## Objetivo:
 * Enforça em tempo de execução que os usernames de usuários finais possuam tamanhos consistentes,
 * utilizem caracteres válidos e especiais (como ponto, hífen e sublinhado) de maneira não-consecutiva,
 * e sem começar ou terminar com caracteres especiais, prevenindo ataques de enumeração ou confusão na UI.
 */

import { maskPII } from '@Masks';
import { regexUsernameFormat } from '@Configs/Constants';
import { createChildLogger } from '@Configs/logger.js';
import type pino from 'pino';

/**
 * @class UsernameValidator
 * @description Classe utilitária estática para validação de usernames da aplicação.
 */
export class UsernameValidator {
	/**
	 * Logger estruturado do validador de usernames PII.
	 */
	private static unameValidationLogger: pino.Logger = createChildLogger({
		fileType: 'validation',
		service: 'pii',
		module: 'UsernameValidator',
	});

	/**
	 * Definições formais das regras estéticas e morfológicas para documentação e auditoria.
	 */
	private static readonly rules = {
		minLength: 3 as const,
		maxLength: 30 as const,
		enabledChars: [
			'a até z',
			'A até Z',
			'0 até 9 (podendo ser repetidos consecutivamente)',
		] as const,
		enabledSpecialChars: ['.', '-', '_'] as const,
		formalizationRules: [
			'O username não pode começar ou terminar com ".", "-" ou "_".',
			'Os caracteres especiais não podem vir em sequência.',
			'O Username deve ter de 3 a 30 caracteres que se enquadram dentro da lista de caracteres e caracteres especiais ativos.',
		] as const,
	};

	/**
	 * Expressão regular de morfologia e estrutura do username.
	 */
	private static unameRegexFormat = regexUsernameFormat;

	/**
	 * Valida se um valor de entrada atende estritamente às regras estruturais de segurança
	 * e estética exigidas para um Nome de Usuário (Username) corporativo.
	 *
	 * @param rawValue O valor de entrada a ser atestado.
	 * @returns Retorna true se for uma string válida sob as regras morfológicas, caso contrário false.
	 */
	public static isValid(rawValue: unknown): boolean {
		const methodName = 'isValid';

		if (typeof rawValue !== 'string') {
			this.unameValidationLogger.error(
				{
					methodName,
					typeofRawValue: typeof rawValue,
					expectedType: 'string',
					value: maskPII(rawValue, this.unameValidationLogger),
				},
				'O Username deve ser uma string',
			);
			return false;
		}

		const match = this.unameRegexFormat.test(rawValue);

		if (!match) {
			this.unameValidationLogger.warn(
				{
					methodName,
					rulesApplied: this.rules,
					rawValue: maskPII(rawValue, this.unameValidationLogger),
				},
				'Falha na validação estrutural do Username (Regex Non-Match)',
			);
		}

		return match;
	}

	/**
	 * Retorna as regras formais e estéticas aplicadas na validação do Username.
	 * Útil para telemetria externa, enriquecimento de respostas da API e documentação dinâmica.
	 *
	 * @returns Um objeto estruturado contendo a descrição das regras ativas.
	 */
	public static getFormalRules(): object {
		return {
			requirements: this.rules.formalizationRules,
			allowedSpecialCharacters: this.rules.enabledSpecialChars,
			limits: {
				min: this.rules.minLength,
				max: this.rules.maxLength,
			},
		};
	}
}
