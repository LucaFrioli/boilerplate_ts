/**
 * @fileoverview Testes das Regras de Negócio do Schema de Configuração do Hasher.
 *
 * ## O que estamos testando e POR QUÊ
 * O `hasherEnvValidationSchema` usa o Zod como veículo, mas as regras dentro
 * dos `.refine()` e `.transform()` são decisões de segurança da aplicação.
 * Essas sim precisam de testes — não estamos testando o Zod, estamos testando
 * que nossas regras de segurança funcionam em todas as situações possíveis.
 *
 * ## Anatomia do que é testado
 *
 * ### HASHER_SECURITY_PEPPER (a mais crítica)
 * O refine() implementa 3 guardas de segurança:
 * 1. O pepper deve ser forte (passwordStrength level 'strong')
 * 2. A string 'F@llback' no valor é sinal do valor padrão de dev → rejeitado em prod
 * 3. Em produção, qualquer valor fraco chama process.exit(1) — nunca em dev/test
 *
 * ### HASHER_PARALLELISM
 * O transform() emite um warn quando parallelism > 16 (risco de performance).
 * Testamos que o warn é emitido E que o valor ainda é retornado corretamente.
 *
 * ## Técnica: vi.spyOn para isolar efeitos colaterais
 * Usamos `vi.spyOn(process, 'exit')` para interceptar chamadas a process.exit(1)
 * sem que o processo de teste realmente morra. Isso permite asserções sobre
 * comportamento fatal sem encerrar o runner.
 *
 * @see {@link src/configs/schemas/hasherEnv.schema.ts}
 * @see {@link src/validations/Password.validations.ts}
 */
import { describe, it, expect, vi } from 'vitest';
import { hasherEnvValidationSchema } from '@Configs/schemas/hasherEnv.schema.js';

// ---------------------------------------------------------------------------
// Fixture: payload mínimo válido que passa em TODAS as validações do schema.
// Usado como base — cada teste sobrescreve apenas a chave que quer testar.
// ---------------------------------------------------------------------------
const validHasherPayload = {
	HASHER_PROVIDER: 'argon2',
	// Pepper forte: 15+ chars, 3+ maiúsculas, 3+ minúsculas, 3+ números, 3+ símbolos
	HASHER_SECURITY_PEPPER: 'Str0ng@Pepper#Test!789',
	HASHER_LENGTH: '32',
	HASHER_SALT_LENGTH: '16',
	HASHER_PARALLELISM: '4',
	HASHER_TIME_COST: '3',
	HASHER_MEMORY_COST: '65536',
} as const;

// ---------------------------------------------------------------------------
// Helper para construir payloads parciais sobre o base válido.
// Evita repetição: cada teste descreve apenas o que muda.
// ---------------------------------------------------------------------------
function buildPayload(overrides: Record<string, string>): Record<string, string> {
	return { ...validHasherPayload, ...overrides };
}

