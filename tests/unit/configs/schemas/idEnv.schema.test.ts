/**
 * @fileoverview Testes das Regras de Negócio do Schema de Identidade.
 *
 * ## O que estamos testando e POR QUÊ
 * O `idEnvValidationsSchema` define as regras de configuração dos identificadores
 * da aplicação (NanoID, UUIDv4, UUIDv7). As validações do Zod (.min, .max, .enum)
 * são de responsabilidade do Zod — não testamos elas.
 *
 * O que testamos são os dois `.refine()` customizados, que contêm
 * lógica de segurança própria da aplicação:
 *
 * ### Refine 1 — Unicidade de caracteres no alfabeto
 * `new Set(val).size === val.length`
 * Caracteres duplicados reduzem a entropia do ID gerado.
 * Um alfabeto de 32 chars com 10 duplicatas tem entropia efetiva de 22 chars.
 * Isso seria uma vulnerabilidade silenciosa — válida para o Zod puro, mas
 * insegura para o domínio deste boilerplate.
 *
 * ### Refine 2 — Apenas caracteres URL-safe
 * `/^[A-Za-z0-9\-_]+$/`
 * IDs gerados são usados em URLs e headers HTTP.
 * Caracteres como `@`, `#`, `!`, espaços e acentos causariam erros de parsing
 * em clientes HTTP, logs e sistemas de roteamento.
 *
 * @see {@link src/configs/schemas/idEnv.schema.ts}
 * @see {@link src/shared/types/identity.type.ts}
 */
import { describe, it, expect } from 'vitest';
import { idEnvValidationsSchema } from '@Configs/schemas/idEnv.schema.js';

// ---------------------------------------------------------------------------
// Fixture: payload mínimo válido — todos os campos passam por todas as validações.
// ---------------------------------------------------------------------------
const validIdPayload = {
	IDENTIFIER_PATTERN: 'nanoid',
	// Alfabeto sem duplicatas, URL-safe, com 64 chars (tamanho máximo permitido)
	IDENTIFIER_NANOID_ALPHABET: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_',
	IDENTIFIER_NANOID_SIZE: '21',
} as const;

function buildPayload(overrides: Record<string, string>): Record<string, string> {
	return { ...validIdPayload, ...overrides };
}

