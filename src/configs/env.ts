/**
 * @module EnvironmentConfiguration
 * @description Carregador e validador de configurações de ambiente fortemente tipado para a aplicação.
 *
 * ## Filosofia de Design:
 * 1. **Fail-Fast (Falha Rápida no Boot):** Impede o boot da API imediatamente (`process.exit(1)`) se qualquer
 *    variável de ambiente obrigatória estiver ausente ou violar o esquema estrutural/semântico definido.
 * 2. **Esquemas de Domínio Modulares:** Centraliza e compõe schemas especializados em subpastas de configurações:
 *    - `dbEnvValidationSchema`: Configurações de conexões de banco SQL/NoSQL primário.
 *    - `memEnvValidationSchema`: Credenciais e parâmetros de bancos em memória (Valkey/Redis).
 *    - `hasherEnvValidationSchema`: Parâmetros do gerador de hash (Bcrypt rounds, pepper).
 *    - `idEnvValidationsSchema`: Estratégia de identificadores globais (UUIDv7, NanoID).
 *    - `criptographyEnvValidationSchema`: Regras para chaves derivadas e hashing determinístico (HMAC, HKDF).
 * 3. **Erros Legíveis em Console (Visual Shield):** Converte a pilha de validação complexa do Zod em uma árvore hierárquica
 *    simplificada através do helper `z.treeifyError`, imprimindo saídas coloridas no console para diagnóstico imediato no terminal.
 * 4. **Tipagem Estática Transparente:** O objeto exportado `env` carrega em tempo de design a tipagem exata inferida
 *    do `envSchema`, eliminando a necessidade de casts manuais ou o risco de acessar variáveis indefinidas em runtime.
 */

import z from 'zod';
import 'dotenv/config';
import { dbEnvValidationSchema } from './schemas/dbEnv.schema.js';
import { idEnvValidationsSchema } from './schemas/idEnv.schema.js';
import { hasherEnvValidationSchema } from './schemas/hasherEnv.schema.js';
import { memEnvValidationSchema } from './schemas/memDbEnv.schema.js';
import { criptographyEnvValidationSchema } from './schemas/criptography.schema.js';
import {
	nodeEnvSupported,
	timezoneSupported,
	localeSupported,
	envLogger,
} from '@Configs/Constants';

/**
 * Esquema unificado Zod contendo a composição de todas as variáveis de ambiente necessárias para a aplicação.
 *
 * Combina configurações básicas (ambiente, servidor, localização, contato) com os subesquemas
 * modulares de infraestrutura e criptografia via desestruturação (`.shape`).
 *
 * @type {z.ZodObject<any>}
 * @private
 */
const envSchema = z.object({
	/**
	 * Ambiente de execução ativo no runtime.
	 * Restrito aos valores especificados na constante `nodeEnvSupported` (ex: `'development'`, `'production'`).
	 */
	NODE_ENV: z.enum(nodeEnvSupported).default('development'),

	/**
	 * Porta TCP de escuta do servidor HTTP da aplicação.
	 * Convertida (coerção) de string para número inteiro em tempo de validação.
	 */
	PORT: z.coerce
		.number()
		.int({ error: 'A porta da aplicação deve ser um número inteiro' })
		.default(3000),

	/**
	 * Nome descritivo da aplicação, utilizado para identificação em logs de telemetria e cabeçalhos.
	 */
	APP_NAME: z.string({ error: 'lembre-se de adicionar um nome ao app' }).trim().min(3).max(50),

	/**
	 * Fuso horário operacional da aplicação.
	 * Restrito aos fusos homologados na constante `timezoneSupported` (ex: `'UTC'`, `'America/Sao_Paulo'`).
	 */
	APP_TIMEZONE: z.enum(timezoneSupported).default('UTC'),

	/**
	 * Idioma/Localização padrão para formatação de dados de apresentação.
	 * Restrito aos locais homologados na constante `localeSupported` (ex: `'pt-BR'`, `'en-US'`).
	 */
	APP_LOCALE: z.enum(localeSupported).default('pt-BR'),

	/**
	 * Endereço de e-mail do administrador principal da infraestrutura para contatos e alertas críticos.
	 */
	EMAIL_TO_CONTACT: z.email(),

	// Composição de validações de banco de dados
	...dbEnvValidationSchema.shape,

	// Composição de configurações de hash e rounds
	...hasherEnvValidationSchema.shape,

	// Composição de identificadores da aplicação
	...idEnvValidationsSchema.shape,

	// Composição de configuração do banco em memória
	...memEnvValidationSchema.shape,

	// Composição de parâmetros criptográficos gerais
	...criptographyEnvValidationSchema.shape,
});

/**
 * Resultado do parseamento e higienização segura das variáveis de ambiente (`process.env`).
 * O método `safeParse` impede o lançamento de exceções não capturadas no boot, permitindo o tratamento elegante de erros.
 *
 * @type {z.SafeParseReturnType<any, any>}
 * @private
 */
const _env = envSchema.safeParse(process.env);

if (!_env.success) {
	const fieldErrors = z.treeifyError(_env.error);
	console.error('‼️ ‼️ Erro grave na configuração de ambiente ‼️ ‼️');
	console.dir(fieldErrors, { depth: null, colors: true });

	envLogger.fatal(
		{ e: fieldErrors },
		'Erro fatal da aplicação, faça a correção para poder inicar a aplicação',
	);
	process.exit(1);
}

/**
 * Dicionário imutável e tipado contendo todas as variáveis de ambiente validadas do boilerplate.
 *
 * Deve ser importado em qualquer arquivo do sistema para obtenção segura de configurações em tempo de execução.
 *
 * @type {Readonly<z.infer<typeof envSchema>>}
 * @see {@link envSchema} Esquema Zod governante.
 */
export const env = _env.data;
