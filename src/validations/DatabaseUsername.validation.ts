import { createChildLogger, type handlerContractsErrorsParams } from '@Configs/logger.js';
import {
	dbUsernamePattern,
	enableMemDatabaseConnections,
	enabledDatabaseConections,
} from '@Configs/constants/env.constants.js';

const dbslist = [...enableMemDatabaseConnections, ...enabledDatabaseConections] as const;
export type dbsAcepteds = (typeof dbslist)[number] | 'envBoot';

export class DatabaseUsernameValidator {
	private static DBUnameValidatorLogger = createChildLogger({
		fileType: 'validation',
		service: 'valuation',
		module: 'DatabaseUsernameValidator',
	});

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

		const result: boolean = dbUsernamePattern.test(uname);

		if (!result) {
			this.handlingError(
				{
					erroLevel: 'fatal',
					method: 'verifyUsername',
					error: {
						uname,
						typeofUname: typeof uname,
						expectedUnameMorphology: {
							enviromental: 'prd|stg|dev|tst',
							serviceOrApp: 'string com 3+ characters',
							permissions: 'ro|rw|adm',
							id: 'number com dois caraceres',
							uname: 'adição de entropia com string contendo 9+ characteres com números, letras maísculas/minúsculas, e characters especiais url-safty',
						},
					},
					message: 'O username não apresenta uma morfologia válida! Verifique o fluxo!',
				},
				dbname,
			);
		}

		return result;
	}
}
