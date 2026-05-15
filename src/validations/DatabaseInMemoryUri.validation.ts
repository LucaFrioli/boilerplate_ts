import { type handlerContractsErrorsParams, createChildLogger } from '@Configs/logger.js';
import {
	acceptedMemDatabaseProtocols,
	type dbsAcepteds,
} from '@Configs/constants/env.constants.js';
import { DatabaseUsernameValidator } from './DatabaseUsername.validation.js';
import { DatabasePasswordValidation } from './DatabasePassword.validation.js';
import { resolve } from 'node:path';
import { existsSync, statSync } from 'node:fs';

export class DatabaseMemoryUriValidation {
	private static databaseMemoryUriValidationLogger = createChildLogger({
		fileType: 'validation',
		module: 'DatabaseInMemoryUri',
		service: 'database',
	});

	private static handlerErrors(params: handlerContractsErrorsParams): never {
		this.databaseMemoryUriValidationLogger[params.erroLevel](
			{ method: params.method, errors: params.error },
			params.message,
		);
		throw new Error(params.message);
	}

	private static acceptedProtocolTest = (protocol: string): boolean =>
		acceptedMemDatabaseProtocols.includes(protocol);

	private static isAcceptedProtocol(uri: unknown): boolean {
		if (typeof uri !== 'string') return false;
		try {
			const parsedUri: URL = new URL(uri);
			const protocol: string = parsedUri.protocol.replace(':', '');
			return this.acceptedProtocolTest(protocol);
		} catch (e) {
			this.handlerErrors({
				erroLevel: 'fatal',
				error: e,
				method: 'isAcceptedProtocol',
				message: 'Erro ao tentar parsear a uri',
			});
		}
	}

	private static verifyIsSocketUri(uri: string, dbName: dbsAcepteds): boolean {
		const splitedStringProtocol = Object.freeze(uri.split('://'));

		if (!splitedStringProtocol[0]) return false;
		if (!this.acceptedProtocolTest(splitedStringProtocol[0])) return false;
		if (!splitedStringProtocol[1]) return false;

		const splitedStringVerifyHasAuth = Object.freeze(splitedStringProtocol[1].split('@'));

		if (splitedStringVerifyHasAuth.length === 2) {
			if (!splitedStringVerifyHasAuth[0] && splitedStringVerifyHasAuth[0] !== '') {
				this.handlerErrors({
					erroLevel: 'fatal',
					method: 'verifyIsSocketUri',
					error: { internalFLux: 'splitedStringVerifyHasAuth' },
					message:
						'Erro de tentativa de alteração de memória durante fluxo de validação de URL',
				});
			}
			const unameAndPass = Object.freeze(splitedStringVerifyHasAuth[0].split(':'));

			if (unameAndPass[0] !== '' && typeof unameAndPass[0] === 'string') {
				if (!DatabaseUsernameValidator.verifyUsername(unameAndPass[0], dbName))
					return false;
			}
			if (unameAndPass[1] !== '' && typeof unameAndPass[1] === 'string') {
				if (!DatabasePasswordValidation.isValid(unameAndPass[1])) return false;
			}
			return this.socketVerification(splitedStringVerifyHasAuth[1]);
		}

		const socketPath = splitedStringVerifyHasAuth[0];
		return this.socketVerification(socketPath);
	}

	private static socketVerification(socketPath: unknown): boolean {
		if (!socketPath || typeof socketPath !== 'string') {
			this.handlerErrors({
				erroLevel: 'fatal',
				method: 'socketVerification',
				error: {
					typeofSocketPathRecived: typeof socketPath,
					expectedParamValue: 'string',
				},
				message: 'Caminho de socket inválido. Sockets IPC devem ser uma string',
			});
		}

		try {
			const normalizedPath: string = resolve(socketPath);

			if (!normalizedPath.startsWith('/')) {
				this.databaseMemoryUriValidationLogger.error(
					{
						method: 'socketVerification',
						socketPath,
						normalizedPath,
					},
					'Caminho após normalização não aponta para um diretório raíz valido',
				);
				return false;
			}

			if (!existsSync(normalizedPath)) {
				this.databaseMemoryUriValidationLogger.error(
					{
						method: 'socketVerification',
						normalizedPath,
					},
					'O arquivo unix apontado na Uri não referencia nenhum arquivo do sistema',
				);
				return false;
			}

			const fileStats = statSync(normalizedPath);

			if (!fileStats.isSocket()) {
				this.handlerErrors({
					erroLevel: 'fatal',
					method: 'socketVerification',
					error: {
						normalizedPath,
					},
					message:
						'O caminho aponta para um arquivo existente, mas ele NÃO é um Socket Unix (UDS)',
				});
			}

			return true;
		} catch (e) {
			this.databaseMemoryUriValidationLogger.error(
				{
					method: 'socketVerification',
					socketPath,
					errors: e,
				},
				'Falaha crítica ao tetar normalizar ou ler as propriedades do caminho do Socket',
			);
			return false;
		}
	}

	/**
	 * verifyUrl
	 */
	public static verifyUrl(
		url: unknown,
		dbName: dbsAcepteds,
		fn: (args: unknown) => boolean = this.isAcceptedProtocol.bind(this),
	): boolean {
		if (typeof url !== 'string' || url === '') return false;

		if (!URL.canParse(url)) {
			return this.verifyIsSocketUri(url, dbName);
		}

		if (!fn(url)) {
			return false;
		}

		return this.isAcceptedProtocol(url);
	}
}
