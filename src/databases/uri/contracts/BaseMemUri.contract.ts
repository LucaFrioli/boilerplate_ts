/**
 * @module BaseMemUri
 * @description Contrato central e infraestrutura abstrata para geração de Strings de Conexão (URIs)
 * de Bancos de Dados em Memória (ex: Redis, Valkey, KeyDB) no boilerplate.
 *
 * ## Filosofia de Design:
 * 1. **Fail-Fast (Falha Rápida):** Interrompe o boot da aplicação imediatamente se a URI gerada falhar
 *    na validação estrutural do Branded Type `MemDatabaseURI`.
 * 2. **Isolamento de Ambientes:** Separa explicitamente a morfologia das conexões entre `development` e
 *    `production/stage/test` por meio de hooks abstratos diferenciados.
 * 3. **Defesa Ambiental (Zod Shield):** Valida e congela de forma imutável (`Object.freeze`) o subconjunto de
 *    variáveis de ambiente lidas, mitigando ataques de Prototype Pollution ou mutações acidentais em tempo de execução.
 * 4. **Segurança de Auditoria:** Obriga as classes filhas concretas a implementarem uma rotina de mascaramento
 *    para logs (`maskUriToLog`), garantindo que senhas e credenciais de conexões nunca vazem para arquivos de logs.
 */

import { memEnvValidationSchema } from '@Configs/Schemas/memDbEnv.schema.js';
import { nodeEnvSupported, type dbsAcepteds } from '@Configs/Constants';
import { env } from '@Configs/env.js';
import { createChildLogger, type handlerContractsErrorsParams } from '@Configs/logger.js';
import { isMemDatabaseUri, type MemDatabaseURI } from '@Types';
import type pino from 'pino';
import z from 'zod';

/**
 * @type EnvDataForMemDbUri
 * @description Filtro estrito (Pick) das variáveis de ambiente necessárias para governar a
 * conexão de bancos de dados em memória. Isso evita vazamento de contexto global e limita o escopo
 * de exposição de dados sensíveis apenas para as variáveis do subdomínio de memória.
 *
 * Ao isolar essa estrutura com um tipo utilitário `Pick`, as classes herdeiras recebem garantias de tipagem
 * estática sobre as propriedades do ambiente necessárias para construir strings de conexão como URIs.
 *
 * @see {@link env} Instância global de configuração higienizada.
 * @see {@link memEnvValidationSchema} Esquema de validação Zod para banco em memória.
 */
export type EnvDataForMemDbUri = Pick<
	typeof env,
	| 'NODE_ENV'
	| 'MEM_DB_TYPE'
	| 'MEM_DB_HOST'
	| 'MEM_DB_PORT'
	| 'MEM_DB_PROTOCOL'
	| 'MEM_DB_USERNAME'
	| 'MEM_DB_PASSWORD'
	| 'MEM_DB_INDEX_OR_PATH'
	| 'MEM_DB_SENTINEL_MASTER_ID'
	| 'MEM_DB_SENTINEL_USERNAME'
	| 'MEM_DB_SENTINEL_PASSWORD'
>;

/**
 * @interface IMemDatabaseUri
 * @description Interface pública exposta para os consumers de infraestrutura obterem a URI de conexão.
 * Abstrai os detalhes internos de construção e delegação de ambiente das classes filhas concretas.
 */
export interface IMemDatabaseUri {
	/**
	 * Retorna a String de Conexão validada em runtime sob o branded type `MemDatabaseURI`.
	 *
	 * A propriedade garante que qualquer classe consumidora de banco de dados receba uma string pré-validada
	 * que obedece estritamente às regras de formato estipuladas pelo validador do banco correspondente.
	 *
	 * @returns {MemDatabaseURI} A string de conexão nominalmente atestada como segura e no formato correto.
	 * @throws {Error} Lançado caso a URI interna não tenha sido inicializada com sucesso ou seja considerada inválida.
	 */
	get uri(): MemDatabaseURI;
}

