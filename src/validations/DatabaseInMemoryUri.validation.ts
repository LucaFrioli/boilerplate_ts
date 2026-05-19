import { type handlerContractsErrorsParams, createChildLogger } from '@Configs/logger.js';
import {
	acceptedMemDatabaseMultiHostProtocols,
	acceptedMemDatabaseProtocols,
	type dbsAcepteds,
} from '@Configs/constants/env.constants.js';
import { DatabaseUsernameValidator } from './DatabaseUsername.validation.js';
import { DatabasePasswordValidation } from './DatabasePassword.validation.js';
import { resolve } from 'node:path';
import { existsSync, statSync } from 'node:fs';
import { HostValidator } from './Host.validations.js';

/**
 * Validador principal para Strings de Conexão (URIs) de Bancos de Dados em Memória.
 *
 * Responsável por garantir que a string formada (ou informada) atenda
 * estritamente aos requisitos morfológicos e de protocolos aceitos.
 * Contém lógicas de fallback específicas para validar conexões baseadas
 * em Unix Domain Sockets (UDS) quando a URI não for mapeável via TCP padrão.
 */
export class DatabaseMemoryUriValidation {
	/** Logger estruturado (Pino) dedicado a esta classe — registra todas as falhas de validação de URI para auditoria SIEM. */
	private static databaseMemoryUriValidationLogger = createChildLogger({
		fileType: 'validation',
		module: 'DatabaseInMemoryUri',
		service: 'database',
	});

	/**
	 * Manipulador central de erros fatais da classe.
	 *
	 * Segue o padrão Fail-Fast (ADR 003): loga com nível dinâmico
	 * e lança exceção imediatamente, abortando a inicialização.
	 * O retorno `:never` garante ao compilador que o fluxo para aqui.
	 *
	 * @param params Objeto estruturado com nível de erro, método de origem, detalhes e mensagem.
	 * @throws Error — sempre. Nenhuma execução continua após esta chamada.
	 */
	private static handlerErrors(params: handlerContractsErrorsParams): never {
		this.databaseMemoryUriValidationLogger[params.erroLevel](
			{ method: params.method, errors: params.error },
			params.message,
		);
		throw new Error(params.message);
	}

	/**
	 * Predicado auxiliar que verifica se um protocolo pertence à whitelist
	 * definida em `env.constants.ts` (ex: `valkey`, `valkeys`, `valkey+sentinel`).
	 *
	 * Centraliza a consulta para evitar duplicação da referência ao array.
	 */
	private static acceptedProtocolTest = (protocol: string): boolean =>
		acceptedMemDatabaseProtocols.includes(protocol);

	/**
	 * Verifica se o protocolo extraído da URI (TCP/IP) pertence
	 * à whitelist da aplicação (ex: valkey, valkeys, valkey+sentinel).
	 *
	 * @param uri A URI completa a ser analisada.
	 * @returns true se o protocolo for suportado, false caso contrário.
	 * @throws Error - Aborta execução em caso de URL formatada incorretamente.
	 */
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

	/**
	 * Valida a porção de autenticação (`user:password`) extraída de uma URI.
	 *
	 * Método reutilizável que garante **simetria de segurança** entre todos
	 * os caminhos do roteador (`verifyIsSocketUri` e `verifyIsMultiHostUri`).
	 *
	 * - Username: validado via `DatabaseUsernameValidator` (morfologia rígida).
	 * - Password: validada via `DatabasePasswordValidation` (entropia mínima).
	 * - Ambos os campos são opcionais: se ausentes (string vazia), o check é ignorado.
	 *
	 * @param authString String bruta no formato `"user:pass"`, `":pass"`, `"user:"` ou `""`.
	 * @param dbName Identificador do banco para contextualizar a validação do username.
	 * @returns `true` se as credenciais forem válidas ou ausentes, `false` se malformadas.
	 */
	private static hasValidAuth(authString: string, dbName: dbsAcepteds): boolean {
		// Decompõe a string de auth pelo delimitador ':' e congela para imutabilidade
		// Exemplo: 'prd_api_rw_01_xYz:SenhaF0rt3' -> ['prd_api_rw_01_xYz', 'SenhaF0rt3']
		const unameAndPass = Object.freeze(authString.split(':'));

		// Valida o Username (se fornecido) usando o Schema/Morfologia rígida definida para o dbName
		if (unameAndPass[0] !== '' && typeof unameAndPass[0] === 'string') {
			if (!DatabaseUsernameValidator.verifyUsername(unameAndPass[0], dbName))
				return false;
		}

		// Valida a Password (se fornecida) usando a verificação de entropia/força mínima do sistema
		if (unameAndPass[1] !== '' && typeof unameAndPass[1] === 'string') {
			if (!DatabasePasswordValidation.isValid(unameAndPass[1])) return false;
		}

		return true;
	}

