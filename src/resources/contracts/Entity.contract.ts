import { env } from '@Configs/env.js';
import { createChildLogger, type errorLevels } from '@Configs/logger.js';
import type { DeepReadonly } from '@Types';

export interface IEntity<T, Tout> {
	toDatabaseDTO(): DeepReadonly<T>; // exporta objeto limpo para o banco de dados, e com tratamento para ser realmente seguro trnasportá-lo
	toPublicDTO(): DeepReadonly<Tout>;
}

export abstract class BaseEntity<T, Tout> implements IEntity<T, Tout> {
	protected abstract readonly entityName: string;
	protected props: T;
	protected entityLogger = createChildLogger({
		fileType: 'entity',
		module: 'bussinesLogic',
		service: 'valuation',
	});

	constructor(data: unknown) {
		this.props = this.validate(data);
	}

	// padroniza o retorno de objetos para a API
	public toDatabaseDTO(): DeepReadonly<T> {
		return Object.freeze({ ...this.props });
	}

	protected handlingUserError(
		errorLevel: errorLevels,
		entityName: string,
		error: unknown,
		message: string,
	): never {
		this.entityLogger[errorLevel]({ serviceName: entityName, error: error }, message);
		throw new Error(
			`Erro interno crítico, contate algum administrador por meio dos canais legais ${env.EMAIL_TO_CONTACT}`,
		);
	}

	public abstract toPublicDTO(): DeepReadonly<Tout>;
	protected abstract validate(data: unknown): T;
}
