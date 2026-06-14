/**
 * @module Logger
 * @description Infraestrutura central de logging estruturado assíncrono para o boilerplate,
 * construída sobre o framework Pino.
 *
 * ## Filosofia de Design:
 * 1. **Estruturação JSON Nativa:** Todos os logs são emitidos no formato JSON estruturado por padrão,
 *    facilitando a ingestão direta e indexação em agregadores corporativos (ex: Elasticsearch, Splunk, Datadog).
 * 2. **Multi-Transport Stream (Console & Arquivo):**
 *    - Em ambiente de desenvolvimento (`NODE_ENV=development`), o console recebe saída formatada em
 *      modo amigável para humanos via `pino-pretty`. Em produção, a saída é enviada em JSON bruto.
 *    - Uma cópia permanente e assíncrona é escrita em disco no caminho `logs/YYYY-MM-DD.log` para fins
 *      de auditoria e diagnóstico persistente offline.
 * 3. **Mascaramento Proativo de Dados Sensíveis (Redaction Shield):** Blinda propriedades críticas de payload
 *    (como senhas, tokens de autenticação, CPF e hashes criptográficos) substituindo-os recursivamente
 *    pela máscara `'******'`.
 * 4. **Logs Contextuais Segmentados (Child Loggers):** Força o enriquecimento semântico de metadados
 *    (através de `FileType` e `ServiceType`), permitindo filtros precisos e correlação de eventos no backend.
 */

import { resolve } from 'path';
import pino, { type Logger } from 'pino';

/**
 * Caminho absoluto da pasta raiz de execução da aplicação.
 * @type {string}
 * @private
 */
const rootDir = process.cwd();

/**
 * Nome gerado dinamicamente para o arquivo de log do dia atual no formato `YYYY-MM-DD.log`.
 * @type {string}
 * @private
 */
const logFileName = `${new Date().toISOString().substring(0, 10)}.log`;

/**
 * Caminho absoluto final de destino do arquivo físico de log persistente.
 * @type {string}
 * @private
 */
const logsFilesPath = resolve(rootDir, 'logs', logFileName);

/**
 * Ambiente de execução detectado no runtime (fallback padrão para `'development'`).
 * @type {string}
 * @private
 */
const currentEnv = process.env.NODE_ENV || 'development';

/**
 * Nome oficial da aplicação injetado pelo ambiente de execução (ex: `'Boilerplate_API'`).
 * @type {string | undefined}
 * @private
 */
const currentAppName = process.env.APP_NAME;

/**
 * Níveis de gravidade permitidos no boilerplate para tratamento de erros operacionais e informativos.
 *
 * - `info`: Eventos operacionais padrão de progresso (inicialização, conectividade).
 * - `warn`: Anomalias recuperáveis que não interrompem a aplicação (ex: retry de conexões).
 * - `error`: Incidentes que afetam uma requisição específica ou processamento mas mantêm a API no ar.
 * - `fatal`: Quebra estrutural grave que inviabiliza o boot ou funcionamento contínuo, exigindo fail-fast.
 */
export type errorLevels = 'info' | 'warn' | 'error' | 'fatal';

/**
 * Classificação semântica estrita da camada ou tipo de arquivo gerador do registro de log.
 * Facilita filtros em agregadores de log de acordo com a arquitetura limpa (Clean Architecture).
 */
export type FileType =
	| 'validation'
	| 'entity'
	| 'controller'
	| 'model'
	| 'interface'
	| 'util'
	| 'connection'
	| 'uri'
	| 'core'
	| 'type'
	| 'provider';

/**
 * Classificação semântica estrita do domínio de serviço gerador do log.
 * Utilizado para mapeamento contextual e telemetria funcional (ex: agrupamento de erros criptográficos).
 */
export type ServiceType =
	| 'database'
	| 'hasher'
	| 'util'
	| 'valuation'
	| 'generation'
	| 'typo'
	| 'pii'
	| 'cryptography';

/**
 * Parâmetros obrigatórios e estruturados para inicialização de um registrador filho (Child Logger).
 * Garante que qualquer logger derivado carregue metadados contextuais ricos e imutáveis.
 *
 * Permite também a injeção dinâmica de chaves adicionais arbitrárias através do tipo interseção `Record<string, unknown>`.
 */
export type LoggerParams = {
	/**
	 * Nome ou namespace do módulo emissor do log (ex: `'BaseConnectDb'`).
	 */
	module: string;
	/**
	 * A classificação física do tipo de arquivo emissor.
	 */
	fileType: FileType;
	/**
	 * O domínio funcional do serviço emissor.
	 */
	service: ServiceType;
} & Record<string, unknown>;

