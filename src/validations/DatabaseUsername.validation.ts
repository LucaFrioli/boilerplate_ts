/**
 * @module DatabaseUsernameValidator
 * @description Validador de morfologia e padronização de usuários (usernames) de Bancos de Dados.
 *
 * ## Objetivo:
 * Enforça em tempo de execução que todas as credenciais de usuários de banco de dados sigam o padrão estrito
 * do boilerplate. Isso garante que cada banco utilize usuários segmentados por contexto de ambiente (dev/prd/stg),
 * permissão (ro/rw/adm) e identificação numérica, adicionando entropia ao final contra brute force.
 */

import { createChildLogger, type handlerContractsErrorsParams } from '@Configs/logger.js';
import { dbUsernamePattern, dbslist, type dbsAcepteds } from '@Configs/Constants';

/**
 * @class DatabaseUsernameValidator
 * @description Classe estática de validação estrutural de usernames de banco de dados.
 */
export class DatabaseUsernameValidator {
	/**
	 * Logger estruturado do validador de usernames.
	 */
	private static DBUnameValidatorLogger = createChildLogger({
		fileType: 'validation',
		service: 'valuation',
		module: 'DatabaseUsernameValidator',
	});

	/**
	 * Centraliza o tratamento e o empacotamento de erros de validação de usernames.
	 * Gera logs com gravidade contextualizada e lança erros uniformes para evitar vazamento de PII.
	 *
	 * @param params Os parâmetros da falha estrutural.
	 * @param dbname O identificador do banco de dados correspondente.
	 * @throws {Error} Sempre lança um erro detalhando o banco afetado.
	 */
	private static handlingError(params: handlerContractsErrorsParams, dbname: dbsAcepteds): never {
		if (dbname === 'envBoot' || dbslist.includes(dbname)) {
			this.DBUnameValidatorLogger[params.erroLevel](
				{ error: params.error, method: params.method },
				params.message,
			);
			throw new Error(
				`Verifique se o usuário para o banco ${dbname}, está bem configurado, respeitando a força requerida!`,
			);
		}

		this.DBUnameValidatorLogger.error(
			{ method: 'handlingError', recivedDbname: dbname },
			'Verifique se dbname está constido na seguinte lista' + dbslist.join(', '),
		);
		throw new Error('Erro crasso contate um dos canais legais');
	}

	/**
	 * Verifica se o username passado coincide com a morfologia e padrão regex exigido para conexões do sistema.
	 *
	 * @param uname A string contendo o username a ser validado.
	 * @param dbname O nome do banco de dados (usado para contexto de log e direcionamento de erros).
	 * @returns Retorna true se o username obedecer à Regex corporativa dbUsernamePattern, caso contrário retorna false.
	 * @throws {Error} Se o valor do parâmetro username não for uma string (Fail-Fast de Integridade).
	 */
	public static verifyUsername(uname: string, dbname: dbsAcepteds): boolean {
		if (typeof uname !== 'string') {
			this.handlingError(
				{
					erroLevel: 'fatal',
					method: 'verifyUsername',
					error: {
						uname,
						typeofUname: typeof uname,
					},
					message:
						'Tentativa de validar username de banco de dados sem ser uma string! Verifique o fluxo!',
				},
				dbname,
			);
		}

		return dbUsernamePattern.test(uname);
	}
}
