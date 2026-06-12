/**
 * @module BaseConnectDb
 * @description Contrato central e infraestrutura abstrata para ciclo de vida de conexões
 * com bancos de dados (ex: MongoDB, Valkey, Postgres, etc.) no boilerplate.
 *
 * ## Filosofia de Design:
 * 1. **Gerenciamento de Estado Unificado:** Define uma máquina de estado simples baseada em sinalizadores
 *    de prontidão (`connectionStatus`), garantindo consistência operacional antes de operações de I/O.
 * 2. **Idempotência de Ciclo de Vida:** Centraliza diretrizes para evitar redundâncias e vazamentos
 *    de sockets em chamadas duplicadas aos métodos de conexão e desconexão.
 * 3. **Auditoria Transparente:** Integra um Logger estruturado filho (Pino) com marcadores específicos
 *    de contexto (tipo de banco, módulo de conexão) para otimizar telemetria corporativa.
 * 4. **Tratamento Seguro de Falhas (Interrupção Controlada):** Padroniza a interceptação de erros de bootstrap,
 *    evitando falhas silenciosas que comprometeriam a inicialização da API.
 */

import { createChildLogger, type handlerContractsErrorsParams } from '@Configs/logger.js';
import { env } from '@Configs/env.js';

/**
 * @interface IConnectDb
 * @description Contrato público que define as operações obrigatórias para o gerenciamento de ciclo de vida
 * de qualquer conexão com banco de dados no boilerplate.
 *
 * Qualquer driver concreto de banco de dados (relacional, NoSQL ou chave-valor) deve implementar esta interface
 * para ser gerenciado de forma agnóstica pela camada de orquestração de boot da aplicação.
 */
export interface IConnectDb {
	/**
	 * Estabelece a conexão com a base de dados de forma assíncrona.
	 *
	 * ### Diretrizes de Implementação:
	 * - **Idempotência:** Se uma conexão já estiver ativa (`isConnected() === true`), a chamada deve ser resolvida imediatamente,
	 *   evitando reabrir conexões desnecessárias.
	 * - **Tratamento de Timeout:** Deve tratar limites de tempo limite de conexão (Timeouts) do driver subjacente.
	 * - **Fail-Fast:** Caso a conexão falhe após tentativas de retry, deve disparar um erro fatal interrompendo o ciclo de inicialização.
	 *
	 * @returns {Promise<void>} Uma promessa que se resolve quando a conexão é estabelecida com sucesso.
	 * @throws {Error} Se a conexão falhar ou as credenciais forem inválidas.
	 */
	connect(): Promise<void>;

	/**
	 * Encerra a conexão ativa de forma assíncrona e limpa os recursos alocados.
	 *
	 * ### Diretrizes de Implementação:
	 * - **Idempotência:** Se a conexão já estiver encerrada (`isConnected() === false`), deve ser resolvida imediatamente.
	 * - **Drenagem de Pools:** Deve garantir que consultas/transações pendentes no pool de conexões sejam finalizadas ou canceladas
	 *   adequadamente de acordo com as regras de terminação segura (*graceful shutdown*).
	 *
	 * @returns {Promise<void>} Uma promessa que se resolve quando a conexão é fechada com sucesso.
	 * @throws {Error} Se houver falha crítica ao desalocar sockets ou fechar conexões.
	 */
	disconnect(): Promise<void>;

	/**
	 * Verifica em tempo real o estado de conectividade do driver de banco de dados.
	 *
	 * ### Diretrizes de Implementação:
	 * - Não deve apenas retornar um sinalizador estático em memória, mas sim inspecionar a integridade real do socket/driver
	 *   (ex: `mongoose.connection.readyState` no MongoDB ou a propriedade de status de cliente do Valkey/Redis).
	 *
	 * @returns {boolean} Retorna `true` se a conexão estiver ativa e pronta para queries; `false` caso contrário.
	 */
	isConnected(): boolean;
}

