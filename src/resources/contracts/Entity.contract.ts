import { env } from '@Configs/env.js';
import { createChildLogger, type errorLevels } from '@Configs/logger.js';
import type { DeepReadonly } from '@Types';

/**
 * Contrato fundamental para todas as Entidades do Domínio.
 * Define a obrigatoriedade de conversão segura da Entidade para Data Transfer Objects (DTOs).
 *
 * @template T Interface que representa os dados completos da Entidade (Persistência).
 * @template Tout Interface que representa os dados seguros para exposição (Apresentação).
 */
export interface IEntity<T, Tout> {
	/**
	 * Exporta a Entidade para ser salva no Banco de Dados.
	 * Garante que os dados passem limpos e seguros para a camada de infraestrutura.
	 *
	 * @returns Objeto 100% congelado e imutável (DeepReadonly).
	 */
	toDatabaseDTO(): DeepReadonly<T>;

	/**
	 * Exporta os dados da Entidade omitindo atributos altamente sensíveis (Senhas, Hashes, CPF).
	 * Usado primariamente por Controllers para responder requisições HTTP.
	 *
	 * @returns Objeto público imutável pronto para o Frontend.
	 */
	toPublicDTO(): DeepReadonly<Tout>;
}

/**
 * Classe Abstrata Ouro do Boilerplate.
 * Toda nova entidade da aplicação deve herdar desta classe.
 * Ela garante injeção automática de logs rastreáveis e gerencia o estado base.
 *
 * @template T Interface dos dados completos (Persistência).
 * @template Tout Interface dos dados públicos (Apresentação).
 */
export abstract class BaseEntity<T, Tout> implements IEntity<T, Tout> {
	/**
	 * Nome formal da entidade usado para roteamento de logs (Ex: 'User', 'Product').
	 */
	protected abstract get entityName(): string;

	/**
	 * Propriedades puras da entidade. Sempre acesse/modifique as props através de métodos
	 * da Entidade (Rich Domain Model), nunca alterando `this.props` diretamente de fora.
	 */
	protected props: T;
	protected entityLogger = createChildLogger({
		fileType: 'entity',
		module: 'bussinesLogic',
		service: 'valuation',
	});

	/**
	 * Valida e hidrata a entidade no momento do seu nascimento.
	 * Lança log e erro em caso de Payload inválido.
	 * @param data Payload desconhecido que tentará formar a Entidade.
	 */
	constructor(data: unknown) {
		this.props = this.validate(data);
	}

	/**
	 * Metódo padronizado da IEntity para gerar DTO de banco de dados.
	 * Congela o objeto impedindo mutações da camada de persistência.
	 */
	public toDatabaseDTO(): DeepReadonly<T> {
		return Object.freeze({ ...this.props });
	}

	protected logInfo(lvl: 'info' | 'debug', msg: string, informationObject: object = {}): void {
		this.entityLogger[lvl]({ serviceName: this.entityName, ...informationObject }, msg);
	}

	/**
	 * Dispara um Log estruturado e lança uma excessão fatal imobilizadora (Fail-Fast).
	 * Padrão para evitar que estados inconsistentes avancem pelo Event-Loop do Node.
	 *
	 * @param errorLevel Ex: 'warn', 'fatal', 'error'.
	 * @param errorInfos Objeto contendo stack trace ou dados da requisição adulterada.
	 * @param message Mensagem de auditoria para o Splunk / DataDog.
	 */
	protected handlingError(errorLevel: errorLevels, errorInfos: unknown, message: string): never {
		this.entityLogger[errorLevel]({ serviceName: this.entityName, error: errorInfos }, message);
		throw new Error(
			`Erro interno crítico, contate algum administrador por meio dos canais legais ${env.EMAIL_TO_CONTACT}`,
		);
	}

	/**
	 * Exige que a classe herdeira declare rigidamente como o objeto será exibido ao público.
	 * Obrigatório para não vazar dados por acidente.
	 */
	public abstract toPublicDTO(): DeepReadonly<Tout>;

	/**
	 * Exige que a classe herdeira valide a entrada via Zod antes de prosseguir com a criação.
	 * @param data Payload impuro vindo de APIs ou Bancos de Dados.
	 */
	protected abstract validate(data: unknown): T;
}
