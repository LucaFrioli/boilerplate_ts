/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BaseMemUri, type EnvDataForMemDbUri } from '@Database/uri/contracts/BaseMemUri.contract.js';
import { type MemDatabaseURI } from '@Types';

vi.mock('@Configs/env.js', () => ({
	env: {
		NODE_ENV: 'test',
		MEM_DB_TYPE: 'valkey',
		MEM_DB_HOST: 'localhost',
		MEM_DB_PORT: 6379,
		MEM_DB_PROTOCOL: 'valkey',
	},
}));

import { env } from '@Configs/env.js';

class StubMemUri extends BaseMemUri {
	protected get ServiceName(): string {
		return 'StubMemUri';
	}
	protected get dbName(): any {
		return 'valkey';
	}

	protected guardBroken(): void {
		// Mock implementation
	}

	protected maskUriToLog(unmaskUri: string): string {
		return unmaskUri;
	}

	protected generateUriDev(validatedEnvValues: any): MemDatabaseURI {
		return 'valkey://localhost:6379' as MemDatabaseURI;
	}

	protected generateUriProd(validatedEnvValues: any): MemDatabaseURI {
		return 'valkeys://prd-host:6379' as MemDatabaseURI;
	}

	public setUri(val: MemDatabaseURI): void {
		this._uri = val;
	}

	public triggerLog(): void {
		this.logInfo('Mensagem teste', 'triggerLog', { id: 1 });
	}

	public triggerNormalize(pass: string): void {
		this.normalizePassword(pass);
	}

	public getPassword(): string | undefined {
		return this._password;
	}
}

describe('Databases / Uri / Contracts / BaseMemUri Contract', () => {
	let stubMemUri: StubMemUri;

	beforeEach(() => {
		vi.clearAllMocks();
		stubMemUri = new StubMemUri();
	});

	it('deve disparar erro fatal ao acessar getter de uri sem setar ou com uri invalida', () => {
		stubMemUri.setUri('invalid-uri' as unknown as MemDatabaseURI);
		expect(() => stubMemUri.uri).toThrow(/Erro de módulo StubMemUri: erro detectado Erro interno, a uri é indefinida ou mal formada!/);
	});

	it('deve retornar uri validada quando setado valor corretamente', () => {
		stubMemUri.setUri('valkey://localhost:6379' as MemDatabaseURI);
		expect(stubMemUri.uri).toBe('valkey://localhost:6379');
	});

	it('deve chamar funçao logInfo sem estourar erros', () => {
		expect(function () { stubMemUri.triggerLog() }).not.toThrow();
	});

	it('deve formatar a senha e guardar em _password ao chamar normalizePassword', () => {
		stubMemUri.triggerNormalize('senha!@#');
		expect(stubMemUri.getPassword()).toBe('senha!%40%23');
	});

	it('deve rotear a geração de uri para generateUriDev se o ambiente for development', () => {
		const oldNodeEnv = env.NODE_ENV;
		env.NODE_ENV = 'development';

		const devUri = new StubMemUri();
		expect(devUri.uri).toBe('valkey://localhost:6379');

		env.NODE_ENV = oldNodeEnv;
	});

	it('deve rotear a geração de uri para generateUriProd se o ambiente não for development', () => {
		const oldNodeEnv = env.NODE_ENV;
		env.NODE_ENV = 'production';

		const prodUri = new StubMemUri();
		expect(prodUri.uri).toBe('valkeys://prd-host:6379');

		env.NODE_ENV = oldNodeEnv;
	});

	it('não deve rodar a validação do Zod novamente se _baseEnvMemDb já estiver definido', () => {
		const spy = vi.spyOn(stubMemUri as any, 'handlerErrors');
		(stubMemUri as any).validateBaseEnv();
		expect(spy).not.toHaveBeenCalled();
	});

	it('deve disparar erro fatal se validateBaseEnv falhar (zod parse error)', () => {
		const oldType = env.MEM_DB_TYPE;
		env.MEM_DB_TYPE = 'invalid' as any;

		expect(() => new StubMemUri()).toThrow(/Variaveis de hambiente maculadas após boot/);

		env.MEM_DB_TYPE = oldType;
	});

	it('deve disparar erro fatal se _baseEnvMemDb for undefined durante init() (Dead-Code)', () => {
		const instance = Object.create(StubMemUri.prototype);
		Object.assign(instance, { _internalLogger: { fatal: vi.fn(), info: vi.fn() } });

		instance.validateBaseEnv = vi.fn();

		expect(() => instance.init()).toThrow(/Erro ao iniciar o gerador de string de conexão/);
	});

	it('deve disparar erro fatal se NODE_ENV for desconhecido dentro de generateMemDBUri (Dead-Code bypass)', () => {
		const instance = Object.create(StubMemUri.prototype);
		Object.assign(instance, {
			_internalLogger: { fatal: vi.fn(), info: vi.fn() },
			_baseEnvMemDb: { NODE_ENV: 'aliens_env' } // valor não suportado
		});

		instance.validateBaseEnv = vi.fn();
		instance.guardBroken = vi.fn();

		expect(() => instance.init()).toThrow(/Erro ao tentar URI para produção verifique se ela pertence a algum/);
	});
});
