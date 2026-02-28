import z from "zod";
import 'dotenv/config';
import { passwordStrength } from "@/validations/Password.validations.js";

// conforme o boilerplate fofr crescendo adicionarei mais bancos
const enabledDatabaseConections = ['mongodb'];

const envSchema = z.object({
    NODE_ENV: z.enum(['development', 'stage', 'production']).default('development'),
    PORT: z.coerce.number().default(3000),
    APP_NAME: z.string({ error: 'lembre-se de adicionar um nome ao app' }).min(3).max(50),
    // database info
    DATABASE_TYPE: z.enum(enabledDatabaseConections, { error: `Ops aparentemente o db desejado ainda não está disponível, utilize algum destes ${enabledDatabaseConections}` }),
    DATABASE_HOST: z.string().default('localhost'),
    DATABASE_PORT: z.coerce.number(),
    DATABASE_NAME: z.string(),
    DATABASE_USERNAME: z.string().optional(),
    DATABASE_PASSWORD: z.string().min(10).max(100).refine((value) => {
        return passwordStrength(value)
    }, { error: 'A senha do banco não atende os requisitos de segurança' }).optional(),

    // Contatos de administradores
    EMAIL_TO_CONTACT: z.email()
})


const _env = envSchema.safeParse(process.env);

if (!_env.success) {
    const { fieldErrors } = _env.error.flatten();
    console.error('‼️ ‼️ Erro grave na configuração de ambiente ‼️ ‼️');
    console.table(fieldErrors);

    throw new Error('Varivais de ambiente inválidas, edite o .env tente iniciar a api novamente!');
}

export const env = _env.data;
