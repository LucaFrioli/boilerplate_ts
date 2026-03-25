/**
 * @fileoverview Setup de Ambiente de Testes — Carregador do `.env.test`
 *
 * ## O que é um setupFile no Vitest?
 * O Vitest executa os arquivos listados em `test.setupFiles` (no vitest.config.ts)
 * ANTES de rodar qualquer arquivo de teste (`*.test.ts`), uma única vez por processo.
 * É o lugar correto para inicializações globais que todos os testes precisam.
 *
 * ## Por que não simplesmente usar o `env: {}` do vitest.config.ts?
 * A opção `env: {}` no vitest.config.ts injeta chaves **uma a uma** — seria necessário
 * listar cada variável manualmente. O `dotenv` lê o arquivo `.env.test` inteiro,
 * respeitando exatamente a mesma estrutura que o `src/configs/env.ts` já espera.
 * Isso garante que o ambiente de testes e o de desenvolvimento sejam gerenciados
 * da mesma forma.
 *
 * ## Ordem de prioridade (override: true)
 * A flag `override: true` no `dotenv.config()` garante que as variáveis do `.env.test`
 * sobrescrevam qualquer variável já presente em `process.env`.
 * Isso é importante em ambientes de CI/CD onde variáveis de sistema já podem estar
 * definidas — o `.env.test` tem a palavra final dentro do contexto de testes.
 *
 * ## Segurança
 * O `.env.test` é carregado apenas dentro do processo do Vitest, nunca em produção.
 * O arquivo está no `.gitignore` (coberto por `.env.*`) e portanto não é exposto.
 *
 * @see {@link vitest.config.ts} — onde este arquivo é registrado em `test.setupFiles`
 * @see {@link .env.test.example} — template público com documentação detalhada dos valores
 */
import { config } from 'dotenv';
import { resolve } from 'node:path';

/**
 * Caminho absoluto para o arquivo `.env.test` na raiz do projeto.
 * `process.cwd()` retorna sempre a raiz do projeto quando o Vitest é executado
 * via `npm test` — a mesma raiz onde `package.json` está localizado.
 */
const testEnvPath = resolve(process.cwd(), '.env.test');

/**
 * Carrega as variáveis de ambiente de teste no `process.env`.
 *
 * `override: true` garante que as variáveis do `.env.test` tenham prioridade
 * sobre qualquer variável já definida no processo (ex: variáveis de sistema do CI).
 *
 * Se o arquivo `.env.test` não existir, o dotenv retorna `{ parsed: undefined }`
 * sem lançar erro — a aplicação pode ainda iniciar, mas provavelmente falhará
 * na validação do schema Zod em `src/configs/env.ts`.
 */
const result = config({ path: testEnvPath, override: true });

if (result.error) {
	/**
	 * Erro aqui geralmente significa que o arquivo `.env.test` não existe.
	 * A instrução é clara: copie o `.env.test.example` para `.env.test`.
	 * Lançamos erro explícito para evitar que os testes rodem com variáveis
	 * de desenvolvimento sem que o desenvolvedor perceba.
	 */
	throw new Error(
		`[Vitest Setup] Falha ao carregar o .env.test.\n` +
			`Arquivo esperado em: ${testEnvPath}\n` +
			`Solução: execute 'cp .env.test.example .env.test' na raiz do projeto.\n` +
			`Detalhe do erro: ${result.error.message}`,
	);
}
