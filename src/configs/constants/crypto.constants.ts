// Cripto constants

export const supportedCryptographySimetricAlgs = ['hmac', 'hkdf'] as const;
export const supportedCryptographyAsimetricAlgs = ['ed25519', 'ed448'] as const;
export const supportedCryptographyEngineModes = ['sync_node', 'async_web_api'] as const;
export const supportedCipherAlgs = ['aes-256-gcm', 'chacha20-poly1305'] as const;
export const supportedDigestCryptographyAlgs = ['sha256', 'sha384', 'sha512'] as const;

export type AcceptedKeysCryptoAlphabets = 'hex' | 'base32' | 'base58' | 'base64';

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

/**
 * **regexValidationToBase32KeyMinimalRequire**
 *
 * Fica recomendado gerar uma chave com no mínimo 52 caracteres ou maior com base 32.
 *
 * O Base32 utiliza apenas letras em uppercase e ranges numéricos de 2 até 7, caracteres como `1`, `8`, `9` e `0`são descartados.
 *
 * Rcomenda-se o uso dos seguintes sccripts para gerar uma string no padrão base32:
 * - `head -c 36 /dev/urandom | base32 | tr -d '\n'`
 * - `openssl rand 36 | base32 | tr -d '\n'`
 */
export const regexValidationToBase32KeyMinimalRequire = /^(?=.{52,}$)([A-Z2-7]{52,})=*$/;

/** **regexValidationToBase58KeyMinimalRequire**
 *
 * Fica recomendado gerar uma chave de no mínimo 44 caracteres base 58, ou maior.
 * O Base58 não utiliza símbolos especiais ou padding (=), tornando-o 100% seguro para .env e shell.
 * Você pode gerar chaves compatíveis convertendo 32 bytes brutos de entropia para Base58.
 * *Criação de script de geração em andamento por enquanto aguarde*
 */
export const regexValidationToBase58KeyMinimalRequire = /^(?=.{44,}$)([1-9A-HJ-NP-Za-km-z]{44,})$/;

// hasher constants
export const supportedHashProviders = ['argon2', 'bcrypt'] as const;
export type HashProvidersSupported = (typeof supportedHashProviders)[number];

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
