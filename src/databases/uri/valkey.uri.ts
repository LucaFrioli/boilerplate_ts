import {
	assertsDatabaseUsername,
	assertsMemDatabaseURI,
	type DatabaseUsername,
	type MemDatabaseURI,
} from '@Types/security.types.js';
import { acceptedMemDatabaseProtocols } from '@Configs/constants/env.constants.js';
import { maskLogDatabaseUsername } from '@Utils/masks.util.js';
import { BaseMemUri, type EnvDataForMemDbUri } from './contracts/BaseMemUri.contract.js';

/**
 * Gerador de String de Conexão para o Valkey (e Redis-compatible).
 * Responsável por montar URIs validadas de acordo com a modalidade
 * de rede selecionada (TCP/IP, Unix Sockets, TLS ou Sentinel).
 *
 * Segue a filosofia Fail-Fast e Contracts-First, abortando a
 * inicialização caso credenciais, protocolos ou parâmetros essenciais
 * estejam ausentes ou mal formatados na variável de ambiente.
 *
 * Formato padrão: protocolo://[usuario]:[senha]@[host]:[porta]/[index]
 */
export class ValkeyConnectionString extends BaseMemUri {
	private _auth?: string;
	protected readonly dbName = 'valkey' as const;
	private _uname?: DatabaseUsername;
	private candidateUri: string = '';
	private static readonly secParamsTls: string = '?tls=true&rejectUnauthorized=true&timeout=5000';
	private static readonly secParamSocket: string = '?maxRetriesPerRequest=3&enableReadyCheck=true';
	private static readonly secParamsSentinel: string = '&timeout=5000&role=master';

	protected get ServiceName(): string {
		return 'ValkeyConnectionString';
	}

	/**
	 * Verifica a integridade mínima dos parâmetros obrigatórios
	 * de conexão presentes no objeto instanciado a partir da Env.
	 *
	 * Este método é chamado na fase de inicialização (boot) da classe.
	 * Valida o tipo de banco (MEM_DB_TYPE), se as credenciais (username/password)
	 * são strings válidas, aciona os devidos parsers e delega a montagem
	 * inicial da parte de autenticação.
	 *
	 * @throws Error - Fatal caso os tipos sejam incompatíveis ou maculados.
	 */
	protected guardBroken(): void {
		if (!this._baseEnvMemDb) {
			this.handlerErrors({
				erroLevel: 'fatal',
				error: {
					rawValue: this._baseEnvMemDb,
				},
				method: 'guardBroken',
				message:
					'Algo deu errado ao instânciar as variaveis de ambinete para o gerador de URI Valkey',
			});
		}

		if (this._baseEnvMemDb.MEM_DB_TYPE !== 'valkey') {
			this.handlerErrors({
				erroLevel: 'fatal',
				method: 'GuardBroken',
				message: `Tentativa de formar ValkeyURI porém a env está configurada como ${String(this._baseEnvMemDb.MEM_DB_TYPE)}`,
				error: {
					databaseType: this._baseEnvMemDb.MEM_DB_TYPE,
					specify:
						'Erro tentativa de formação de ValkeyUri porém MEM_DB_TYPE é incompatível',
				},
			});
		}

		if (this._baseEnvMemDb.MEM_DB_PASSWORD) {
			if (typeof this._baseEnvMemDb.MEM_DB_PASSWORD !== 'string') {
				this.handlerErrors({
					erroLevel: 'fatal',
					method: 'GuardBroken',
					error: {
						typeOfPassword: typeof this._baseEnvMemDb.MEM_DB_PASSWORD,
						expectedType: 'string',
					},
					message: 'A senha deve ser obrigatóriamente uma string',
				});
			}

			this.normalizePassword(this._baseEnvMemDb.MEM_DB_PASSWORD);
		}

		if (this._baseEnvMemDb.MEM_DB_USERNAME) {
			if (typeof this._baseEnvMemDb.MEM_DB_USERNAME !== 'string') {
				this.handlerErrors({
					erroLevel: 'fatal',
					method: 'guardBroken',
					error: {
						typeofUsername: typeof this._baseEnvMemDb.MEM_DB_USERNAME,
						expectedType: 'string',
					},
					message: 'O Username do banco de dados deve ser obrigatóriamente uma string',
				});
			}

			const username = this._baseEnvMemDb.MEM_DB_USERNAME;
			assertsDatabaseUsername(username, this.dbName);
			this._uname = username;
		}

		this.generateAuth(this._baseEnvMemDb);
	}

