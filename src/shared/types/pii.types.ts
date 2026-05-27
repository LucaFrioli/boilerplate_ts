/**
 * @module PII
 * PII - Personally Identifiable Information
 *
 * Este módulo centraliza os tipos de dados e funções de validação que representam
 * Informações Pessoais Identificáveis (PII) dentro do ecossistema do sistema.
 *
 * Seguindo a filosofia "Parse, Don't Validate", utilizamos Branded Types para garantir
 * que valores sensíveis não validados matematicamente ou sintaticamente fiquem impedidos
 * de transitar pelas camadas internas do domínio.
 *
 * Padrões de Segurança Ativos:
 * - Unidirecionalidade: Sem importações de infraestrutura externa (ex: env.ts).
 * - Higienização (Anti-Data-Leak): Todos os logs gerados em caso de falha de validação
 *   são estruturados e possuem mascaramento ativo via `maskPII` para conformidade com a LGPD/GDPR.
 *
 * Exemplos:
 * - Documentos Governamentais (CPF, CNPJ, CF, PIV, EIN, SSN, CIN)
 * - Contatos (E-mail, Celular, Fax)
 * - Chaves Naturais / Identificadores Externos
 * - Web3 Identifiers (Wallet Addresses, ENS Names, DIDs)
 * - Identificadores internos (Usernames)
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
 * Logger de PII corporativo e centralizado.
 *
 * **ATENÇÃO: A constante deste logger só deve ser importada diretamente dentro de testes automatizados**
 * Para fins de auditoria estrutural e segurança.
 *
 * @private
 * @type {pino.Logger}
 */
export const piiLogger: pino.Logger = createChildLogger({
	fileType: 'type',
	module: 'PII',
	service: 'typo',
});

/**
 * **ValidCPF**
 *
 * Representa um CPF matematicamente válido, limpo e sem formatação (apenas os 11 dígitos numéricos).
 * Utiliza Branded Typing (`Brand`) para evitar que strings brutas não-validadas passem por camadas core.
 *
 * Para obter ou validar este tipo, utilize a função de guarda {@link isValidCPF}.
 *
 * @category Types
 * @typedef {Brand<string, 'ValidCPF'>} ValidCPF
 */
export type ValidCPF = Brand<string, 'ValidCPF'>;

/**
 * Valida se um valor de entrada corresponde a um CPF limpo e matematicamente válido,
 * marcando o tipo como {@link ValidCPF} se for aprovado.
 *
 * ### Regras de Validação:
 * 1. O valor de entrada deve ser estritamente uma string.
 * 2. O formato deve conter exatamente 11 caracteres puramente numéricos (sem pontos, barras ou traços).
 * 3. Deve passar com sucesso nos algoritmos matemáticos dos dígitos verificadores (Módulo 11).
 *
 * ### Observabilidade e Higienização (LGPD):
 * Caso ocorra um erro de tipo ou falha matemática, um log de nível `error` é emitido para {@link piiLogger}.
 * Para evitar vazamento passivo de dados no disco rígido, o CPF enviado é mascarado automaticamente.
 *
 * @param {unknown} rawValue - O valor bruto a ser validado.
 * @returns {rawValue is ValidCPF} True se for um CPF matematicamente válido e limpo, false caso contrário.
 *
 * @example
 * const cpfInput: unknown = '12345678909';
 * if (isValidCPF(cpfInput)) {
 *   // 'cpfInput' agora é tipado e aceito como ValidCPF nesta ramificação
 *   await userRepository.saveCpf(cpfInput);
 * }
 */
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
 * **ValidEmail**
 *
 * Representa um endereço de e-mail sintaticamente válido em conformidade com as especificações da RFC 5322.
 * Evita o trânsito de endereços de correio eletrônico incorretos ou maliciosos nas camadas de domínio.
 *
 * Para obter ou validar este tipo, utilize {@link isValidEmail} ou {@link assertValidEmail}.
 *
 * @category Types
 * @typedef {Brand<string, 'ValidEmail'>} ValidEmail
 */
export type ValidEmail = Brand<string, 'ValidEmail'>;

/**
 * Valida de forma condicional se a entrada corresponde a um e-mail com estrutura correta
 * e a tipa como {@link ValidEmail}.
 *
 * Ideal para validações condicionais e controle de fluxo lógico (ex: rotas públicas ou opcionais).
 *
 * ### Regras de Validação:
 * - Deve ser uma string.
 * - Deve estar em conformidade com as regras sintáticas descritas no `EmailValidator.isValid` + (Zod interno).
 *
 * ### Higienização de Logs:
 * Erros de tipo geram logs sanitizados com mascaramento robusto do e-mail recusado.
 *
 * @param {unknown} rawValue - O valor bruto a ser validado.
 * @returns {rawValue is ValidEmail} True se o formato for válido, false caso contrário.
 *
 * @example
 * const emailInput: unknown = 'dev@empresa.com';
 * if (isValidEmail(emailInput)) {
 *   await sendConfirmation(emailInput);
 * }
 */
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

