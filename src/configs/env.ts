import z from "zod";
import 'dotenv/config';
import { passwordStrength } from "@Validations/Password.validations.js";
import { createChildLogger } from "./logger.js";

// conforme o boilerplate for crescendo adicionarei mais bancos
const enabledDatabaseConections = ['mongodb'] as const;
const envLogger = createChildLogger({ fileType: "core", module: 'env', service: 'valuation' });
export const supportedHashProviders = ['argon2', 'bcrypt'] as const;

const envSchema = z.object({
    NODE_ENV: z.enum(['development', 'stage', 'production']).default('development'),
    PORT: z.coerce.number().int({ error: 'A porta da aplicação deve ser um número inteiro' }).default(3000),
    APP_NAME: z.string({ error: 'lembre-se de adicionar um nome ao app' }).min(3).max(50),
    // database info
    DATABASE_TYPE: z.enum(enabledDatabaseConections, { error: `Ops aparentemente o db desejado ainda não está disponível, utilize algum destes ${enabledDatabaseConections.join(', ')}` }),
    DATABASE_HOST: z.string().default('localhost'),
    DATABASE_PORT: z.coerce.number().int({ error: 'A porta de um banco de dados deve ser um número inteiro' }),
    DATABASE_NAME: z.string(),
    DATABASE_USERNAME: z.string().optional(),
    DATABASE_PASSWORD: z.string().min(10).max(100).refine((value) => {
        return passwordStrength(value)
    }, { error: 'A senha do banco não atende os requisitos de segurança' }).optional(),

    // Contatos de administradores
    EMAIL_TO_CONTACT: z.email(),

    //hasher configs
    HASHER_PROVIDER: z.enum(supportedHashProviders, {
        error: `Provedor de hash inválido. Escolha entre: ${supportedHashProviders.join(', ')}`
    }).default('argon2'),
    HASHER_SECURITY_PEPPER: z.string().min(20, 'O pepper deve ter ao menos 20 carcteres').default('development-secretPepper_SHA256-F@llback').refine((val) => {
        const testPepper = passwordStrength(val, { securityLevel: "strong", personalize: false })
        const isProd = process.env.NODE_ENV === 'production';
        const isFallback = val.includes('F@llback');

        if ((!testPepper || isFallback) && isProd) {
            envLogger.fatal({ currentValue: isFallback ? 'VALOR_PADRAO_DETECTADO' : 'VALOR_INSEGURO' }, 'O HasherPepper não corresponde ao padrão de segurança admitido na aplicação, sugerimos criar um SHA-256');
            process.exit(1);
        }

        return testPepper
    }, { error: 'O PEPPER de segurança é fraco demais ou está usando o valor padrão de desenvolvimento.' }),
    HASHER_LENGTH: z.coerce.number().int().min(32, { error: 'O tamnho do hash para ser realmente seguro deve ser de no mínimo 32 bits' }).default(32),
    HASHER_SALT_LENGTH: z.coerce.number().int().min(16, { error: 'O salt_length do hasher deve ter no mínimo 16 bytes de acordo com o padrão RFC 9106' }).default(16),
    //defina sempre o dobro de cores disponíveis no servidor
    HASHER_PARALLELISM: z.coerce.number().int().min(2, 'O Paralelismo deve ser de ao menos 2 trheads').transform((val) => {
        if (val > 16) envLogger.warn(`HASHER_PARALLELISM alto! ${val} trheads alocadas, verifique o desempenho da aplicação!`);
        return val
    }).default(4),
    HASHER_TIME_COST: z.coerce.number().int().min(3, { error: 'Para o padrão de segurança o time cost deve no mínimo ser 3' }).default(3),
    HASHER_MEMORY_COST: z.coerce.number().int().min(65536, 'O custo de processamento deve ser de no mínimo 64MB (ou seja 65536KiB)').default(65536)
})


const _env = envSchema.safeParse(process.env);

if (!_env.success) {
    const { fieldErrors } = _env.error.flatten();
    console.error('‼️ ‼️ Erro grave na configuração de ambiente ‼️ ‼️');
    console.table(fieldErrors);

    throw new Error('Varivais de ambiente inválidas, edite o .env tente iniciar a api novamente!');
}

export const env = _env.data;