describe('idEnvValidationsSchema', () => {
	// -------------------------------------------------------------------------
	// IDENTIFIER_NANOID_ALPHABET — Refine 1: sem caracteres duplicados
	// -------------------------------------------------------------------------
	describe('IDENTIFIER_NANOID_ALPHABET — unicidade de caracteres (entropia)', () => {
		/**
		 * Caminho feliz: alfabeto padrão sem duplicatas.
		 */
		it('deve aceitar o alfabeto padrão sem duplicatas', () => {
			const result = idEnvValidationsSchema.safeParse(validIdPayload);

			expect(result.success).toBe(true);
		});

		/**
		 * 🔒 Alfabeto com caractere duplicado deve ser rejeitado.
		 * 'AABCDE...' tem 'A' repetido — reduz entropia silenciosamente.
		 * A detecção via Set garante que qualquer duplicata, em qualquer posição, falha.
		 */
		it('deve rejeitar alfabeto com caracteres duplicados', () => {
			// Começamos com o alfabeto padrão mas adicionamos 'A' novamente no final
			const alphabetWithDuplicate = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-A';

			const result = idEnvValidationsSchema.safeParse(
				buildPayload({ IDENTIFIER_NANOID_ALPHABET: alphabetWithDuplicate }),
			);

			expect(result.success).toBe(false);
		});

		/**
		 * Duplicata em posição intermediária também deve ser capturada.
		 * Garante que a regra não é apenas para o início/fim.
		 */
		it('deve rejeitar alfabeto com duplicata em posição intermediária', () => {
			// 32 chars URL-safe, mas 'z' aparece duas vezes (posição 5 e última)
			const alphabetWithMidDuplicate = 'ABCDzFGHIJKLMNOPQRSTUVWXYabcdefz';

			const result = idEnvValidationsSchema.safeParse(
				buildPayload({ IDENTIFIER_NANOID_ALPHABET: alphabetWithMidDuplicate }),
			);

			expect(result.success).toBe(false);
		});

		/**
		 * Alfabeto com exatamente 32 chars únicos (mínimo) deve ser aceito.
		 * Teste de fronteira inferior do comprimento.
		 */
		it('deve aceitar alfabeto com 32 chars únicos (tamanho mínimo)', () => {
			// 32 chars únicos, todos URL-safe
			const minimalAlphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdef';

			const result = idEnvValidationsSchema.safeParse(
				buildPayload({ IDENTIFIER_NANOID_ALPHABET: minimalAlphabet }),
			);

			expect(result.success).toBe(true);
		});

		/**
		 * Alfabeto com 31 chars deve ser rejeitado — abaixo do mínimo de segurança.
		 * Menos de 32 chars únicos reduz o espaço de IDs gerados.
		 */
		it('deve rejeitar alfabeto com menos de 32 caracteres', () => {
			const tooShortAlphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcde'; // 31 chars

			const result = idEnvValidationsSchema.safeParse(
				buildPayload({ IDENTIFIER_NANOID_ALPHABET: tooShortAlphabet }),
			);

			expect(result.success).toBe(false);
		});
	});

	// -------------------------------------------------------------------------
	// IDENTIFIER_NANOID_ALPHABET — Refine 2: apenas chars URL-safe
	// -------------------------------------------------------------------------
	describe('IDENTIFIER_NANOID_ALPHABET — segurança de URL (apenas chars URL-safe)', () => {
		/**
		 * 🔒 '@' é inválido em URLs (usado como separador user@host).
		 * Um ID contendo '@' quebraria parsers de URL e geraria ambiguidade.
		 */
		it('deve rejeitar alfabeto com @ (inválido em URLs)', () => {
			// 32 chars, único, mas contém '@'
			const alphabetWithAt = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ@bcdef';

			const result = idEnvValidationsSchema.safeParse(
				buildPayload({ IDENTIFIER_NANOID_ALPHABET: alphabetWithAt }),
			);

			expect(result.success).toBe(false);
		});

		/**
		 * '#' é o início de um fragmento em URLs — IDs com '#' seriam truncados
		 * por browsers e proxies que interpretam o fragmento como parte do cliente.
		 */
		it('deve rejeitar alfabeto com # (fragmento de URL)', () => {
			const alphabetWithHash = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ#bcdef';

			const result = idEnvValidationsSchema.safeParse(
				buildPayload({ IDENTIFIER_NANOID_ALPHABET: alphabetWithHash }),
			);

			expect(result.success).toBe(false);
		});

		/**
		 * Espaços em IDs causariam problemas em headers HTTP e querystrings
		 * onde o espaço é codificado como '+' ou '%20' dependendo do contexto.
		 */
		it('deve rejeitar alfabeto com espaço', () => {
			// Espaço no meio do alfabeto — 32 chars mas com espaço
			const alphabetWithSpace = 'ABCDEFGHIJKLMNOPQRSTUVWX Zabcde';

			const result = idEnvValidationsSchema.safeParse(
				buildPayload({ IDENTIFIER_NANOID_ALPHABET: alphabetWithSpace }),
			);

			expect(result.success).toBe(false);
		});

		/**
		 * '!' é inválido em muitos contextos de URL sem encoding.
		 */
		it('deve rejeitar alfabeto com ! (char especial não URL-safe)', () => {
			const alphabetWithBang = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ!bcdef';

			const result = idEnvValidationsSchema.safeParse(
				buildPayload({ IDENTIFIER_NANOID_ALPHABET: alphabetWithBang }),
			);

			expect(result.success).toBe(false);
		});

		/**
		 * '-' e '_' são os dois únicos chars especiais permitidos pelo refine.
		 * São seguros em URLs sem encoding (RFC 3986).
		 * Este teste confirma que ambos são aceitos no alfabeto.
		 */
		it('deve aceitar alfabeto contendo - e _ (únicos especiais URL-safe)', () => {
			// 32 chars, únicos, URL-safe, inclui - e _
			const alphabetWithDashAndUnderscore = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ012345-_';

			const result = idEnvValidationsSchema.safeParse(
				buildPayload({ IDENTIFIER_NANOID_ALPHABET: alphabetWithDashAndUnderscore }),
			);

			expect(result.success).toBe(true);
		});
	});

	// -------------------------------------------------------------------------
	// IDENTIFIER_PATTERN — Enum de tipos suportados
	// -------------------------------------------------------------------------
	describe('IDENTIFIER_PATTERN', () => {
		/**
		 * Apenas 'nanoid', 'uuidv4' e 'uuidv7' são suportados.
		 */
		it('deve aceitar nanoid como pattern', () => {
			const result = idEnvValidationsSchema.safeParse(
				buildPayload({ IDENTIFIER_PATTERN: 'nanoid' }),
			);
			expect(result.success).toBe(true);
		});

		it('deve aceitar uuidv4 como pattern', () => {
			const result = idEnvValidationsSchema.safeParse(
				buildPayload({ IDENTIFIER_PATTERN: 'uuidv4' }),
			);
			expect(result.success).toBe(true);
		});

		it('deve aceitar uuidv7 como pattern', () => {
			const result = idEnvValidationsSchema.safeParse(
				buildPayload({ IDENTIFIER_PATTERN: 'uuidv7' }),
			);
			expect(result.success).toBe(true);
		});

		it('deve rejeitar pattern não suportado', () => {
			const result = idEnvValidationsSchema.safeParse(
				buildPayload({ IDENTIFIER_PATTERN: 'ulid' }),
			);
			expect(result.success).toBe(false);
		});
	});

	// -------------------------------------------------------------------------
	// IDENTIFIER_NANOID_SIZE — Limites de entropia
	// -------------------------------------------------------------------------
	describe('IDENTIFIER_NANOID_SIZE — limites de entropia', () => {
		/**
		 * Abaixo de 16 chars a entropia é insuficiente para IDs de aplicação.
		 */
		it('deve rejeitar size abaixo de 16', () => {
			const result = idEnvValidationsSchema.safeParse(
				buildPayload({ IDENTIFIER_NANOID_SIZE: '15' }),
			);
			expect(result.success).toBe(false);
		});

		/**
		 * Acima de 32 chars o ganho entrópico não compensa o custo de storage/UI.
		 */
		it('deve rejeitar size acima de 32', () => {
			const result = idEnvValidationsSchema.safeParse(
				buildPayload({ IDENTIFIER_NANOID_SIZE: '33' }),
			);
			expect(result.success).toBe(false);
		});

		/**
		 * 21 é o padrão recomendado pelo NanoID — deve sempre passar.
		 */
		it('deve aceitar size 21 (padrão NanoID)', () => {
			const result = idEnvValidationsSchema.safeParse(
				buildPayload({ IDENTIFIER_NANOID_SIZE: '21' }),
			);
			expect(result.success).toBe(true);
		});
	});
});