/**
 * @class BaseConnectDb
 * @implements {IConnectDb}
 * @description Classe base abstrata que fornece a base estrutural para geradores de conexão de banco de dados.
 *
 * Implementa rotinas comuns de logging estruturado e tratamento de erros padronizados, reduzindo a duplicação
 * de código boilerplate em drivers de conexões e unificando a telemetria do sistema.
 *
 * @abstract
 */
export abstract class BaseConnectDb implements IConnectDb {
	/**
	 * Nome único do módulo ou driver concreto (ex: `'MongoDBConnection'`, `'ValkeyConnection'`).
	 * Utilizado para identificar a origem dos logs operacionais e assinar exceções lançadas.
	 *
	 * @type {string}
	 * @protected
	 * @abstract
	 */
	protected abstract get connectionName(): string;

	/**
	 * String de conexão (URI) resolvida e higienizada.
	 * Deve ser fornecida pelas classes filhas baseadas nos contratos de URI correspondentes.
	 *
	 * @type {string}
	 * @protected
	 * @abstract
	 */
	protected abstract readonly _uri: string;

	/**
	 * Sinalizador de controle interno do estado da conexão.
	 * Atua como um cache local rápido de sanidade, atualizado pelos hooks de ciclo de vida.
	 *
	 * @type {boolean}
	 * @protected
	 */
	protected connectionStatus: boolean = false;

	/**
	 * Instância do Logger estruturado do Pino, configurado especificamente para rastreamento de ciclo de vida
	 * de conexões com bancos de dados. Inclui metadados estáticos do tipo de banco (`DATABASE_TYPE`).
	 *
	 * @type {pino.Logger}
	 * @protected
	 */
	protected ConnectionLogger = createChildLogger({
		fileType: 'connection',
		databaseType: env.DATABASE_TYPE,
		service: 'database',
		module: 'databaseConnections',
	});

	/**
	 * Estabelece a conexão com a base de dados de forma assíncrona.
	 * Deve ser implementado de forma concreta por cada driver de conexão.
	 *
	 * @returns {Promise<void>}
	 * @abstract
	 */
	abstract connect(): Promise<void>;

	/**
	 * Encerra a conexão ativa com a base de dados de forma assíncrona.
	 * Deve ser implementado de forma concreta por cada driver de conexão.
	 *
	 * @returns {Promise<void>}
	 * @abstract
	 */
	abstract disconnect(): Promise<void>;

	/**
	 * Inspeciona o estado operacional ativo da conexão.
	 * Deve ser implementado de forma concreta por cada driver de conexão.
	 *
	 * @returns {boolean}
	 * @abstract
	 */
	abstract isConnected(): boolean;

	/**
	 * Registra uma mensagem informativa de depuração no pipeline de logs operacionais da conexão.
	 * Assina a mensagem com o nome do módulo herdeiro ativo (`connectionName`).
	 *
	 * @param {string} message A mensagem a ser catalogada.
	 * @returns {void}
	 * @protected
	 */
	protected logInfo(message: string): void {
		this.ConnectionLogger.info({ module: this.connectionName }, message);
	}

	/**
	 * Intercepta e centraliza o tratamento de falhas operacionais e de conectividade.
	 * Registra a exceção no logger do Pino com a gravidade definida e dispara um erro com a mensagem formatada.
	 *
	 * Esse método tem o tipo de retorno estrito `never` indicando que o fluxo sempre é interrompido por exceção.
	 *
	 * @param {handlerContractsErrorsParams} params Parâmetros com detalhes da falha (mensagem, nível e erro original).
	 * @returns {never}
	 * @throws {Error} Lança erro envelopado com o nome do serviço afetado.
	 * @protected
	 */
	protected handlerErrors(params: handlerContractsErrorsParams): never {
		this.ConnectionLogger[params.erroLevel](
			{ module: this.connectionName, error: params.error },
			params.message,
		);
		throw new Error(`Erro de módulo ${this.connectionName}: erro detectado ${params.message}`);
	}
}

