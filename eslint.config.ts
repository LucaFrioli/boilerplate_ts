import js from "@eslint/js";
import globals from "globals";
import tseslint from "typescript-eslint";
import json from "@eslint/json";
import markdown from "@eslint/markdown";
import { defineConfig } from "eslint/config";
import eslintConfigPrettier from 'eslint-config-prettier'

export default defineConfig([
	// Objeto dedicado a relaização de exludes, para o eslint saber o que, ou o que não deve ser analizado,
	// mesmo o linter já sendo ineligente algns diretórios serão explicitamente definidos para deixar a config mais sintática
	{
		ignores:['dist/**', 'node_modules/**', 'logs/**']
	},
	
	{ files: ["**/*.{js,mjs,cjs,ts,mts,cts}"], plugins: { js }, extends: ["js/recommended"], languageOptions: { globals: globals.node } },
	tseslint.configs.recommended,

	// Fomratadores para json
	{ files: ["**/*.json"], plugins: { json }, language: "json/json", extends: ["json/recommended"] },
	{ files: ["**/*.jsonc"], plugins: { json }, language: "json/jsonc", extends: ["json/recommended"] },
	{ files: ["**/*.json5"], plugins: { json }, language: "json/json5", extends: ["json/recommended"] },

	...markdown.configs.recommended,
	// Este caso só deverá ser ativo após a compreensão completa de módulo para isso estou deixando comentado, idei exeprimentar a formatação markdow por momento enquanto está assim entõ poderemos refinar conforme o necessário
	//{ files: ["**/*.md"], plugins: {}, language: "markdown/gfm", extends: ["markdown/recommended"] },


	// è de extrema importância que esta configuração do prettier continue ficando apenas no fim
	eslintConfigPrettier
]);