	/**
	 * Roteador de validação secundário para *Unix Domain Sockets (UDS)*.
	 * É invocado como *fallback* quando a string informada não for reconhecida
	 * como uma URL TCP/IP padrão pela API nativa `URL` do Node.
	 *
	 * Extrai manualmente o protocolo, credenciais e o suposto caminho de
	 * arquivo para validá-los individualmente em ambiente local.
	 *
	 * @param uri A URI de socket no formato `protocolo://[user]:[pass]@/caminho`
	 * @param dbName O identificador do banco usado na validação de usuário.
	 * @returns true se for um socket estruturalmente coerente, false caso contrário.
	 */
	private static verifyIsSocketUri(uri: string, dbName: dbsAcepteds): boolean {
		// Separa o Protocolo do restante do corpo (credenciais + path)
		// Exemplo: 'valkey://user:pass@/var/run/valkey.sock' -> ['valkey', 'user:pass@/var/run/valkey.sock']
		const splitedStringProtocol = Object.freeze(uri.split('://'));

		// Validações básicas de formato para garantir que a URI tem corpo e protocolo
		if (!splitedStringProtocol[0]) return false;
		// Impede protocolos não autorizados
		if (!this.acceptedProtocolTest(splitedStringProtocol[0])) return false;
		if (!splitedStringProtocol[1]) return false;

		// Isola a parte de Autenticação do Caminho do Socket
		// Usa o '@' como delimitador padrão de URIs para separar as credenciais
		const splitedStringVerifyHasAuth = Object.freeze(splitedStringProtocol[1].split('@'));

		// Se o array tiver 2 elementos, significa que o '@' foi encontrado e há credenciais declaradas.
		if (splitedStringVerifyHasAuth.length === 2) {
			// Prevenção de anomalias na engine V8 durante splits ou memória corrompida.
			if (!splitedStringVerifyHasAuth[0] && splitedStringVerifyHasAuth[0] !== '') {
				this.handlerErrors({
					erroLevel: 'fatal',
					method: 'verifyIsSocketUri',
					error: { internalFLux: 'splitedStringVerifyHasAuth' },
					message:
						'Erro de tentativa de alteração de memória durante fluxo de validação de URL',
				});
			}

			// Extrai Username e Password
			// Exemplo: 'user:pass' -> ['user', 'pass']
			const authVerification = this.hasValidAuth(splitedStringVerifyHasAuth[0], dbName);
			if (!authVerification) return false;

			// Se a autenticação estiver nos conformes, repassa a segunda parte da string (o file path) para validação de I/O
			return this.socketVerification(splitedStringVerifyHasAuth[1]);
		}

		// Se o array possui apenas 1 elemento, não houve '@'. Isso indica uma URI sem credenciais.
		// A string inteira após o protocolo é assumida como sendo o caminho bruto no sistema de arquivos.
		const socketPath = splitedStringVerifyHasAuth[0];
		return this.socketVerification(socketPath);
	}

