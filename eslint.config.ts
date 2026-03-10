import js from "@eslint/js";
import globals from "globals";
import tseslint from "typescript-eslint";
import json from "@eslint/json";
import markdown from "@eslint/markdown";
import { defineConfig } from "eslint/config";
import eslintConfigPrettier from 'eslint-config-prettier';
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

const _dirname = dirname(fileURLToPath(import.meta.url));

export default defineConfig([
	// Objeto dedicado a relaização de exludes, para o eslint saber o que, ou o que não deve ser analizado,
	// mesmo o linter já sendo ineligente algns diretórios serão explicitamente definidos para deixar a config mais sintática
	{
		ignores: ['dist/**', 'node_modules/**', 'logs/**', 'package*.json']
	},

	{ files: ["**/*.{js,mjs,cjs,ts,mts,cts}"], plugins: { js }, extends: ["js/recommended"], languageOptions: { globals: globals.node } },

	// refinamentos para ts
	tseslint.configs.recommended,
	...tseslint.configs.strictTypeChecked,

	{
		files: ['**/*.ts'],
		languageOptions: {
			parserOptions: {
				projectService: true,
				tsconfigRootDir: _dirname
			},
		},
		rules: {
			// ==========================================
			// 🛡️ REGRAS DE ARQUITETURA (Protegendo o DDD)
			// ==========================================

			// Permite Classes com apenas métodos estáticos (Padrão Factory Mappers e Utils)
			"@typescript-eslint/no-extraneous-class": "off",

			// Permite usar instâncias/construtores vazios (Comum em BaseEntities e DTOs)
			"@typescript-eslint/no-empty-function": "off",

			// Não te obriga a usar o "this" dentro de um método de classe
			"class-methods-use-this": "off",

			// Permite declarar variáveis reservadas (como no Express: _req, _res) usando underline
			"@typescript-eslint/no-unused-vars": [
				"error",
				{ "argsIgnorePattern": "^_", "varsIgnorePattern": "^_" }
			],

			// ==========================================
			// 🔒 REGRAS DE SEGURANÇA E TIPAGEM (Rigor Máximo)
			// ==========================================

			// PROÍBE O USO DE 'ANY'. Se você realmente precisar desabilitar, use o comentário:
			// // eslint-disable-next-line @typescript-eslint/no-explicit-any
			"@typescript-eslint/no-explicit-any": "error",

			// OBRIGA VOCÊ A DECLARAR O RETORNO DE TODAS AS FUNÇÕES (Evita inferência mágica perigosa em APIs)
			"@typescript-eslint/explicit-function-return-type": "error",
			"@typescript-eslint/explicit-module-boundary-types": "error",

			// PROÍBE IGNORAR PROMISES. Se bater no banco de dados, tem que usar await ou .catch()
			"@typescript-eslint/no-floating-promises": "error",

			// IMPEDE CONVERSÕES BIZARRAS EM STRINGS (ex: somar um objeto {} com uma string)
			"@typescript-eslint/restrict-template-expressions": "error",

		}
	},




	// Fomratadores para json
	{ files: ["**/*.json"], plugins: { json }, language: "json/json", extends: ["json/recommended"] },

	//adicinando regra para permitir pattern da comunidade com tsconfi.json porém permitindo comentários sem que o eslint lançe um erro
	{
		files: ["**/tsconfig.json", "**/tsconfig.*.json"],
		plugins: { json },
		language: "json/jsonc",
		extends: ["json/recommended"]
	},

	{ files: ["**/*.jsonc"], plugins: { json }, language: "json/jsonc", extends: ["json/recommended"] },
	{ files: ["**/*.json5"], plugins: { json }, language: "json/json5", extends: ["json/recommended"] },

	...markdown.configs.recommended,
	// Este caso só deverá ser ativo após a compreensão completa de módulo para isso estou deixando comentado, idei exeprimentar a formatação markdow por momento enquanto está assim entõ poderemos refinar conforme o necessário
	//{ files: ["**/*.md"], plugins: {}, language: "markdown/gfm", extends: ["markdown/recommended"] },


	// è de extrema importância que esta configuração do prettier continue ficando apenas no fim
	eslintConfigPrettier
]);