/**
 * @class BaseMemUri
 * @implements {IMemDatabaseUri}
 * @description Classe base abstrata que gerencia o ciclo de vida, a integridade de credenciais e a validação
 * estrutural de Strings de Conexão (URIs) para bancos de dados em memória (ex: Redis, Valkey, etc.).
 *
 * ### Padrão de Projeto - Template Method:
 * Esta classe implementa o padrão Template Method para governar o fluxo de inicialização (`init`), validação
 * de ambiente (`validateBaseEnv`) e delegação de rotas de geração (`generateMemDBUri`). As classes herdeiras
 * implementam apenas os ganchos abstratos específicos para cada variante de infraestrutura.
 *
 * ### Ciclo de Vida da Inicialização:
 * ```mermaid
 * graph TD
 *     A[Constructor] --> B[init]
 *     B --> C[validateBaseEnv]
 *     C --> D[guardBroken - Abstract Hook]
 *     D --> E[generateMemDBUri]
 *     E --> F{NODE_ENV?}
 *     F -- development --> G[generateUriDev - Abstract Hook]
 *     F -- other --> H[generateUriProd - Abstract Hook]
 *     G --> I[Branded Type Validation isMemDatabaseUri]
 *     H --> I
 *     I -- Valido --> J[Cached _uri Ready]
 *     I -- Invalido --> K[Throw Fatal Error]
 * ```
 *
 * ### Diretrizes de Segurança contra Prototype Pollution:
 * Durante a validação, as chaves capturadas das variáveis de ambiente globais são sanitizadas com Zod e
 * congeladas usando `Object.freeze` no cache `_baseEnvMemDb`. Isso impede que injeções maliciosas em tempo
 * de execução modifiquem as propriedades de configuração da conexão.
 *
 * @abstract
 */
export abstract class BaseMemUri implements IMemDatabaseUri {
	/**
	 * Nome do provedor concreto para enriquecimento de auditoria de telemetria e rastreabilidade nos logs.
	 * Cada classe herdeira deve retornar uma string autoexplicativa (ex: `'ValkeyUriBuilder'`).
	 *
	 * @type {string}
	 * @protected
	 * @abstract
	 */
	protected abstract get ServiceName(): string;

	/**
	 * Cache interno contendo a URI de conexão resolvida, validada nominalmente e tipada como `MemDatabaseURI`.
	 * Inicializado de maneira preguiçosa durante o fluxo do construtor.
	 *
	 * @type {MemDatabaseURI | undefined}
	 * @protected
	 */
	protected _uri?: MemDatabaseURI;

	/**
	 * Cache imutável congelado (`Object.freeze`) contendo as variáveis ambientais higienizadas do banco.
	 * Evita acessos recorrentes ao objeto global `env` e blinda as chaves contra manipulações externas.
	 *
	 * @type {Readonly<EnvDataForMemDbUri> | undefined}
	 * @protected
	 */
	protected _baseEnvMemDb?: EnvDataForMemDbUri;

	/**
	 * Senha normalizada (URL Encoded) para evitar quebras de parsing de URI ou vulnerabilidades de injeção
	 * de caracteres reservados (como `@`, `:`, `/`, `?`, `#`) na string de conexão final.
	 *
	 * @type {string | undefined}
	 * @protected
	 */
	protected _password?: string;

	/**
	 * Identificador estrito do banco de dados correspondente aceito no boilerplate (ex: `'valkey'`, `'redis'`).
	 * Utilizado pelo validador nominal (`isMemDatabaseUri`) para filtrar e validar a estrutura.
	 *
	 * @type {dbsAcepteds}
	 * @protected
	 * @readonly
	 * @abstract
	 */
	protected abstract readonly dbName: dbsAcepteds;

	/**
	 * Logger estruturado privado para auditoria interna das operações e ciclo de vida do gerador de conexões.
	 * Utiliza contextos customizados de `fileType: 'uri'`, `service: 'database'` e `module: 'BaseMemUri'`.
	 *
	 * @type {pino.Logger}
	 * @private
	 */
	private _internalLogger: pino.Logger = createChildLogger({
		fileType: 'uri',
		service: 'database',
		module: 'BaseMemUri',
	});

