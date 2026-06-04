import z from 'zod';
import { identityTypeSupported } from '@Configs/Constants';

export const idEnvValidationsSchema = z.object({
	IDENTIFIER_PATTERN: z
		.enum(identityTypeSupported, {
			error: `Defina um tipode identificador suportado entre estes ${identityTypeSupported.join(', ')}`,
		})
		.default('nanoid'),
	IDENTIFIER_NANOID_ALPHABET: z
		.string()
		.trim()
		.min(32, { error: 'alfabetos menores de 32 são inseguros' })
		.max(64, { error: 'alfabetos com mais de 64 caracteres fogem do URL-safe' })
		.refine(
			(val) => {
				return new Set(val).size === val.length;
			},
			{ error: 'O alfabeto não pode conter caracteres iguas, duplicatas reduzem a entropia' },
		)
		.refine((val) => /^[A-Za-z0-9\-_]+$/.test(val), {
			error: 'O alfabeto deve conter apenas caracteres URL safe',
		})
		.default('ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_'),
	IDENTIFIER_NANOID_SIZE: z.coerce
		.number()
		.int()
		.min(16, { error: 'Mínimo 16 chars para entropia adequada' })
		.max(32, {
			error: 'Acima de 32 chars o ganho entrópico é desnecessário para IDs de aplicação',
		})
		.default(21),
});