	/**
	 * Valida diretamente no sistema operacional se o caminho providenciado
	 * aponta para um Socket real e existente no filesystem.
	 *
	 * Garante que a aplicação falhe (fail-fast) ao tentar inicializar com
	 * arquivos de socket inexistentes ou apontamentos para diretórios/arquivos
	 * normais (ex: `.txt`).
	 *
	 * @param socketPath O caminho bruto (UDS string path) retirado da URI.
	 * @returns true se o arquivo existe e for do tipo socket de fato.
	 */
	private static socketVerification(socketPath: unknown): boolean {
		if (!socketPath || typeof socketPath !== 'string') {
			this.handlerErrors({
				erroLevel: 'fatal',
				method: 'socketVerification',
				error: {
					typeofSocketPathReceived: typeof socketPath,
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
				'Falha crítica ao testar normalizar ou ler as propriedades do caminho do Socket',
			);
			return false;
		}
	}


	/**
	 * Heurística rápida para detectar URIs Multi-Host (clusters distribuídos).
	 *
	 * Verifica se a seção de hosts da URI contém vírgula (`,`), o que indica
	 * múltiplos nós separados — padrão utilizado pelo Valkey Sentinel e Redis Cluster.
	 *
	 * É invocado **antes** de `URL.canParse()` no roteador `verifyUrl()` porque
	 * a classe nativa `URL` do Node.js não suporta vírgulas na authority part
	 * e retornaria `false`, direcionando incorretamente para o fallback de Socket UDS.
	 *
	 * @example
	 * // Retorna true:
	 * isMultiHostUri('valkey+sentinel://user:pass@10.0.0.1:26379,10.0.0.2:26379/0?sentinelMasterId=mymaster')
	 *
	 * // Retorna false (single-host):
	 * isMultiHostUri('valkeys://user:pass@192.168.0.1:6379/0')
	 *
	 * @param url A URI candidata (já validada como string não-vazia).
	 * @returns `true` se a seção de hosts contiver vírgula, `false` caso contrário.
	 */
	private static isMultiHostUri(url: string): boolean {
		// Remove o protocolo para analisar apenas o corpo da URI
		const body = url.split('://')[1];
		if (!body) return false;

		// Se houver credenciais (user:pass@...), a vírgula relevante está DEPOIS do '@'
		// Isso evita falsos positivos caso a senha contenha vírgula (ex: encodeURIComponent)
		const targetSection = body.includes('@') ? body.split('@')[1] : body;
		if (!targetSection) return false;

		// Remove path (/0) e query params (?timeout=...) para isolar apenas os hosts
		const hostSection = targetSection.split(/[/?]/)[0];
		if (!hostSection) return false;

		// A presença de vírgula na seção de hosts é o indicador definitivo de Multi-Host
		return hostSection.includes(',');
	}


	/**
	 * Validador completo para URIs Multi-Host (Valkey Sentinel / Redis Cluster).
	 *
	 * Realiza validação em **5 camadas de defesa** (Defense in Depth):
	 * 1. **Protocolo** — deve ser `valkey+sentinel` ou `redis+sentinel`.
	 * 2. **Query Params** — `sentinelMasterId` é obrigatório e validado via regex slug-safe.
	 * 3. **Credenciais** — username e password validados via `hasValidAuth()` (se presentes).
	 * 4. **Nós da malha** — cada nó é validado individualmente (formato `host:porta`).
	 * 5. **Host e Porta** — host classificado via `HostValidator`, porta no range POSIX (1–65535).
	 *
	 * O método é envolvido em `try/catch` para capturar falhas inesperadas de parsing
	 * sem derrubar a aplicação — o catch loga e retorna `false`.
	 *
	 * @param uri A URI Multi-Host completa (já detectada por `isMultiHostUri`).
	 * @param dbName Identificador do banco para contextualizar validação de credenciais.
	 * @returns `true` se todas as 5 camadas passarem, `false` ou throw fatal caso contrário.
	 */
	private static verifyIsMultiHostUri(uri: string, dbName: dbsAcepteds): boolean {
		try {
			// === CAMADA 1: Validação do Protocolo ===
			const protocol = uri.split('://')[0];
			if (!protocol || !acceptedMemDatabaseMultiHostProtocols.includes(protocol)) {
				this.databaseMemoryUriValidationLogger.error(
					{ method: 'verifyIsMultiHostUri', protocol, dbName },
					'Protocolo inválido para conexões Multi-Host. Esperado valkey+sentinel ou redis+sentinel.'
				);
				return false;
			}

			// Extrai o corpo da URI (tudo após '://')
			const body = uri.split('://')[1];
			if (!body) return false;

			// Separa a mainSection (auth + hosts + path) da queryString (parâmetros)
			const [mainSection, queryString] = body.split('?');

			// === CAMADA 2: Validação do sentinelMasterId (obrigatório) ===
			if (!queryString || !queryString.includes('sentinelMasterId=')) {
				this.handlerErrors({
					erroLevel: 'fatal',
					method: 'verifyIsMultiHostUri',
					error: { queryParams: queryString || 'vazio', dbName },
					message: 'URIs do tipo Sentinel exigem obrigatoriamente o parâmetro sentinelMasterId'
				});
			}

			// Extrai o valor do sentinelMasterId e valida sua morfologia (slug alfanumérico seguro)
			const masterIdMatch = queryString.match(/sentinelMasterId=([^&]+)/);
			const masterId = masterIdMatch ? masterIdMatch[1] : null;
			const masterIdRegex = /^[a-zA-Z0-9_-]{3,64}$/;

			if (!masterId || !masterIdRegex.test(masterId)) {
				this.handlerErrors({
					erroLevel: 'fatal',
					method: 'verifyIsMultiHostUri',
					error: { extractedMasterId: masterId, dbName },
					message: 'O sentinelMasterId fornecido na URL possui caracteres inválidos ou morfologia incorreta'
				});
			}

			// === CAMADA 3: Validação de Credenciais (se presentes) ===
			// Se houver '@', a mainSection é dividida em [auth, hosts+path].
			// Se não houver '@', a mainSection inteira representa hosts+path (sem credenciais).
			if (!mainSection) return false;
			const authAndHostArray = mainSection.includes('@') ? mainSection.split('@') : mainSection;

			// Se authAndHostArray for um Array, há credenciais para validar
			if (Array.isArray(authAndHostArray) && authAndHostArray[0]) {
				const isValidAuth = this.hasValidAuth(authAndHostArray[0], dbName);
				if (!isValidAuth) return false;
			}

			// Extrai a seção de hosts: se houve split por '@', pega a parte após; senão, usa a mainSection inteira
			const hostSection = Array.isArray(authAndHostArray) ? mainSection.split('@')[1] : mainSection;

			// Remove o índice do banco (/0) se ele existir ao final dos hosts
			if (!hostSection) return false;
			const cleanHostSection = hostSection.split('/')[0];

			if (!cleanHostSection) return false;

			// === CAMADAS 4 e 5: Validação atômica de cada nó (host + porta) ===
			// Quebra a malha de hosts separados por vírgula e congela o array para imutabilidade
			const nodes = Object.freeze(cleanHostSection.split(','));

			// Uma malha de alta disponibilidade precisa de pelo menos 1 nó (recomenda-se 3 em produção)
			if (nodes.length === 0 || nodes[0] === '') return false;

			// Regex para validar se cada nó segue estritamente o padrão "host:porta"
			// Aceita IPs (v4), localhost ou domínios DNS padrão (ex: sentinel-01.infra.local:26379)
			const hostPortRegex = /^([a-zA-Z0-9.-]+):([0-9]+)$/;

			for (const node of nodes) {
				const match = node.match(hostPortRegex);

				if (!match) {
					this.databaseMemoryUriValidationLogger.error(
						{ method: 'verifyIsMultiHostUri', nodeMalformado: node, dbName },
						'Um dos nós da infraestrutura distribuída não segue o padrão host:porta'
					);
					return false;
				}

				if (!match[1] || !match[2]) {
					this.databaseMemoryUriValidationLogger.error({
						method: 'verifyIsMultiHostUri',
						dbName,
						hostType: typeof match[1],
						host: match[1],
						portType: typeof match[2],
						port: match[2]
					}, "Para um nó é necessário um host e uma porta como parâmetros definidos")
					return false;
				};

				const host = match[1];
				// Classifica o host via HostValidator: 'IPv4' | 'IPv6' | 'DNS' | 'invalid'
				const hostType = HostValidator.validateHostType(host);
				// Converte a porta para inteiro para validação numérica de range
				const port = parseInt(match[2], 10);

				if (hostType === 'invalid') {
					this.databaseMemoryUriValidationLogger.error({
						method: 'verifyMultiHostUri',
						hostType,
						host,
						node,
					}, 'Host do node é inválido');
					return false;
				}

				// Validação de segurança de rede: Garante que a porta está no range POSIX válido (1 a 65535)
				if (port < 1 || port > 65535) {
					this.handlerErrors({
						erroLevel: 'fatal',
						method: 'verifyIsMultiHostUri',
						error: { dbName, node, port },
						message: 'Porta de conexão de rede fora do range válido do sistema operacional (1-65535)'
					});
				}
			}

			// Todas as 5 camadas de validação passaram — URI Multi-Host é estruturalmente segura
			return true;

		} catch (e) {
			this.databaseMemoryUriValidationLogger.error(
				{ method: 'verifyIsMultiHostUri', uri, errors: e },
				'Falha catastrófica durante o parsing e validação da URI Multi-Host'
			);
			return false;
		}
	}





	/**
	 * Validador público unificado para validação de URIs em memória.
	 *
	 * Encaminha o fluxo de verificação com base na API nativa do ecossistema:
	 * - Se passível de parsing, valida como URL web (TCP/IP padrão).
	 * - Se não passível de parsing via construtor da API `URL` nativa (ex: conexões de Sockets
	 *   UDS, ou URLs "Multi-Host" não suportadas nativamente), repassa
	 *   a validação à heurística secundária `verifyIsSocketUri`.
	 *
	 * @param url A URI candidata à conexão.
	 * @param dbName Tipo do cache/db usado para reforçar escopo da checagem.
	 * @param fn Predicado injetável opcional para checagem do protocolo suportado.
	 * @returns true se a URI for plenamente aprovada e segura.
	 */
	public static verifyUrl(
		url: unknown,
		dbName: dbsAcepteds,
		fn: (args: unknown) => boolean = this.isAcceptedProtocol.bind(this),
	): boolean {
		if (typeof url !== 'string' || url === '') return false;

		if (this.isMultiHostUri(url)) {
			return this.verifyIsMultiHostUri(url, dbName)
		}

		if (!URL.canParse(url)) {
			return this.verifyIsSocketUri(url, dbName);
		}

		// Chamada intencional, permitindo maior flexibilização da classe manter assim!
		if (!fn(url)) {
			return false;
		}

		return this.isAcceptedProtocol(url);
	}
}