	/**
	 * Getter público exposto pela interface `IMemDatabaseUri` para obter a string de conexão validada.
	 *
	 * Realiza um guard-clause em runtime via `isMemDatabaseUri`. Se o cache interno `_uri` estiver indefinido
	 * ou não cumprir as regras do Branded Type daquele banco de dados específico, dispara imediatamente
	 * uma falha fatal interrompendo o ciclo.
	 *
	 * @returns {MemDatabaseURI} A string de conexão nominalmente atestada como válida em runtime.
	 * @throws {Error} Se a URI for nula, indefinida ou malformada estruturalmente.
	 *
	 * @see {@link isMemDatabaseUri} Nominal type guard de validação.
	 */
	public get uri(): MemDatabaseURI {
		if (!isMemDatabaseUri(this._uri, this.dbName)) {
			this.handlerErrors({
				erroLevel: 'fatal',
				error: {},
				message: 'Erro interno, a uri é indefinida ou mal formada!',
				method: 'get uri',
			});
		}
		return this._uri;
	}

	/**
	 * Despacha logs operacionais formatados com os metadados do serviço ativo.
	 * Facilita a auditoria de infraestrutura correlacionando o nome do serviço concreto e o método atual.
	 *
	 * @param {string} message A mensagem a ser registrada no log.
	 * @param {string} method O nome do método de execução de onde o log foi disparado.
	 * @param {pino.LogFnFields} [refineInfosObject={}] Metadados adicionais opcionais para correlação de logs.
	 * @returns {void}
	 * @protected
	 */
	protected logInfo(
		message: string,
		method: string,
		refineInfosObject: pino.LogFnFields = {},
	): void {
		this._internalLogger.info(
			{ service: this.ServiceName, method, ...refineInfosObject },
			message,
		);
	}

	/**
	 * Centraliza a interceptação, formatação e o tratamento de falhas operacionais críticas do módulo.
	 * Registra o incidente sob a gravidade adequada utilizando a instância do Pino Logger e lança
	 * uma exceção padronizada com o prefixo da classe de serviço.
	 *
	 * Este método possui retorno do tipo primitivo do TypeScript `never`, atestando estaticamente ao
	 * compilador que o fluxo de execução é sempre interrompido neste ponto por meio do lançamento de um erro.
	 *
	 * @param {handlerContractsErrorsParams} params Os parâmetros de falha estrutural, contendo nível de erro, mensagem e o erro original.
	 * @returns {never}
	 * @throws {Error} Lança o erro estruturado com a mensagem tratada e enriquecida.
	 * @protected
	 */
	protected handlerErrors(params: handlerContractsErrorsParams): never {
		this._internalLogger[params.erroLevel](
			{ service: this.ServiceName, specifErrors: params.error },
			params.message,
		);
		throw new Error(`Erro de módulo ${this.ServiceName}: erro detectado ${params.message}`);
	}

	/**
	 * Construtor padrão da classe base abstrata.
	 * Aciona automaticamente a inicialização segura de variáveis de ambiente e o ciclo de boot do gerador.
	 */
	constructor() {
		this.init();
	}