	/**
	 * Constrói e centraliza a porção de autenticação (username:password@) da URI.
	 *
	 * Em produção, impõe a obrigatoriedade de credenciais de forma estrita.
	 * Apenas em desenvolvimento/testes é permitido rodar sem usuário ou senha.
	 *
	 * @param baseEnv Objeto contendo as variáveis de ambiente base já validadas pelo contrato.
	 * @throws Error - Fatal caso as credenciais faltem fora do ambiente dev/test.
	 */
	private generateAuth(baseEnv: EnvDataForMemDbUri): void {
		if (
			baseEnv.NODE_ENV !== 'development' &&
			(typeof baseEnv.MEM_DB_USERNAME !== 'string' ||
				typeof baseEnv.MEM_DB_PASSWORD !== 'string')
		) {
			this.handlerErrors({
				erroLevel: 'fatal',
				message: 'Em produção adicione as credências, válidas no arquivo .env',
				error: {
					typeofUserName: typeof baseEnv.MEM_DB_USERNAME,
					typeofPassword: typeof baseEnv.MEM_DB_PASSWORD,
				},
				method: 'generateAuth',
			});
		}

		if (this._uname && this._password) {
			this._auth = `${this._uname}:${this._password}@`;
			return;
		}

		if (this._password) {
			this._auth = `:${this._password}@`;
			return;
		}

		if (this._uname) {
			this._auth = `${this._uname}:@`;
			return;
		}

		this._auth = '';
		return;
	}

	/**
	 * Sanitiza a URI antes de registrá-la nos logs da aplicação.
	 *
	 * Aplica ofuscação (mascaramento) em senhas tanto da instância principal
	 * quanto do cluster Sentinel, impedindo que vazem em plain-text no SIEM.
	 * Utiliza ofuscação parcial para o username para fins de rastreabilidade.
	 *
	 * @param unmaskUri URI em formato bruto recém-gerada, contendo dados sensíveis.
	 * @returns String formatada e segura para log.
	 */
	protected maskUriToLog(unmaskUri: string): string {
		if (this._password && this._uname) {
			unmaskUri = unmaskUri
				.replace(/:([^:@]+)@/, ':*********@')
				.replace(this._uname, maskLogDatabaseUsername(this._uname));
		}

		if (this._password) {
			unmaskUri =unmaskUri.replace(/:([^:@]+)@/, ':*********@');
		}

		if (this._uname) {
			unmaskUri = unmaskUri.replace(this._uname, maskLogDatabaseUsername(this._uname));
		}

		if (unmaskUri.includes('sentinelPassword=')) {
			unmaskUri = unmaskUri.replace(/sentinelPassword=[^&]+/, 'sentinelPassword=*********');
		}

		const sentinelUser = this._baseEnvMemDb?.MEM_DB_SENTINEL_USERNAME ? this._baseEnvMemDb.MEM_DB_SENTINEL_USERNAME : ''
		if (sentinelUser && sentinelUser !== '') {
			assertsDatabaseUsername(sentinelUser, this.dbName)
			if (sentinelUser && unmaskUri.includes('sentinelUsername=')) {
				unmaskUri = unmaskUri.replace(new RegExp(`sentinelUsername=${sentinelUser}`), `sentinelUsername=${maskLogDatabaseUsername(sentinelUser)}`);
			}
		}

		return unmaskUri;
	}

