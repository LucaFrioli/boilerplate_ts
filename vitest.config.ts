/**
 * @fileoverview Configuração Central do Vitest — Motor de Testes do Boilerplate.
 *
 * ## Por que Vitest e não Jest?
 * O projeto usa `"type": "module"` no package.json e `"module": "nodenext"` no tsconfig.
 * Isso significa que todo o código roda como ES Modules nativos — o padrão moderno do Node.
 * Jest tem suporte experimental a ESM e exige Babel ou flags instáveis.
 * Vitest nasceu para ESM, entende o ecossistema Vite/Node moderno nativamente.
 *
 * ## O papel do `vite-tsconfig-paths`
 * O tsconfig.app.json define aliases como `@Types`, `@Configs`, `@Hash`, etc.
 * Sem este plugin, o Vitest não saberia resolver `import { env } from '@Configs/env.js'`
 * dentro dos arquivos de teste. O plugin lê o tsconfig automaticamente e mapeia os aliases.
 *
 * @see {@link https://vitest.dev/config/ Documentação oficial do Vitest Config}
 * @see {@link https://github.com/aleclarson/vite-tsconfig-paths vite-tsconfig-paths}
 */
import { defineConfig } from 'vitest/config';
import tsconfigPaths from 'vite-tsconfig-paths';
import { config as loadEnv } from 'dotenv';
import { resolve } from 'node:path';

/**
 * --------------- CARREGAMENTO ANTECIPADO DO .env.test ------------------
 *
 * O dotenv é executado AQUI, no nível do processo principal do Vitest
 * (antes de qualquer worker ser criado), para garantir que as variáveis
 * estejam disponíveis no processo pai. As variáveis críticas também são
 * declaradas no bloco `test.env` abaixo para garantir que cada worker
 * isolado as receba antes da avaliação dos módulos ESM.
 *
 * ## Arquitetura de dois níveis:
 * 1. `loadEnv()` aqui → popula o processo principal (vitest CLI)
 * 2. `test.env` em defineConfig → popula cada worker antes de qualquer import
 * 3. `setupFiles` → segunda linha de defesa para overrides em runtime
 */
loadEnv({ path: resolve(process.cwd(), '.env.test'), override: true });

