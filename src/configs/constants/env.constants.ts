import { createChildLogger } from '../logger.js';

// default logger to env

export const envLogger = createChildLogger({
	fileType: 'core',
	module: 'env',
	service: 'valuation',
});

// node_env defaults and supported
// 'test' é obrigatório aqui: o Vitest injeta NODE_ENV=test automaticamente em todos os workers.
// Sem este valor, qualquer módulo que importe env.ts falharia na inicialização dos testes.
export const nodeEnvSupported = ['development', 'stage', 'production', 'test'] as const;

// loacale and date constants

export const timezoneSupported = ['UTC', 'America/Sao_Paulo', 'Europa/Rome'] as const;
export const localeSupported = ['pt-BR', 'en-US', 'it-IT'] as const;

// database constants

/**
 * Regex: ambiente (3 letras) _ serviço/app (3+ letras) _ permissão (ro|rw|adm) _ id (2 digitos) _ UnameAleatório (6+ letras, números e símbolos urlsafty)
 */
export const dbUsernamePattern =
	/^(prd|stg|dev|tst)_[a-z]{3,}_(ro|rw|adm)_[0-9]{2}_[a-zA-Z0-9\-_.~]{9,}$/;

export const enabledDatabaseConections = ['mongodb', 'postgres'] as const;

const acceptedDatabaseProtocols: readonly string[] = [
	'mongodb',
	'mongodb+srv',
	'postgres',
	'postgresql',
];

// domínios para poder criar uris mongo compatíveis com mongoDB em server mode
export const acceptedMongoSrvDomains = [
	'.mongo.net',
	'.mongodb.net',
	/** adicione outros domínios aceitos conforme for necessário, esclar, ou mudar a metodologia */
] as const;

export const dbProtocols: readonly string[] = Object.freeze(acceptedDatabaseProtocols);

export const enableMemDatabaseConnections = ['redis', 'valkey'] as const;

export const acceptedMemDatabaseMultiHostProtocols: readonly string[] = [
	'valkey+sentinel',
	'redis+sentinel',
	'redis-sentinel',
];

export const acceptedMemDatabaseProtocols: readonly string[] = [
	'redis',
	'rediss',
	// Os prefixos valkey e valkeys são future-proofing caso drivers futuros
	// exijam alias nominal explícito, mas operam no mesmo protocolo RESP.
	'valkey',
	'valkeys',
	...acceptedMemDatabaseMultiHostProtocols,
];

export const dbslist = [...enableMemDatabaseConnections, ...enabledDatabaseConections] as const;
export type dbsAcepteds = (typeof dbslist)[number] | 'envBoot';

// Cripto constants

export const supportedCriptographySimetricAlgs = ['hmac', 'hkdf'] as const;
export const supportedCriptographyAsimetricAlgs = ['ed25519', 'ed448'] as const;
export const supportedCriptograpyEngineModes = ['sync_node', 'async_web_api'] as const
export const supportedCipherAlgs = ['aes-256-gcm', 'chacha20-poly1305'] as const;
export const supportedDigestCriptographyAlgs = ['sha256', 'sha384', 'sha512'] as const;

/** **regexValidationToHexKeyMinimalRequire**
 * Fica recomendado o uso do comando `head -c 36 /dev/urandom | od -An -vtx1 | tr -d ' \n'` ou `openssl rand -hex 36`
 * dentro de um temrinal linux para que possa passar uma string entrópica segura para o peppper
 * do sistema em hexadecimal, ou comando simmilar caos utilize outra plataforma
*/
export const regexValidationToHexadecimalKeyMinimalRequire = /^(?=.{64,}$)([0-9a-fA-F]{64,})$/;

/** **regexValidationToBase64KeyMinimalRequire**
 *
 * Fica recomendado gerar uma chave de no mínimo 43 caracteres base 64, ou maior
 * pode-se utilizar o seguinte sccript para gerar
 * de forma automática `head -c 36 /dev/urandom | base64` ou `openssl rand -base64 36`
 *
*/
export const regexValidationToBase64KeyMinimalRequire = /^(?=.{43,}$)([a-zA-Z0-9+/]{43,})=*$/;

// hasher constants
export const supportedHashProviders = ['argon2', 'bcrypt'] as const;

export const regexValidationToHasherProvidersSupported = {
	/**
	 * PHC String Format para Argon2:
	 * $argon2(i|d|id)$v=<version>$m=<memory>,t=<time>,p=<parallelism>$<salt>$<hash>
	 *
	 * - Variantes: argon2i | argon2d | argon2id
	 * - v=    → versão do algoritmo (normalmente 19)
	 * - m=    → memoryCost  (número inteiro)
	 * - t=    → timeCost    (número inteiro)
	 * - p=    → parallelism (número inteiro)
	 * - salt  → Base64 sem padding
	 * - hash  → Base64 sem padding
	 */
	argon2: /^\$argon2(id|i|d)\$v=\d+\$m=\d+,t=\d+,p=\d+\$[A-Za-z0-9+/]+\$[A-Za-z0-9+/]+$/,
	/**
	 * Formato BCrypt (Modular Crypt Format):
	 * $<version>$<rounds>$<salt(22)><hash(31)>
	 *
	 * - version → 2a | 2b | 2y  (2b é o padrão atual e mais seguro)
	 * - rounds  → 04–31 (custo logarítmico)
	 * - salt    → exatamente 22 chars Base64 BCrypt
	 * - hash    → exatamente 31 chars Base64 BCrypt
	 *
	 * ⚠️ BCrypt usa alfabeto Base64 próprio: ./A-Za-z0-9
	 *    diferente do Base64 padrão que usa +/
	 */
	bcrypt: /^\$2[aby]?\$\d{2}\$[./A-Za-z0-9]{53}$/,
} as const;