	/**
	 * Gera a String de Conexão focada em ambientes de Desenvolvimento (DEV).
	 *
	 * Prioriza uma verificação flexível. Permite conexão via protocolo plaintext
	 * e socket UDS livre de TLS. Adere o princípio "fail-fast" apenas para
	 * corrupção grave da URI resultante.
	 *
	 * @param validatedEnvValues - Valores sanitizados do banco em memória.
	 * @returns URI final validada.
	 */
	protected generateUriDev(validatedEnvValues: EnvDataForMemDbUri): MemDatabaseURI {
		if (!this._auth && typeof this._auth !== 'string') {
			this.handlerErrors({
				erroLevel: 'fatal',
				method: 'generateUriDev',
				error: {
					typeof: typeof this._auth,
					auth:
						typeof this._auth !== 'undefined'
							? this.maskUriToLog(this._auth)
							: this._auth,
				},
				message:
					'Tentativa de maculação ou alteração de credências da url durante formação',
			});
		}

		const isNumericIndex: boolean = typeof validatedEnvValues.MEM_DB_INDEX_OR_PATH === 'number';

		this.candidateUri = isNumericIndex
			? `${validatedEnvValues.MEM_DB_PROTOCOL}://${this._auth}${validatedEnvValues.MEM_DB_HOST}:${String(validatedEnvValues.MEM_DB_PORT)}/${String(validatedEnvValues.MEM_DB_INDEX_OR_PATH)}`
			: `${validatedEnvValues.MEM_DB_PROTOCOL}://${this._auth}${String(validatedEnvValues.MEM_DB_INDEX_OR_PATH)}`;

		try {
			if (this.candidateUri === '') {
				throw new Error('Tentativa de realizar validação com uri inválida e vazia,', {
					cause: 'Erro na execução de criação da Uri verifique o método',
				});
			}
			assertsMemDatabaseURI(this.candidateUri, this.dbName);
			this.logInfo('String de conexão valkey formada com sucesso', 'generateUriDev', {
				maskedUri: this.maskUriToLog(this.candidateUri),
				connectionMode: isNumericIndex ? 'tcp' : 'socket',
			});

			return this.candidateUri;
		} catch (e) {
			this.handlerErrors({
				erroLevel: 'fatal',
				method: 'generateUriDev',
				error: e,
				message:
					'Tentativa de criar uma uri porém ela não é valida para banco de dados Valkey',
			});
		}
	}

