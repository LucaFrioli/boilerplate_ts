import { passwordStrength } from '@Validations/Password.validations.js';
import z from 'zod';
import { enabledDatabaseConections, identityTypeSupported } from '../constants/env.constants.js';

export const dbEnvValidationSchema = z.object({
	// database info
	DATABASE_TYPE: z.enum(enabledDatabaseConections, {
		error: `Ops aparentemente o db desejado ainda não está disponível, utilize algum destes ${enabledDatabaseConections.join(', ')}`,
	}),
	DATABASE_HOST: z.string().trim().default('localhost'),
	DATABASE_PORT: z.coerce
		.number()
		.int({ error: 'A porta de um banco de dados deve ser um número inteiro' }),
	DATABASE_NAME: z.string().trim(),
	DATABASE_USERNAME: z.string().trim().optional(),
	DATABASE_PASSWORD: z
		.string()
		.min(10)
		.max(100)
		.refine(
			(value) => {
				return passwordStrength(value);
			},
			{ error: 'A senha do banco não atende os requisitos de segurança' },
		)
		.optional(),
	DATABASE_ID_DEFAULT: z
		.enum(identityTypeSupported, {
			error: `Defina um padrão de id para os registros do banco contindos nesta lista ${identityTypeSupported.join(',')}`,
		})
		.default('uuidv7'),
});