export default defineConfig({
	/**
	 * Plugins do Vite que o Vitest herda.
	 * `tsconfigPaths()` lê automaticamente o tsconfig mais próximo (tsconfig.app.json via tsconfig.json)
	 * e resolve todos os path aliases declarados em `compilerOptions.paths`.
	 */
	plugins: [tsconfigPaths()],

	test: {
		/**
		 * `environment: 'node'` garante que os testes rodam no contexto do Node.js puro,
		 * sem simulação de DOM (jsdom/happy-dom). Correto para uma API REST.
		 */
		environment: 'node',

		/**
		 * `globals: false` — mantemos os imports explícitos (`import { describe, it, expect } from 'vitest'`).
		 * Isso é preferível em TypeScript pois o compilador sabe exatamente de onde cada símbolo vem,
		 * evitando falsos positivos de "variável não declarada" e mantendo o código autodocumentado, se
		 * alinhando às expectativas e filosofias que este boilerplte espera.
		 *
		 * ⚠️ Se você quiser a API global estilo Jest (sem imports), troque para `true`
		 *    e adicione `"types": ["vitest/globals"]` no tsconfig.test.json.
		 */
		globals: false,

		/**
		 * `passWithNoTests: true` — permite que o runner finalize com sucesso (exit 0)
		 * mesmo que um arquivo `.test.ts` exista mas não contenha nenhuma suite (`describe/it`).
		 *
		 * Isso é necessário porque os arquivos de placeholder
		 * existem para estruturar o projeto e documentar o que será testado,
		 * mas ainda não têm implementação de testes na sua fase embrionária, isso
		 * por conta de uma ideia de estruturar os testes dos módulos já existentes.
		 *
		 * Quando os testes da Fase 1 forem escritos, esta opção continua funcionando
		 * corretamente — suites existentes são validadas normalmente.
		 */
		passWithNoTests: true,

		/**
		 * Padrão de descoberta dos arquivos de teste.
		 * Todos os arquivos `.test.ts` dentro de `tests/` serão executados.
		 * A separação `tests/unit/` e `tests/integration/` é apenas organizacional —
		 * o runner executa todos por padrão.
		 *
		 * Para rodar apenas unitários: `vitest run tests/unit`
		 * Para rodar apenas integração: `vitest run tests/integration`
		 */
		include: ['tests/**/*.test.ts'],

		/**
		 * `env` — injeta variáveis diretamente no `process.env` de cada worker do Vitest
		 * ANTES de qualquer módulo ser avaliado (module evaluation).
		 *
		 * ## Por que é necessário além do setupFile?
		 * Workers do Vitest nascem com `process.env` isolado do processo principal.
		 * O setupFile (`loadTestEnv.ts`) roda depois que os módulos ESM do worker já foram
		 * importados e avaliados. Módulos como `identity.type.ts` importam `env.ts`
		 * no nível superior — e `env.ts` chama `process.exit(1)` se as variáveis
		 * estiverem ausentes ou inválidas.
		 *
		 * O `env` aqui é a garantia de que as variáveis críticas estarão disponíveis
		 * no momento exato em que os módulos ESM são avaliados pelos workers.
		 * O setupFile continua existindo para sobrescrever/complementar em runtime.
		 *
		 * ⚠️ Valores aqui devem ser strings — `process.env` é sempre `Record<string, string>`.
		 * ⚠️ NODE_ENV=test é injetado pelo Vitest automaticamente — está aqui por explicitez.
		 */
		env: {
			NODE_ENV: 'test',
			APP_NAME: 'Boilerplate_Test',
			APP_TIMEZONE: 'UTC',
			APP_LOCALE: 'pt-BR',
			PORT: '3000',
			EMAIL_TO_CONTACT: 'test-admin@boilerplate-test.local',
			DATABASE_TYPE: 'mongodb',
			DATABASE_HOST: 'localhost',
			DATABASE_PORT: '27017',
			DATABASE_NAME: 'boilerplate_test',
			DATABASE_PASSWORD: 'TestDb@Pass123!',
			DATABASE_ID_DEFAULT: 'uuidv7',
			HASHER_PROVIDER: 'argon2',
			HASHER_SECURITY_PEPPER: 'Test@Pepper123#Ficticio!456',
			HASHER_LENGTH: '32',
			HASHER_SALT_LENGTH: '16',
			HASHER_PARALLELISM: '2',
			HASHER_TIME_COST: '3',
			HASHER_MEMORY_COST: '65536',
			IDENTIFIER_PATTERN: 'nanoid',
			IDENTIFIER_NANOID_ALPHABET:
				'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_',
			IDENTIFIER_NANOID_SIZE: '21',
			CRIPTOGRAPHY_ENGINE_MODE: 'sync_node',
			CRIPTOGRAPHY_DERIVATION_KEY_ALGORITHM: 'hkdf',
			CRIPTOGRAPHY_DERIVATION_KEY_SALT: '32',
			CRIPTOGRAPHY_PASSWORDS_ALGORITHM: 'hmac',
			CRIPTOGRAPHY_PASSWORDS_DIGESTOR: 'sha256',
			CRIPTOGRAPHY_SIGNATURE_ALGORITHM: 'ed25519',
			CIPHER_ALGORITHM: 'aes-256-gcm',
			CRIPTOGRAPHY_SECURITY_PEPPER: '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef',
			CIPHER_MASTER_KEY: '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef',
		},

		/**
		 * Configuração de relatório de cobertura de código (Code Coverage).
		 * Requer o pacote `@vitest/coverage-v8` (já instalado).
		 *
		 * Provider `v8` usa o motor nativo do Node.js (V8) para instrumentação —
		 * mais rápido e sem transpilação extra comparado ao Istanbul/nyc.
		 */
		coverage: {
			/**
			 * `v8` — instrumentação via engine nativo do Node. Zero overhead de transpilação.
			 * Alternativa: `istanbul` (mais lento mas com melhor suporte a alguns edge cases,
			 * este requisito é levantado pois poderemos eventualmente trocar isto em um futuro
			 * próximo, devido a integração tardia de testes mmanteremos no padrão V8).
			 */
			provider: 'v8',

			/**
			 * Formatos de saída do relatório:
			 * - `text`  → tabela resumida no terminal após rodar `npm run test:coverage`
			 * - `json`  → arquivo `coverage/coverage-final.json` (útil para CI/CD e badges)
			 * - `html`  → pasta `coverage/` com interface visual linha a linha (abrir no browser)
			 */
			reporter: ['text', 'json', 'html'],

			/**
			 * Quais arquivos entram no cálculo de cobertura.
			 * Inclui todo o código-fonte em `src/`.
			 */
			include: ['src/**/*.ts', 'scripts/**/*.ts'],

			/**
			 * Arquivos excluídos da cobertura.
			 * - `server.ts` → apenas inicialização do processo, sem lógica testável
			 * - `app.ts`    → bootstrap do Express, testado via integração, não unitário
			 */
			exclude: ['src/server.ts', 'src/app.ts'],
		},

		/**
		 * setupFiles — Arquivos executados ANTES de qualquer arquivo de teste.
		 *
		 * O `loadTestEnv.ts` é responsável por carregar o `.env.test` via `dotenv`,
		 * injetando todas as variáveis de ambiente de teste em `process.env` antes
		 * que qualquer `import` de `src/configs/env.ts` aconteça.
		 *
		 * ## Por que setupFiles e não a opção `env: {}` daqui?
		 * A opção `env: {}` exigiria listar manualmente CADA variável de ambiente.
		 * O setupFile lê o `.env.test` inteiro de uma vez, do mesmo jeito que
		 * o `dotenv/config` já faz no código de produção — consistência total.
		 *
		 * ## Ordem de execução garantida pelo Vitest:
		 * 1. test.env é injetado em process.env de cada worker
		 * 2. setupFiles rodam (→ .env.test sobrescreve com override: true)
		 * 3. Cada arquivo .test.ts é importado (→ env.ts valida process.env via Zod)
		 * 4. Os testes dentro do arquivo são executados
		 *
		 * @see {@link tests/helpers/env/loadTestEnv.ts} — implementação e documentação completa
		 * @see {@link .env.test.example} — template com justificativas de cada valor
		 */
		setupFiles: ['./tests/helpers/env/loadTestEnv.ts'],
	},
});
