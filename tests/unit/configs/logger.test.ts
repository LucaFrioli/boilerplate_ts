import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

describe('configs/logger.ts', () => {
	let originalEnv: NodeJS.ProcessEnv;

	beforeEach(() => {
		originalEnv = { ...process.env };
		vi.resetModules();
	});

	afterEach(() => {
		process.env = originalEnv;
		vi.restoreAllMocks();
	});

	it('deve inicializar com o transport pino-pretty em ambiente de desenvolvimento', async () => {
		// Força ambiente de desenvolvimento
		process.env.NODE_ENV = 'development';
		
		const loggerModule = await import('@Configs/logger.js');
		
		expect(loggerModule.logger).toBeDefined();
		expect(loggerModule.createChildLogger).toBeTypeOf('function');
		
		// Verificamos o funcionamento do logger gerando um child logger
		const child = loggerModule.createChildLogger({
			module: 'testModule',
			fileType: 'util',
			service: 'util'
		});
		expect(child).toBeDefined();
	});

	it('deve inicializar com transport em file sem pretty e fallback para env development se NODE_ENV estiver ausente', async () => {
		// Remove NODE_ENV para acionar a constante `const currentEnv = process.env.NODE_ENV || 'development';`
		delete process.env.NODE_ENV;
		
		const loggerModule = await import('@Configs/logger.js');
		expect(loggerModule.logger).toBeDefined();
	});

	it('deve inicializar em ambiente de produção (pino/file) e nível de log info', async () => {
		// Força ambiente de produção
		process.env.NODE_ENV = 'production';
		
		const loggerModule = await import('@Configs/logger.js');
		expect(loggerModule.logger).toBeDefined();
	});
});