	/**
	 * Realiza uma dupla validação de integridade nas configurações de ambiente específicas para banco em memória.
	 *
	 * Este método age como um escudo de runtime contra configurações incompletas ou corrompidas:
	 * 1. Define um subesquema Zod dinâmico (`baseMemEnvShield`) que herda as validações parciais de `memEnvValidationSchema`.
	 * 2. Valida o objeto de ambiente global `env` contra este escudo.
	 * 3. Se a validação falhar, gera uma árvore de erros estruturada através de `z.treeifyError` e interrompe a aplicação.
	 * 4. Se a validação obtiver sucesso, congela o objeto retornado via `Object.freeze` para garantir imutabilidade absoluta.
	 *
	 * @returns {void}
	 * @throws {Error} Se houver variáveis malformadas detectadas pelo validador Zod.
	 * @protected
	 */
	protected validateBaseEnv(): void {
		if (this._baseEnvMemDb === undefined) {
			const baseMemEnvShield: z.ZodType<EnvDataForMemDbUri> = z.object({
				MEM_DB_TYPE: memEnvValidationSchema.shape.MEM_DB_TYPE,
				MEM_DB_PROTOCOL: memEnvValidationSchema.shape.MEM_DB_PROTOCOL,
				MEM_DB_HOST: memEnvValidationSchema.shape.MEM_DB_HOST,
				MEM_DB_PORT: memEnvValidationSchema.shape.MEM_DB_PORT,
				MEM_DB_INDEX_OR_PATH: memEnvValidationSchema.shape.MEM_DB_INDEX_OR_PATH,
				MEM_DB_PASSWORD: memEnvValidationSchema.shape.MEM_DB_PASSWORD,
				MEM_DB_USERNAME: memEnvValidationSchema.shape.MEM_DB_USERNAME,
				MEM_DB_SENTINEL_MASTER_ID: memEnvValidationSchema.shape.MEM_DB_SENTINEL_MASTER_ID,
				MEM_DB_SENTINEL_USERNAME: memEnvValidationSchema.shape.MEM_DB_SENTINEL_USERNAME,
				MEM_DB_SENTINEL_PASSWORD: memEnvValidationSchema.shape.MEM_DB_SENTINEL_PASSWORD,
				NODE_ENV: z.enum(nodeEnvSupported),
			});

			const shildResult = baseMemEnvShield.safeParse(env);

			if (!shildResult.success) {
				this.handlerErrors({
					erroLevel: 'fatal',
					method: 'validateBaseEnv',
					error: z.treeifyError(shildResult.error),
					message: 'Variaveis de hambiente maculadas após boot do sistema.',
				});
			}

			this._baseEnvMemDb = Object.freeze(shildResult.data);
		}
	}

	/**
	 * Aplica a normalização RFC 3986 (Percent-Encoding) sobre a senha fornecida pelo ambiente.
	 *
	 * Senhas contendo caracteres especiais como `@`, `:`, `/`, `?` ou `#` podem corromper a morfologia
	 * sintática de strings de conexão baseadas em URI, gerando quebras em parsers internos de drivers de conexão
	 * ou comportamentos indefinidos. A aplicação de `encodeURIComponent` mitiga esses riscos.
	 *
	 * @param {string} rawPassWord A senha em formato puramente textual obtida das variáveis ambientais.
	 * @returns {void}
	 * @protected
	 */
	protected normalizePassword(rawPassWord: string): void {
		this._password = encodeURIComponent(rawPassWord);
	}

	/**
	 * Orquestrador central de boot e inicialização do gerador.
	 *
	 * Executa sequencialmente as validações de ambiente estruturais básicas, aciona o gancho guard-clause (`guardBroken`)
	 * fornecido pelas classes filhas concretas para verificação interna e, por fim, dispara a geração da URI da conexão.
	 *
	 * @returns {void}
	 * @throws {Error} Lançado caso a validação do ambiente resulte em estado indefinido ou as regras de guard falhem.
	 * @private
	 */
	private init(): void {
		this.validateBaseEnv();

		if (this._baseEnvMemDb === undefined) {
			this.handlerErrors({
				erroLevel: 'fatal',
				method: 'init (BaseMemUri)',
				message: 'Erro ao iniciar o gerador de string de conexão de Memory Database',
				error: {
					envValueMemDb: this._baseEnvMemDb,
				},
			});
		}

		this.guardBroken();

		this.generateMemDBUri();
	}