	/**
	 * Gera a String de Conexão hiper-restrita para ambientes de Produção e Staging.
	 *
	 * Opera como um Strategy Pattern/Roteador implementando *Defense in Depth*:
	 * 1. **UDS (Unix Socket):** Exige protocolo plaintext (`valkey://`) confinado ao SO.
	 * 2. **TLS:** TCP/IP genérico exige protocolo criptografado (`valkeys://`) + parâmetros de rejeição.
	 * 3. **Sentinel:** Suporte a Multi-Host TCP com parâmetros obrigatórios de master node.
	 *
	 * Extrema a filosofia Fail-Fast para proibir configurações falhas ou inseguras.
	 *
	 * @param validatedEnvValues Valores sanitizados do banco em memória.
	 * @returns URI final de produção, estruturalmente garantida e imutável.
	 */
	protected generateUriProd(validatedEnvValues: EnvDataForMemDbUri): MemDatabaseURI {
		let modality: string = '';
		if (!this._auth || typeof this._auth !== 'string' || this._auth === '') {
			this.handlerErrors({
				erroLevel: 'fatal',
				method: 'generateUriProd',
				error: {
					typeofAuth: typeof this._auth,
					authValue: !this._auth ? '' : this.maskUriToLog(this._auth),
				},
				message: `Tentativa de criar String de conexão para ${this.dbName} sem credências, verifique a env ou tentativa de maculação de memória.`,
			});
		}

		const hasThisProtocol: boolean = acceptedMemDatabaseProtocols.includes(
			validatedEnvValues.MEM_DB_PROTOCOL,
		);
		const isSocketConnection: boolean =
			typeof validatedEnvValues.MEM_DB_INDEX_OR_PATH === 'string';

		if (
			!hasThisProtocol ||
			(validatedEnvValues.MEM_DB_PROTOCOL === 'valkey' && !isSocketConnection)
		) {
			this.handlerErrors({
				erroLevel: 'fatal',
				method: 'generateUriProd',
				error: {
					acceptedProtocolinList: hasThisProtocol,
					protocolValue: validatedEnvValues.MEM_DB_PROTOCOL,
				},
				message:
					'o protocolo deve estar contido na lista de protocolos aceitos pela aplicação e não deve ser Valkey em produção por motivos de segurança, ao menos em casos de socket',
			});
		}

		if (isSocketConnection) {
			if (validatedEnvValues.MEM_DB_PROTOCOL !== 'valkey') {
				this.handlerErrors({
					erroLevel: 'fatal',
					method: 'generateUriProd',
					error: {
						socketPath: validatedEnvValues.MEM_DB_INDEX_OR_PATH,
						protocol: validatedEnvValues.MEM_DB_PROTOCOL,
						expectedProtocol: 'valkey',
						richInfo:
							'Caso queira utilizar uma conexão valkey com socket obrigatoriamente a conexão deve ser **( valkey )**',
					},
					message: 'Tentativa de cconexão via socket com protocolo inválido',
				});
			}

			this.candidateUri = `${validatedEnvValues.MEM_DB_PROTOCOL}://${this._auth}${String(validatedEnvValues.MEM_DB_INDEX_OR_PATH)}${ValkeyConnectionString.secParamSocket}`;
			modality = 'socket connection'
		}


		if (validatedEnvValues.MEM_DB_PROTOCOL === 'valkey+sentinel') {
			if (typeof validatedEnvValues.MEM_DB_INDEX_OR_PATH !== 'number') {
				this.handlerErrors({
					erroLevel: 'fatal',
					method: 'generateUriProd',
					error: {
						typeofIndexExpected: 'number',
						typeofRecivedIndex: typeof validatedEnvValues.MEM_DB_INDEX_OR_PATH,
						recivedIndex: validatedEnvValues.MEM_DB_INDEX_OR_PATH
					},
					message: 'Tentativa de construção de string de conexão valkey TSL em prod com index invalido'
				});
			}

			const sentinelMasterId = validatedEnvValues.MEM_DB_SENTINEL_MASTER_ID;

			if (!sentinelMasterId || sentinelMasterId === '') {
				this.handlerErrors({
					erroLevel: 'fatal',
					method: 'generateUriProd',
					error: { sentinelMasterId: typeof sentinelMasterId },
					message: 'A variável de ambiente MEM_DB_SENTINEL_MASTER_ID é obrigatória para o protocolo valkey+sentinel'
				});
			}

			const isMultiHost = validatedEnvValues.MEM_DB_HOST.includes(',');
			const authorityPart = isMultiHost
				? validatedEnvValues.MEM_DB_HOST
				: `${validatedEnvValues.MEM_DB_HOST}:${String(validatedEnvValues.MEM_DB_PORT)}`;

			let sentinelQueryParams = `?sentinelMasterId=${sentinelMasterId}${ValkeyConnectionString.secParamsSentinel}`;

			if (validatedEnvValues.MEM_DB_SENTINEL_USERNAME && validatedEnvValues.MEM_DB_SENTINEL_PASSWORD) {
				sentinelQueryParams += `&sentinelUsername=${validatedEnvValues.MEM_DB_SENTINEL_USERNAME}&sentinelPassword=${validatedEnvValues.MEM_DB_SENTINEL_PASSWORD}`;
			}

			this.candidateUri = `${validatedEnvValues.MEM_DB_PROTOCOL}://${this._auth}${authorityPart}/${String(validatedEnvValues.MEM_DB_INDEX_OR_PATH)}${sentinelQueryParams}`
			modality = 'Sentinel Connection'

		}


		if (validatedEnvValues.MEM_DB_PROTOCOL === 'valkeys') {
			if (typeof validatedEnvValues.MEM_DB_INDEX_OR_PATH !== 'number') {
				this.handlerErrors({
					erroLevel: 'fatal',
					method: 'generateUriProd',
					error: {
						typeofIndexExpected: 'number',
						typeofRecivedIndex: typeof validatedEnvValues.MEM_DB_INDEX_OR_PATH,
						recivedIndex: validatedEnvValues.MEM_DB_INDEX_OR_PATH
					},
					message: 'Tentativa de construção de string de conexão valkey TSL em prod com index invalido'
				});
			}
			this.candidateUri = `${validatedEnvValues.MEM_DB_PROTOCOL}://${this._auth}${validatedEnvValues.MEM_DB_HOST}:${String(validatedEnvValues.MEM_DB_PORT)}/${String(validatedEnvValues.MEM_DB_INDEX_OR_PATH)}${ValkeyConnectionString.secParamsTls}`

			modality = 'Default Connection'
		}

		try {
			if (this.candidateUri === '') {
				throw new Error('Tentativa de realizar validação com uri inválida e vazia em produção', {
					cause: 'Erro na execução de criação da Uri verifique o método',
				});
			}
			assertsMemDatabaseURI(this.candidateUri, this.dbName);

			this.logInfo('String de conexão valkey formada com sucesso', 'generateUriDev', {
				maskedUri: this.maskUriToLog(this.candidateUri),
				connectionMode: isSocketConnection ? 'socket' : 'tcp',
				modality: modality ? modality : 'Error'
			});

			return this.candidateUri;

		} catch (e) {
			this.handlerErrors({
				erroLevel: 'fatal',
				method: 'generateUriProd',
				error: e,
				message:
					'Tentativa de criar uma uri porém ela não é valida para banco de dados Valkey',
			});
		}
	}
}
