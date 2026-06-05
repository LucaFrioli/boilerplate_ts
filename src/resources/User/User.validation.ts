import { z } from 'zod';
import type { UserI } from './User.interface.js';
import { CpfValidator } from '@Validations/Cpf.validations.js';
import {
	type DatabaseID,
	type AppID,
	type HashedString,
	type ValidCPF,
	type ValidEmail,
	type ValidUsernamePii,
	isDatabaseID,
	isAppID,
	isHashedString,
	isValidCPF,
	isValidEmail,
	isValidUsernamePii,
} from '@Types';
import { env } from '@Configs/env.js';

/**
 * Validador de Nomes de Usuários Públicos.
 * Exige caixa baixa e caracteres seguros em URL/Regex (Regras de Segurança Básicas).
 */
export const usernameValidationSchema = z.custom<ValidUsernamePii>((val) => {
	if (typeof val !== 'string') return false;
	return isValidUsernamePii(val.trim());
});

/**
 * Validador de Identificadores internos ao banco de dados
 * Usa os safeTypesGuards já inferidos diretamente nos tipos
 */
const dbIdSchema = z.custom<DatabaseID>((val) => {
	if (typeof val !== 'string') {
		return false;
	}
	val = val.trim();
	return isDatabaseID(val);
});

/**
 * Validador de Identificadores publicos ao banco de dados
 * Usa os safeTypesGuards já inferidos diretamente nos tipos
 */
const dbPublicIdSchema = z.custom<AppID>((val) => {
	if (typeof val !== 'string') return false;
	val = val.trim();
	return isAppID(val);
});

const passwordHashSchema = z.custom<HashedString>((val) => {
	if (typeof val !== 'string') return false;
	val = val.trim();
	return isHashedString(val, env.HASHER_PROVIDER);
});

/**
 * Validador Estrutural de Email.
 * Usa validação RFC oficial do Zod + validação sistêmica.
 */
export const emailValidationSchema = z.custom<ValidEmail>((val) => {
	if (typeof val !== 'string') return false;
	val = val.trim();
	return isValidEmail(val);
});

/**
 * Validador de Cadastro de Pessoas Físicas (Brasil).
 * Chama o Validador customizado CpfValidator que atesta o dígito verificador matemático, não apenas a estrutura da string.
 */
export const cpfValidationSchema = z.custom<ValidCPF>((val) => {
	if (typeof val !== 'string') {
		return false;
	}

	val = CpfValidator.cleaningCpf(val);
	return isValidCPF(val);
});

/**
 * Schema Root da Entidade User.
 * Usado exclusivamente pelo Construtor (Constructor) da Entidade Base para garantir
 * que a Injeção/Hidratação do Banco de Dados não crie instâncias corrompidas na memória.
 */
const baseUserSchema: z.ZodType<UserI> = z.object({
	id: dbIdSchema,
	publicId: dbPublicIdSchema,
	active: z.boolean(),
	username: usernameValidationSchema,
	email: emailValidationSchema,
	passwordHash: passwordHashSchema,
	cpf: cpfValidationSchema,

	profileId: dbIdSchema,
	stripeId: z.string().trim().nullable().default(null),
	walletId: z.string().trim().nullable().default(null),
	createdAt: z.iso.datetime().transform((val) => new Date(val)),
	updatedAt: z.iso
		.datetime()
		.transform((val) => new Date(val))
		.nullable()
		.default(null),
	deletedAt: z.iso
		.datetime()
		.transform((val) => new Date(val))
		.nullable()
		.default(null),
});

export default baseUserSchema;
