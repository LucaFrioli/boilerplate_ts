import { z } from 'zod';
import type { UserI } from './User.interface.js';
import { CpfValidator } from '@Validations/Cpf.validations.js';
import {
	type DatabaseID,
	type AppID,
	type HashedString,
	isDatabaseID,
	isAppID,
	isHashedString,
} from '@Types';

export const usernameValidationSchema = z
	.string()
	.trim()
	.lowercase({ error: 'Utilize apenas letras minúsculas' })
	.min(3, { error: `Usuário deve ter no mínimo 3 caracteres` })
	.max(30, { error: 'Usuário não pode execeder 30 caracteres' })
	.refine((val) => /^[a-z0-9_.-]+$/.test(val), {
		error: ' Nomes de usuários podem conter apenas letras, números, e _ - .',
	});

const dbIdSchema = z.custom<DatabaseID>((val) => {
	if (typeof val !== 'string') {
		return false;
	}
	val = val.trim();
	return isDatabaseID(val);
});

export const emailValidationSchema = z.email();

export const cpfValidationSchema = z
	.string()
	.trim()
	.transform((val) => CpfValidator.validateAndSanitize(val));

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
