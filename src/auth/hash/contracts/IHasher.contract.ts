import { env } from '@Configs/env.js';
import { createChildLogger } from '@Configs/logger.js';

export interface IHasherProvider {
	/**
	 * Recebe uma string limpa e retorna o hash gerado.
	 * @param payload - O dado sensível (ex: senha)
	 */
	generate(payload: string): Promise<string>;

	/**
	 * Compara um texto puro com um hash existente.
	 * @param payload - O texto enviado pelo usuário
	 * @param hashed - O hash recuperado do banco de dados
	 */
	compare(payload: string, hashedString: string): Promise<boolean>;

	/**
	 * Validar se uma string pretence ao tipo semântico de hash
	 * @param hasheddString - texto de hash que deverá ser validado
	 */
	validateHash(hasheddString: string): boolean;
}

export abstract class BaseHasher implements IHasherProvider {
	protected hasherLogger = createChildLogger({
		module: 'security',
		fileType: 'util',
		service: 'hasher',
	});

	/**
	 * Obriga o desenvolvedor a declara o nome de serviço trzendo ainda mais informação para os logs e depuração
	 */
	protected abstract get ServiceName(): string;

	/**
	 * Metódo que deve ser implementado nas classes filhas com lógica de como o hash deve ocorrrer
	 * @param payload - O dado sensível que seráa tratado pelo serviço de hasher
	 */
	protected abstract executeHash(payload: string): Promise<string>;
	/**
	 * Método que deve ser implementado nas classes filhas com a lógica de comparação de hash e como a lógica deve ocorrer
	 * @param hahsedString - string que já tem o hahs
	 * @param payload - o alvo que deve ser objeto de comeparação
	 */
	protected abstract executeCompare(payload: string, hashedString: string): Promise<boolean>;

	protected abstract executeValidation(hashedString: string): boolean;

	public async generate(payload: string): Promise<string> {
		if (!payload || payload.trim().length === 0) {
			this.hasherLogger.warn(
				{ serviceName: this.ServiceName },
				'Tentativa de gerar hash de payload vazio',
			);
			throw new Error('O payload para geração de hash não pode estar vazio');
		}

		try {
			return await this.executeHash(payload);
		} catch (e) {
			this.handleFatalErrors(e, 'generate');
		}
	}

	public async compare(payload: string, hashedString: string): Promise<boolean> {
		try {
			return await this.executeCompare(payload, hashedString);
		} catch (e) {
			this.hasherLogger.error(
				{ error: e, serviceName: this.ServiceName },
				`Erro de verificação comparativa no ${this.ServiceName}`,
			);
			return false;
		}
	}

	public validateHash(hashedString: string): boolean {
		try {
			return this.executeValidation(hashedString);
		} catch (e) {
			this.hasherLogger.error(
				{ error: e, serviceName: this.ServiceName },
				`Erro de validação do tipop string hash no ${this.ServiceName}`,
			);
			throw new Error('Verifique novamente a senha enviada!', { cause: e });
		}
	}

	/**
	 * *handleFatalErrors*
	 * @param e unknown - error catched in method
	 * @param method string - name of the method on error is catched
	 *
	 * @returns void - returns nothing in case trhows an Error
	 * Este método loga um erro fatal que pode ocorrer e serviços de hasher e lança um erro critico,
	 * dizendo que o usuário deve entrar em contato com a administração do sistema permitindo que haja um
	 * email de comunicação com a daministração
	 */
	protected handleFatalErrors(e: unknown, method: string): never {
		this.hasherLogger.fatal(
			{ error: e, method: method, serviceName: this.ServiceName },
			`Falha crítica no motor de criptografia no método ${method}`,
		);
		throw new Error(
			`Erro interno crítico, contate algum administrador por meio dos canais legais ${env.EMAIL_TO_CONTACT}`,
		);
	}
}