/**
 * Assegura (Assert) que a entrada corresponde a um e-mail válido, aplicando um portão Fail-Fast estrutural.
 *
 * Recomendado para fluxos transacionais altamente críticos onde a presença de um dado inválido deve
 * interromper a execução do runtime imediatamente (ex: persistência no banco de dados ou autenticação).
 *
 * ### Observabilidade de Falha:
 * Registra um log de gravidade `fatal` com a estrutura do erro e o payload mascarado antes de lançar o erro físico.
 *
 * @param {unknown} rawValue - O valor a ser asseverado.
 * @throws {Error} Lança uma exceção "Entrada de email inválida" caso a validação falhe.
 *
 * @example
 * function processTransaction(payload: any) {
 *   assertValidEmail(payload.email);
 *   // A partir daqui, payload.email é garantido como sendo do tipo ValidEmail pelo TS
 *   db.save(payload.email);
 * }
 */
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

/**
 * **ValidUsernamePii**
 *
 * Representa um nome de usuário (username) sintaticamente válido, seguro contra ReDoS
 * e livre de ataques de injeção ou caracteres especiais perigosos.
 *
 * Garante rastreabilidade e unicidade nas chaves de identificação do usuário.
 * Para obter este tipo, utilize {@link isValidUsernamePii} ou {@link assertValidUsernamePii}.
 *
 * @category Types
 * @typedef {Brand<string, 'ValidUsernamePii'>} ValidUsernamePii
 */
export type ValidUsernamePii = Brand<string, 'ValidUsernamePii'>;

/**
 * Valida se um valor de entrada corresponde ao formato padronizado de um Username PII
 * e atribui o tipo {@link ValidUsernamePii}.
 *
 * ### Morfologia Padrão de Segurança:
 * - **Tamanho:** De 3 a 30 caracteres.
 * - **Caracteres Aceitos:** Letras maiúsculas/minúsculas ASCII, algarismos numéricos e separadores específicos (`.`, `-`, `_`).
 * - **Restrições Especiais:**
 *   - Não pode iniciar ou terminar com separadores.
 *   - Separadores especiais não podem vir consecutivamente (`..`, `__`, `.-`, etc.).
 *   - Não aceita caracteres acentuados ou cedilhas (rejeita caracteres Não-ASCII).
 *
 * ### Higienização e LGPD:
 * Se recusado, emite um log do tipo `warn` com a estrutura das regras sintáticas violadas
 * obtidas de `UsernameValidator.getFormalRules()` e mascara a string recusada.
 *
 * @param {unknown} rawValue - O valor bruto do nome de usuário a ser validado.
 * @returns {rawValue is ValidUsernamePii} True se corresponder à morfologia segura, false caso contrário.
 *
 * @example
 * const usernameInput: unknown = 'User-ExamPle_02.jhon';
 * if (isValidUsernamePii(usernameInput)) {
 *   registerAccount(usernameInput);
 * }
 */
export function isValidUsernamePii(rawValue: unknown): rawValue is ValidUsernamePii {
	const functionName = 'isValidUsernamePii';
	const defaultMessage = 'Entrada de Username Inválida';

	if (typeof rawValue !== 'string') return false;

	if (!UsernameValidator.isValid(rawValue)) {
		piiLogger.warn(
			{
				functionName,
				errors: UsernameValidator.getFormalRules(),
				valueEntry: maskPII(rawValue, piiLogger),
			},
			defaultMessage,
		);
		return false;
	}

	return true;
}

/**
 * Assegura (Assert) que o valor corresponde a um Username válido, disparando um portão Fail-Fast estrutural.
 *
 * Impede que fluxos sensíveis de criação ou atualização transitem dados de username corrompidos ou mal-formados.
 *
 * ### Observabilidade de Falha:
 * Registra um log do tipo `fatal` contendo o manifesto de regras morfológicas vigentes
 * (`UsernameValidator.getFormalRules()`) e o valor original devidamente mascarado.
 *
 * @param {unknown} rawValue - O valor a ser asseverado.
 * @throws {Error} Lança um erro "Username inválido por gentileza confira sua morfologia" se inválido.
 *
 * @example
 * function updateProfile(payload: any) {
 *   assertValidUsernamePii(payload.username);
 *   // A partir daqui, payload.username é garantido como sendo do tipo ValidUsernamePii
 *   profileService.update(payload.username);
 * }
 */
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
			value: maskPII(rawValue, piiLogger),
		},
		defaultMessage,
	);

	throw new Error(defaultMessage);
}
