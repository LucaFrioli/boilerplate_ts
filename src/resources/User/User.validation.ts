import { z } from 'zod';
import type { UserI } from './User.interface.js';
import { CpfValidator } from '@Validations/Cpf.validations.js';
import {
	type DatabaseID,
	type AppID,
	type HashedString,
	type ValidCPF,
	isDatabaseID,
	isAppID,
	isHashedString,
	isValidCPF,
} from '@Types';

/**
 * Validador de Nomes de Usuários Públicos.
 * Exige caixa baixa e caracteres seguros em URL/Regex (Regras de Segurança Básicas).
 */
export const usernameValidationSchema = z
	.string()
	.trim()
	.lowercase({ error: 'Utilize apenas letras minúsculas' })
	.min(3, { error: `Usuário deve ter no mínimo 3 caracteres` })
	.max(30, { error: 'Usuário não pode execeder 30 caracteres' })
	.refine((val) => /^[a-z0-9_.-]+$/.test(val), {
		error: ' Nomes de usuários podem conter apenas letras, números, e _ - .',
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
 * Validador Estrutural de Email.
 * Usa validação RFC oficial do Zod.
 */
export const emailValidationSchema = z.email().nonempty();

/**
 * Validador de Cadastro de Pessoas Físicas (Brasil).
 * Chama o Validador customizado CpfValidator que atesta o dígito verificador matemático, não apenas a estrutura da string.
 */
export const cpfValidationSchema = z.custom<ValidCPF>((val) => {
	if (typeof val !== 'string') {
		return false;
	}

	val = CpfValidator.cleanigCpf(val);
	return isValidCPF(val);
});

/**
 * Schema Root da Entidade User.
 * Usado exclusivamente pelo Construtor (Constructor) da Entidade Base para garantir
 * que a Injeção/Hidratação do Banco de Dados não crie instâncias corrompidas na memória.
 */
const baseUserSchema: z.ZodType<UserI> = z.object({
	id: dbIdSchema,
	publicId: z.custom<AppID>((val) => {
		if (typeof val !== 'string') return false;
		val = val.trim();
		return isAppID(val);
	}),
	active: z.boolean(),
	username: usernameValidationSchema,
	email: emailValidationSchema,
	passwordHash: z.custom<HashedString>((val) => {
		if (typeof val !== 'string') return false;
		val = val.trim();
		return isHashedString(val);
	}),
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
