import { resolve } from 'path';
import pino from "pino";
import { env } from "./env.js";
import { DateFormatter } from "@/utils/Date_manager.js";

const rootDir = process.cwd();
const logFileName = `${DateFormatter.toFileSafe(new Date())}.log`
const logsFilesPath = resolve(rootDir, 'logs', logFileName);

const pinoConfigs = {
    level: env.NODE_ENV === "development" ? 'debug' : 'info',
    redact: {
        paths: ['password', 'DATABASE_PASSWORD', 'user.token', 'authorization'],
        placeholder: '******'
    },

    base: {
        env: env.NODE_ENV,
        app_name: env.APP_NAME
    },

    timestamp: pino.stdTimeFunctions.isoTime,
}

// Target para console/desenvolvimento
const consoleTarget: pino.TransportTargetOptions = {
    target: env.NODE_ENV === 'development' ? 'pino-pretty' : 'pino/file',
    level: env.NODE_ENV === 'development' ? 'debug' : 'info',
    options: env.NODE_ENV === 'development' ? { colorize: true } : {}
};

// Target para arquivos de log
const fileTarget: pino.TransportTargetOptions = {
    target: 'pino/file',
    level: 'info',
    options: {
        destination: logsFilesPath,
        mkdir: true
    }
};

// posteriormente quando tivermos a solução dos banco de dados adicionamos eles aqui de forma inteligente e adaptável

const transport = pino.transport({
    targets: [consoleTarget, fileTarget]
});

export const logger = pino(pinoConfigs, transport)