	/**
	 * Determina e delega a lógica de geração da URI de acordo com o ambiente de execução ativo (`NODE_ENV`).
	 *
	 * Garante o isolamento morfológico:
	 * - Ambientes definidos como `'development'` disparam a chamada do método gancho `generateUriDev`.
	 * - Outros ambientes suportados (como `'production'`, `'test'`, `'stage'`) disparam `generateUriProd`.
	 *
	 * @returns {void}
	 * @throws {Error} Se o ambiente ativo for nulo, indefinido ou incompatível com a lista de ambientes suportados (`nodeEnvSupported`).
	 * @private
	 */
	private generateMemDBUri(): void {
		if (
			this._baseEnvMemDb?.NODE_ENV === undefined ||
			!nodeEnvSupported.includes(this._baseEnvMemDb.NODE_ENV)
		) {
			this.handlerErrors({
				erroLevel: 'fatal',
				method: 'generateMemDBUri',
				message:
					'Erro ao tentar URI para produção verifique se ela pertence a algum dos ambientes suportados',
				error: {
					nodeEnvValue: this._baseEnvMemDb?.NODE_ENV,
					typeofNodeEnv: typeof this._baseEnvMemDb?.NODE_ENV,
				},
			});
		}

		switch (this._baseEnvMemDb.NODE_ENV) {
			case 'development':
				this._uri = this.generateUriDev(this._baseEnvMemDb);
				break;
			default:
				this._uri = this.generateUriProd(this._baseEnvMemDb);
				break;
		}
	}

	/**
	 * Hook Abstrato de Verificação de Integridade Rígida (Guard Clause).
	 *
	 * Deve conter checagens específicas e asserções da infraestrutura de banco concreta. Por exemplo,
	 * validar se configurações adicionais obrigatórias (como Sentinel Master ID ou parâmetros TLS) estão
	 * preenchidas corretamente antes de prosseguir com a montagem da URI.
	 *
	 * @returns {void}
	 * @throws {Error} Lança erro fatal se algum requisito específico de consistência do banco de dados concreto estiver quebrado.
	 * @protected
	 * @abstract
	 */
	protected abstract guardBroken(): void;

	/**
	 * Hook Abstrato de Geração de URI de Conexão específico para o ambiente de Desenvolvimento (`development`).
	 *
	 * Permite construir strings de conexão simplificadas ou apontando para clusters locais/conteinerizados
	 * sem exigências severas de TLS ou túneis SSH que seriam mandatórios em produção.
	 *
	 * @param {EnvDataForMemDbUri} validatedEnvValues As variáveis de ambiente validadas, congeladas e higienizadas.
	 * @returns {MemDatabaseURI} A string de conexão nominal formatada e compatível com as regras de desenvolvimento.
	 * @protected
	 * @abstract
	 */
	protected abstract generateUriDev(validatedEnvValues: EnvDataForMemDbUri): MemDatabaseURI;

	/**
	 * Hook Abstrato de Geração de URI de Conexão específico para ambientes produtivos (`production`, `stage`, `test`).
	 *
	 * Permite construir strings de conexão altamente seguras, incluindo parâmetros de cluster, autenticação TLS,
	 * caminhos de autoridades certificadoras ou strings complexas de Sentinel.
	 *
	 * @param {EnvDataForMemDbUri} validatedEnvValues As variáveis de ambiente validadas, congeladas e higienizadas.
	 * @returns {MemDatabaseURI} A string de conexão nominal formatada e adequada para infraestruturas de alta disponibilidade.
	 * @protected
	 * @abstract
	 */
	protected abstract generateUriProd(validatedEnvValues: EnvDataForMemDbUri): MemDatabaseURI;

	/**
	 * Hook Abstrato de Higienização de Logs.
	 *
	 * Obriga as classes herdeiras concretas a implementarem uma rotina de mascaramento regex ou substituição
	 * de strings sobre a URI de conexão gerada. Garante que credenciais sensíveis (como senhas contidas no corpo
	 * da string de conexão) sejam filtradas antes de qualquer gravação ou despacho de logs operacionais.
	 *
	 * @param {string} unmaskUri A URI contendo dados e credenciais em formato puro/exposto.
	 * @returns {string} A URI mascarada e sanitizada para armazenamento seguro em logs (ex: substituindo a senha por `'***'`).
	 * @protected
	 * @abstract
	 */
	protected abstract maskUriToLog(unmaskUri: string): string;
}