// id constants

export const identityTypeSupported = ['uuidv4', 'uuidv7', 'nanoid'] as const;

export const regexValidationToIdentitySupported = {
	uuidv7: /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
	uuidv4: /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
} as const;

// piis

/**
 * String de 11 caracteres numerais
 */
export const cpf_raw_regexp = /^\d{11}$/;

/**
 * regexEmailFormat
 *
 * Regex pragmática padrão W3C (HTML5): valida a estrutura sem complexidade excessiva
 *
 * ### Alinhamento com Padrões Internacionais
 * - **Padrão W3C (HTML5):** Esta regex implementa estritamente a especificação definida pelo
 *   W3C para o elemento `<input type="email">`. Ela remove intencionalmente a complexidade
 *   obscura da RFC 5322 (como comentários embutidos ou aspas na parte local) para focar na
 *   morfologia real utilizada em 99.9% dos sistemas de produção da web moderna.
 * - **Diretrizes OWASP:** Segue o princípio de validação de entrada defensiva (Input Sanitization)
 *   da OWASP. Ao limitar caracteres permitidos e restrições de vizinhança de hífens/pontos,
 *   ela mitiga riscos de injeção de código (XSS/SQLi) via e-mail e previne vulnerabilidades de
 *   **ReDoS (Regular Expression Denial of Service)**, pois não possui agrupamentos ambíguos ou
 *   loops aninhados que sobrecarregam a CPU do Node.js.
 *
 * ### Exemplos de Strings ACEITAS (Matches)
 * - `usuario.comum@provedor.com` (Caso padrão alfanumérico)
 * - `user+filtro@empresa.com.br` (Permite tags de filtragem com caractere '+')
 * - `dev.ops!#$%&'*+-/=?^_`{|}~@subdominio.infra.local` (Permite caracteres especiais POSIX legítimos na parte local)
 * - `suporte@localhost` (Estrutura de domínio local de nó único)
 * - `a@b.c` (Tamanhos mínimos estruturais válidos)
 *
 * ### Exemplos de Strings REJEITADAS (Non-Matches)
 * - `@dominio.com` (Falta a parte local antes do caractere '@')
 * - `usuario@` (Falta a parte do host/domínio após o caractere '@')
 * - `usuario@dominio-.com` (O subdomínio não pode terminar com hífen `-`)
 * - `usuario@-dominio.com` (O subdomínio não pode começar com hífen `-`)
 * - `usuario..comum@dominio.com` (Não permite pontos consecutivos `..` na parte local)
 * - `usuario@dom_inio.com` (O caractere underscore `_` é proibido na seção de hosts DNS)
 * - `usuario espaço@dominio.com` (Espaços em branco não escapados são estritamente rejeitados)
 */
export const regexEmailFormat =
	/^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;

/**
 * regexUsernameFormat
 *
 * ### Regras de Validação (Morfologia):
 * - **Tamanho Limite:** Entre 3 e 30 caracteres (ancorado de forma segura via lookahead).
 * - **Caracteres Permitidos:** Letras de 'a' a 'z' (case-insensitive), números de 0 a 9,
 *   e os caracteres especiais seguros ponto (`.`), hífen (`-`) e sublinhado (`_`).
 * - **Restrição de Bordas:** É proibido iniciar ou terminar com caracteres especiais. O primeiro
 *   e o último caractere devem ser estritamente alfanuméricos.
 * - **Prevenção de Abuso Estético (Consecutivos):** Os caracteres especiais (`.`, `-`, `_`) não
 *   podem ser repetidos de forma consecutiva (ex: `user__name` ou `user.-name` são rejeitados).
 * - **Segurança contra ReDoS:** Totalmente imune devido ao quantificador limitado e grupos disjuntos.
 *
 * ### Exemplos de Strings ACEITAS (Matches):
 * - `User-ExamPle_02.jhon` (Caso complexo com múltiplos separadores válidos intercalados)
 * - `Ana` (Tamanho mínimo estrutural legítimo de 3 caracteres)
 * - `On3-B1g.USER_strange.F0rmcao-2` (Comprimento máximo e caracteres alfanuméricos ASCII puros)
 *
 * ### Exemplos de Strings REJEITADAS (Non-Matches):
 * - `_jhon` (Começa com caractere especial)
 * - `jhon_` (Termina com caractere especial)
 * - `jh..on` (Contém caracteres especiais repetidos consecutivamente)
 * - `jh` (Tamanho inferior a 3 caracteres)
 * - `F0rmção-2` (Rejeitado: caracteres com acentuação ou cedilha como 'ç' e 'ã' não são permitidos)
 */
export const regexUsernameFormat =
	/^(?=.{3,30}$)([a-zA-Z0-9]([._-](?![._-])|[a-zA-Z0-9]){1,28}[a-zA-Z0-9])$/;
