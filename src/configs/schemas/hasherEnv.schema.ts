import z from 'zod';
import { supportedHashProviders, envLogger } from '../constants/env.constants.js';
import { passwordStrength } from '@Validations/Password.validations.js';

export const hasherEnvValidationSchema = z.object({
	HASHER_PROVIDER: z
		.enum(supportedHashProviders, {
			error: `Provedor de hash inválido. Escolha entre: ${supportedHashProviders.join(', ')}`,
		})
		.default('argon2'),
	HASHER_SECURITY_PEPPER: z
		.string()
		.trim()
		.min(20, 'O pepper deve ter ao menos 20 carcteres')
		.default('development-secretPepper_SHA256-F@llback')
		.refine(
			(val) => {
				const testPepper = passwordStrength(val, {
					securityLevel: 'strong',
					personalize: false,
				});
				const isProd = process.env.NODE_ENV === 'production';
				const isFallback = val.includes('F@llback');

				if ((!testPepper || isFallback) && isProd) {
					envLogger.fatal(
						{ currentValue: isFallback ? 'VALOR_PADRAO_DETECTADO' : 'VALOR_INSEGURO' },
						'O HasherPepper não corresponde ao padrão de segurança admitido na aplicação, sugerimos criar um SHA-256',
					);
					process.exit(1);
				}

				return testPepper;
			},
			{
				error: 'O PEPPER de segurança é fraco demais ou está usando o valor padrão de desenvolvimento.',
			},
		),
	HASHER_LENGTH: z.coerce
		.number()
		.int()
		.min(32, {
			error: 'O tamnho do hash para ser realmente seguro deve ser de no mínimo 32 bits',
		})
		.default(32),
	HASHER_SALT_LENGTH: z.coerce
		.number()
		.int()
		.min(16, {
			error: 'O salt_length do hasher deve ter no mínimo 16 bytes de acordo com o padrão RFC 9106',
		})
		.default(16),
	//defina sempre o dobro de cores disponíveis no servidor
	HASHER_PARALLELISM: z.coerce
		.number()
		.int()
		.min(2, 'O Paralelismo deve ser de ao menos 2 trheads')
		.transform((val) => {
			if (val > 16)
				envLogger.warn(
					`HASHER_PARALLELISM alto! ${String(val)} trheads alocadas, verifique o desempenho da aplicação!`,
				);
			return val;
		})
		.default(4),
	HASHER_TIME_COST: z.coerce
		.number()
		.int()
		.min(3, { error: 'Para o padrão de segurança o time cost deve no mínimo ser 3' })
		.default(3),
	HASHER_MEMORY_COST: z.coerce
		.number()
		.int()
		.min(65536, 'O custo de processamento deve ser de no mínimo 64MB (ou seja 65536KiB)')
		.default(65536),
});