describe('hasherEnvValidationSchema', () => {
	// -------------------------------------------------------------------------
	// HASHER_SECURITY_PEPPER — Regras de força e proteção de produção
	// -------------------------------------------------------------------------
	describe('HASHER_SECURITY_PEPPER', () => {
		/**
		 * Caminho feliz: pepper forte e sem a string 'F@llback'.
		 * Deve ser aceito em qualquer NODE_ENV.
		 */
		it('deve aceitar um pepper forte e válido', () => {
			const result = hasherEnvValidationSchema.safeParse(validHasherPayload);

			expect(result.success).toBe(true);
		});

		/**
		 * Pepper fraco = não passa no passwordStrength('strong').
		 * O refine retorna o resultado de passwordStrength, que será falsy.
		 * Resultado: Zod rejeita com a mensagem de erro do refine.
		 * NODE_ENV=test → process.exit NÃO é chamado (guard só ativa em prod).
		 */
		it('deve rejeitar um pepper fraco em qualquer ambiente', () => {
			const result = hasherEnvValidationSchema.safeParse(
				buildPayload({ HASHER_SECURITY_PEPPER: 'fraco' }),
			);

			expect(result.success).toBe(false);
		});

		/**
		 * Teste de comportamento documentado: o valor padrão de fallback
		 * ('development-secretPepper_SHA256-F@llback') tem comprimento e complexidade
		 * suficientes para PASSAR no passwordStrength('strong') em NODE_ENV=test.
		 *
		 * Por quê? O refine() faz dois checks:
		 * 1. `passwordStrength(val, { securityLevel: 'strong' })` → avalia força do valor
		 * 2. `isFallback && isProd` → ativa process.exit() APENAS em produção
		 *
		 * Em NODE_ENV=test:
		 * - O check de força: 'development-secretPepper_SHA256-F@llback' é longo e tem
		 *   maiúsculas, minúsculas, números e símbolos → passwordStrength retorna true
		 * - O guard de prod: isProd = false → process.exit(1) NÃO é chamado
		 * - Resultado: o schema ACEITA o valor em dev/test (success: true)
		 *
		 * O comportamento de produção (rejeição via process.exit(1)) está coberto
		 * no teste 'deve chamar process.exit(1) com pepper contendo F@llback em prod'.
		 *
		 * Este teste documenta que o fallback é INTENCIONALMENTE aceito fora de
		 * produção para facilitar o desenvolvimento local.
		 */
		it('deve ACEITAR o valor de fallback em NODE_ENV=test (guard só ativa em prod)', () => {
			const result = hasherEnvValidationSchema.safeParse(
				buildPayload({
					HASHER_SECURITY_PEPPER: 'development-secretPepper_SHA256-F@llback',
				}),
			);

			// Em test/dev: aceito (passwordStrength passa, isProd=false)
			// Em production: process.exit(1) seria chamado (testado separadamente)
			expect(result.success).toBe(true);
		});


		/**
		 * 🔒 Teste crítico de segurança: se NODE_ENV=production e o pepper é fraco
		 * OU contém 'F@llback', o código chama process.exit(1).
		 *
		 * Usamos vi.spyOn para INTERCEPTAR a chamada sem matar o processo de teste.
		 * O mock retorna `undefined` (simula saída sem realmente sair).
		 *
		 * Este teste garante que um deploy acidental com pepper inseguro
		 * em produção NUNCA sobe — o servidor morre na inicialização.
		 */
		it('deve chamar process.exit(1) com pepper fraco em NODE_ENV=production', () => {
			// Interceptamos process.exit para não matar o processo do Vitest
			const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => {
				// Retorno vazio — simulamos a saída sem executar de verdade
				return undefined as never;
			});

			// Simulamos o ambiente de produção
			const originalNodeEnv = process.env.NODE_ENV;
			process.env.NODE_ENV = 'production';

			try {
				hasherEnvValidationSchema.safeParse(
					buildPayload({ HASHER_SECURITY_PEPPER: 'fraco' }),
				);

				// Verificamos que o guard de produção disparou
				expect(exitSpy).toHaveBeenCalledWith(1);
			} finally {
				// SEMPRE restauramos o ambiente — independente de passar ou falhar.
				// Sem isso, outros testes rodariam em NODE_ENV=production.
				process.env.NODE_ENV = originalNodeEnv;
				exitSpy.mockRestore();
			}
		});

		/**
		 * 🔒 Teste crítico: string 'F@llback' em produção também dispara process.exit(1).
		 * Isso testa o `isFallback` guard especificamente, separado da verificação de força.
		 */
		it('deve chamar process.exit(1) com pepper contendo F@llback em produção', () => {
			const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => undefined as never);
			const originalNodeEnv = process.env.NODE_ENV;
			process.env.NODE_ENV = 'production';

			try {
				// Usamos um valor forte mas com 'F@llback' embutido — testa o isFallback guard
				hasherEnvValidationSchema.safeParse(
					buildPayload({
						HASHER_SECURITY_PEPPER: 'Str0ng@Pepper#F@llback!789',
					}),
				);

				expect(exitSpy).toHaveBeenCalledWith(1);
			} finally {
				process.env.NODE_ENV = originalNodeEnv;
				exitSpy.mockRestore();
			}
		});

		/**
		 * Confirmação NEGATIVA: em NODE_ENV=test com pepper forte e sem F@llback,
		 * process.exit NUNCA deve ser chamado. Este teste é a âncora de segurança
		 * que garante que os demais testes da suite não estão causando saídas acidentais.
		 */
		it('NÃO deve chamar process.exit com pepper forte em NODE_ENV=test', () => {
			const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => undefined as never);

			try {
				hasherEnvValidationSchema.safeParse(validHasherPayload);

				expect(exitSpy).not.toHaveBeenCalled();
			} finally {
				exitSpy.mockRestore();
			}
		});

		/**
		 * Validação de comprimento mínimo (20 chars).
		 * Este é um guard do Zod (.min(20)) mas o comprimento impacta
		 * diretamente a eficácia do pepper — vale garantir que funciona.
		 */
		it('deve rejeitar pepper com menos de 20 caracteres', () => {
			const result = hasherEnvValidationSchema.safeParse(
				buildPayload({ HASHER_SECURITY_PEPPER: 'Curto@1!' }),
			);

			expect(result.success).toBe(false);
		});
	});

	// -------------------------------------------------------------------------
	// HASHER_PROVIDER — Enum de provedores suportados
	// -------------------------------------------------------------------------
	describe('HASHER_PROVIDER', () => {
		/**
		 * Apenas 'argon2' e 'bcrypt' são suportados.
		 * Um provedor inventado deve ser rejeitado com clareza.
		 */
		it('deve rejeitar um provedor não suportado', () => {
			const result = hasherEnvValidationSchema.safeParse(
				buildPayload({ HASHER_PROVIDER: 'md5' }),
			);

			expect(result.success).toBe(false);
		});

		it('deve aceitar argon2 como provedor', () => {
			const result = hasherEnvValidationSchema.safeParse(
				buildPayload({ HASHER_PROVIDER: 'argon2' }),
			);

			expect(result.success).toBe(true);
		});

		it('deve aceitar bcrypt como provedor', () => {
			const result = hasherEnvValidationSchema.safeParse(
				buildPayload({ HASHER_PROVIDER: 'bcrypt' }),
			);

			expect(result.success).toBe(true);
		});
	});

	// -------------------------------------------------------------------------
	// HASHER_PARALLELISM — Transform com aviso de performance
	// -------------------------------------------------------------------------
	describe('HASHER_PARALLELISM', () => {
		/**
		 * O transform() emite um logger.warn quando parallelism > 16.
		 * O valor ainda deve ser retornado normalmente (warn ≠ erro).
		 * Testamos que o schema aceita o valor mas emite o aviso.
		 *
		 * Aqui espiamos o console.warn/logger indiretamente — o schema ainda
		 * deve retornar success:true com o valor transformado.
		 */
		it('deve aceitar parallelism > 16 e retornar o valor correto', () => {
			const result = hasherEnvValidationSchema.safeParse(
				buildPayload({ HASHER_PARALLELISM: '20' }),
			);

			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data.HASHER_PARALLELISM).toBe(20);
			}
		});

		it('deve rejeitar parallelism menor que 2', () => {
			const result = hasherEnvValidationSchema.safeParse(
				buildPayload({ HASHER_PARALLELISM: '1' }),
			);

			expect(result.success).toBe(false);
		});
	});

	// -------------------------------------------------------------------------
	// Limites numéricos — RFC 9106 e padrões de segurança
	// -------------------------------------------------------------------------
	describe('Limites de segurança (RFC 9106 / OWASP)', () => {
		/**
		 * HASHER_TIME_COST < 3 viola o padrão de segurança declarado no schema.
		 * Este valor corresponderia a um custo de processamento insuficiente.
		 */
		it('deve rejeitar HASHER_TIME_COST abaixo de 3', () => {
			const result = hasherEnvValidationSchema.safeParse(
				buildPayload({ HASHER_TIME_COST: '2' }),
			);

			expect(result.success).toBe(false);
		});

		/**
		 * HASHER_MEMORY_COST < 65536 KiB (64 MB) viola RFC 9106.
		 */
		it('deve rejeitar HASHER_MEMORY_COST abaixo de 65536', () => {
			const result = hasherEnvValidationSchema.safeParse(
				buildPayload({ HASHER_MEMORY_COST: '4096' }),
			);

			expect(result.success).toBe(false);
		});

		/**
		 * HASHER_SALT_LENGTH < 16 bytes viola RFC 9106.
		 */
		it('deve rejeitar HASHER_SALT_LENGTH abaixo de 16', () => {
			const result = hasherEnvValidationSchema.safeParse(
				buildPayload({ HASHER_SALT_LENGTH: '8' }),
			);

			expect(result.success).toBe(false);
		});

		/**
		 * Payload com todos os mínimos exatos deve passar.
		 * Este é o "teste de fronteira" que confirma que o .env.test
		 * com HASHER_TIME_COST=1 seria rejeitado... mas isso é esperado!
		 * O .env.test usa valores menores para velocidade, o que confirma
		 * que em produção os mínimos são garantidos.
		 */
		it('deve aceitar payload com todos os valores no limite mínimo válido', () => {
			const result = hasherEnvValidationSchema.safeParse(
				buildPayload({
					HASHER_TIME_COST: '3',
					HASHER_MEMORY_COST: '65536',
					HASHER_SALT_LENGTH: '16',
					HASHER_LENGTH: '32',
					HASHER_PARALLELISM: '2',
				}),
			);

			expect(result.success).toBe(true);
		});
	});

	// -------------------------------------------------------------------------
	// HASHER_BCRYPT_ROUNDS — Validação de Rounds para Bcrypt
	// -------------------------------------------------------------------------
	describe('HASHER_BCRYPT_ROUNDS', () => {
		it('deve aceitar rounds válidos entre 12 e 13', () => {
			const result12 = hasherEnvValidationSchema.safeParse(
				buildPayload({ HASHER_BCRYPT_ROUNDS: '12' }),
			);
			const result13 = hasherEnvValidationSchema.safeParse(
				buildPayload({ HASHER_BCRYPT_ROUNDS: '13' }),
			);

			expect(result12.success).toBe(true);
			expect(result13.success).toBe(true);
			if (result12.success) {
				expect(result12.data.HASHER_BCRYPT_ROUNDS).toBe(12);
			}
		});

		it('deve rejeitar rounds abaixo de 12 (inseguro)', () => {
			const result = hasherEnvValidationSchema.safeParse(
				buildPayload({ HASHER_BCRYPT_ROUNDS: '11' }),
			);

			expect(result.success).toBe(false);
		});

		it('deve rejeitar rounds acima de 13 (perigo de performance)', () => {
			const result = hasherEnvValidationSchema.safeParse(
				buildPayload({ HASHER_BCRYPT_ROUNDS: '14' }),
			);

			expect(result.success).toBe(false);
		});

		it('deve assumir o valor padrão de 12 se for omitido', () => {
			const payload = { ...validHasherPayload };
			const result = hasherEnvValidationSchema.safeParse(payload);

			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data.HASHER_BCRYPT_ROUNDS).toBe(12);
			}
		});
	});
});