/**
 * Fábrica utilitária para geração de registradores derivados (Child Loggers) tipados e contextuais.
 *
 * O uso de instâncias derivadas (`logger.child`) é altamente encorajado para garantir que todos
 * os logs emitidos por um determinado componente herdem automaticamente as propriedades contextuais
 * (como `module`, `fileType` e `service`), evitando ter que declarar esses metadados em cada linha de log.
 *
 * @param {LoggerParams} params Parâmetros contextuais obrigatórios e propriedades adicionais do logger filho.
 * @returns {Logger} Uma nova instância contextualizada do Pino Logger.
 *
 * @example
 * ```typescript
 * const myLogger = createChildLogger({
 *   module: 'PasswordValidator',
 *   fileType: 'validation',
 *   service: 'cryptography'
 * });
 * myLogger.info('Validação iniciada'); // O log resultante conterá { module, fileType, service, msg }
 * ```
 */
export const createChildLogger = (params: LoggerParams): Logger => {
	return logger.child({ ...params });
};

/**
 * Interface padronizada de refinamento para logs de handling de falhas e incidentes contratuais.
 *
 * Permite que classes abstratas ou orquestradores de contratos capturem falhas críticas, recebam
 * metadados estruturados de forma concisa e deleguem a interrupção segura (fail-fast) ou
 * o registro assíncrono ao logger global.
 */
export interface handlerContractsErrorsParams {
	/**
	 * Nível de gravidade a ser atribuído à gravação do incidente (tipicamente `'error'` ou `'fatal'`).
	 */
	erroLevel: errorLevels;
	/**
	 * O objeto ou instância de erro original capturado no bloco `catch` (ou um objeto de erro customizado).
	 */
	error: unknown;
	/**
	 * Mensagem textual descritiva explicando o contexto da falha contratual.
	 */
	message: string;
	/**
	 * Nome do método específico onde a falha foi interceptada (ex: `'validateBaseEnv'`).
	 */
	method: string;
}

/**
 * Configuração estática interna do motor de log do Pino.
 *
 * ### Detalhes Técnicos:
 * - **Nível Mínimo (`level`):** Ajustado para `'debug'` em desenvolvimento para capturar rastros detalhados
 *   de execução, e `'info'` em produção para evitar sobrecarga de armazenamento de logs repetitivos.
 * - **Higienização Recursiva (`redact`):** Mapeia caminhos de propriedades JSON para substituição de máscara,
 *   blindando o vazamento de PII (CPF, WalletId) e chaves sensíveis (Authorization, passwords, hashes) nos logs.
 * - **Dados Base (`base`):** Adiciona o ambiente ativo (`env`) e o nome da aplicação (`app_name`) a todos os logs.
 * - **Timestamp Nativo:** Utiliza geração no formato padrão ISO 8601 (`pino.stdTimeFunctions.isoTime`).
 *
 * @type {pino.LoggerOptions}
 * @private
 */
const pinoConfigs = {
	level: currentEnv === 'development' ? 'debug' : 'info',
	redact: {
		paths: [
			'password',
			'DATABASE_PASSWORD',
			'user.token',
			'authorization',
			'passwordHash',
			'walletId',
			'cpf',
		],
		placeholder: '******',
	},

	base: {
		env: currentEnv,
		app_name: currentAppName,
	},

	timestamp: pino.stdTimeFunctions.isoTime,
};

/**
 * Definição do destino de saída padrão para o Console (stdout/stderr).
 *
 * Em modo de desenvolvimento, ativa o `pino-pretty` para colorização e tabulação amigável de logs.
 * Em ambientes produtivos, emite JSON bruto via `pino/file` otimizando processamento.
 *
 * @type {pino.TransportTargetOptions}
 * @private
 */
const consoleTarget: pino.TransportTargetOptions = {
	target: currentEnv === 'development' ? 'pino-pretty' : 'pino/file',
	level: currentEnv === 'development' ? 'debug' : 'info',
	options: currentEnv === 'development' ? { colorize: true } : {},
};

/**
 * Definição do destino de saída física persistente em arquivo de log.
 *
 * Salva registros em disco em formato JSON nativo no arquivo diário configurado (`logs/YYYY-MM-DD.log`).
 * Possui a propriedade `mkdir: true` ativada por padrão para criar a árvore de diretórios de logs caso ela não exista.
 *
 * @type {pino.TransportTargetOptions}
 * @private
 */
const fileTarget: pino.TransportTargetOptions = {
	target: 'pino/file',
	level: 'info',
	options: {
		destination: logsFilesPath,
		mkdir: true,
	},
};

/**
 * Barramento (Transport) multi-canal gerenciado pelo Pino para despacho paralelo de logs.
 * Consolida as definições do console e da gravação persistente física em disco de forma assíncrona.
 *
 * @type {any}
 * @private
 */
const transport = pino.transport({
	targets: [consoleTarget, fileTarget],
});

/**
 * Instância global singleton do Pino Logger configurada e exposta para a aplicação.
 *
 * Oferece a API padrão de logs estruturados assíncronos de alta performance para o boilerplate.
 *
 * @type {Logger}
 * @see {@link createChildLogger} Função recomendada para obter logs contextuais derivados.
 */
export const logger = pino(pinoConfigs, transport);
