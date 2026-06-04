import { createChildLogger } from '../logger.js';

// default logger to env

export const envLogger = createChildLogger({
	fileType: 'core',
	module: 'env',
	service: 'valuation',
});

// node_env defaults and supported
// 'test' é obrigatório aqui: o Vitest injeta NODE_ENV=test automaticamente em todos os workers.
// Sem este valor, qualquer módulo que importe env.ts falharia na inicialização dos testes.
export const nodeEnvSupported = ['development', 'stage', 'production', 'test'] as const;

// loacale and date constants

export const timezoneSupported = ['UTC', 'America/Sao_Paulo', 'Europa/Rome'] as const;
export const localeSupported = ['pt-BR', 'en-US', 'it-IT'] as const;
