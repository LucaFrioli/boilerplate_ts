import { z } from 'zod';
import type { UserI } from './User.interface.js';
import { DBid, Id } from '@Id/IdentityFactory.identity.js';
import { CpfValidator } from '@Validations/Cpf.validations.js';
import DateManager from '@Utils/dateManager.util.js';
import { Hasher } from '@Hash/hashesFactory.auth.js';
import type { DatabaseID, AppID, HashedString } from '@Types';

export const usernameValidationSchema = z
	.string()
	.trim()
	.lowercase({ error: 'Utilize apenas letras minúsculas' })
	.min(3, { error: `Usuário deve ter no mínimo 3 caracteres` })
	.max(30, { error: 'Usuário não pode execeder 30 caracteres' })
	.refine((val) => /^[a-z0-9_.-]+$/.test(val), {
		error: ' Nomes de usuários podem conter apenas letras, números, e _ - .',
	});

const baseUserSchema: z.ZodType<UserI> = z.object({
	id: z
		.string()
		.trim()
		.refine((val) => DBid.validate(val), {
			error: 'Id interno Inválido',
		}) as unknown as z.ZodType<DatabaseID>,
	publicId: z
		.string()
		.trim()
		.refine((val) => Id.validate(val), { error: 'Id Inválido' }) as unknown as z.ZodType<AppID>,
	active: z.boolean(),
	username: usernameValidationSchema,
	email: z.email(),
	passwordHash: z
		.string()
		.trim()
		.refine((val) => Hasher.validateHash(val)) as unknown as z.ZodType<HashedString>,
	cpf: z
		.string()
		.trim()
		.transform((val) => CpfValidator.validateAndSanitize(val)),

	profileId: z
		.string()
		.trim()
		.refine((val) => DBid.validate(val), {
			error: 'O  id de perfil de usuário deve ser válido',
		}) as unknown as z.ZodType<DatabaseID>,
	stripeId: z.string().trim().nullable().default(null),
	walletId: z.string().trim().nullable().default(null),
	createdAt: z.date().transform((val) => new Date(DateManager.toIsoString(val))),
	updatedAt: z
		.date()
		.transform((val) => new Date(DateManager.toIsoString(val)))
		.nullable()
		.default(null),
	deletedAt: z
		.date()
		.transform((val) => new Date(DateManager.toIsoString(val)))
		.nullable()
		.default(null),
});

export default baseUserSchema;
