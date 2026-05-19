/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-confusing-void-expression */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BaseUri } from '@Database/uri/contracts/BaseUri.contract.js';
import { isDatabaseUri, type DatabaseURI } from '@Types';
import { env } from '@Configs/env.js';

vi.mock('@Configs/env.js', () => ({
	env: {
		NODE_ENV: 'test',
		DATABASE_TYPE: 'mongodb',
		DATABASE_HOST: 'localhost',
		DATABASE_PORT: 27017,
		DATABASE_NAME: 'test',
		DATABASE_USERNAME: 'dev_user',
		DATABASE_PASSWORD: 'Dev!Password12345678#',
	},
}));

class StubUri extends BaseUri {
	protected get uriGeneratorName(): string {
		return 'StubUri';
	}

	protected guardBroken(): void {
		// Mock implementation
	}

	protected maskUriToLog(unmaskUri: string): string {
		return unmaskUri;
	}

	protected generateUriToDev(validatedEnvValues: any): any {
		return 'mongodb://localhost:27017';
	}

	protected generateUriToProd(validatedEnvValues: any): any {
		return 'mongodb://localhost:27017';
	}

	public setUri(val: DatabaseURI): void {
		this._uri = val;
	}

	// call protected for coverage
	public triggerLog(): void {
		this.logInfo('Mensagem teste', 'triggerLog', { id: 1 });
	}

	public triggerNormalize(pass: string): void {
		this.normalizePassword(pass);
	}

	public getPassword(): string | undefined {
		return this._password;
	}

	public triggerSpecificEnv(): void {
		this.validateSpecificEnvValues();
	}
}

describe('Databases / Uri / Contracts / BaseUri Contract', () => {
	let stubUri: StubUri;

	beforeEach(() => {
		vi.clearAllMocks();
		stubUri = new StubUri();
	});

	it('deve disparar erro fatal ao acessar getter de uri sem setar ou com uri invalida', () => {
		stubUri.setUri('invalid-uri' as unknown as DatabaseURI);
		expect(() => stubUri.uri).toThrow(/Erro de módulo StubUri: erro detectado A uri é indefinidia, ou mal formada/);
	});

	it('deve retornar uri validada quando setado valor corretamente com padrao isDatabaseUri', () => {
		const truthyUri = 'mongodb://localhost:27017';
		expect(isDatabaseUri(truthyUri)).toBe(true);

		if(isDatabaseUri(truthyUri)){
			stubUri.setUri(truthyUri as DatabaseURI);
		}

		expect(stubUri.uri).toBe('mongodb://localhost:27017');
	});

	it('deve chamar funçao logInfo sem estourar erros', () => {
		expect(function () { stubUri.triggerLog() }).not.toThrow();
	});

	it('deve formatar a senha e guardar em _password ao chamar normalizePassword', () => {
		stubUri.triggerNormalize('senha!@#');
		expect(stubUri.getPassword()).toBe('senha!%40%23');
	});

	it('deve rotear a geração de uri para generateUriToDev se o ambiente for development', () => {
		const oldNodeEnv = env.NODE_ENV;
		env.NODE_ENV = 'development';

		const devUri = new StubUri();
		expect(devUri.uri).toBe('mongodb://localhost:27017'); // retorno mockado do generateUriToDev

		env.NODE_ENV = oldNodeEnv;
	});

	it('não deve rodar a validação do Zod novamente se _baseEnvValues já estiver definido', () => {
		// validateBaseEnvDatas é chamado no init (construtor).
		// Vamos chamá-lo de novo usando reflection/any para provar que a branch if (_baseEnvValues === undefined) retorna false e pula.
		const spy = vi.spyOn(stubUri as any, 'handlerErrors');
		(stubUri as any).validateBaseEnvDatas();
		expect(spy).not.toHaveBeenCalled();
	});

	it('deve disparar erro fatal se validateBaseEnvDatas falhar (zod parse error)', () => {
		// Macular a env global momentaneamente
		const oldType = env.DATABASE_TYPE;
		env.DATABASE_TYPE = 'invalid' as any;

		expect(() => new StubUri()).toThrow(/Variáveis de ambiente base foram maculadas/);

		// Restaurar
		env.DATABASE_TYPE = oldType;
	});

	it('deve disparar erro de não implementação ao chamar validateSpecificEnvValues', () => {
		expect(() => stubUri.triggerSpecificEnv()).toThrow(/Implemente o método antes de utilizá-lo/);
	});

	it('deve disparar erro fatal se _baseEnvValues for undefined durante init() (Dead-Code)', () => {
		// eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
		const instance = Object.create(StubUri.prototype) as any;
		// Mockamos init para não falhar no construtor
		Object.assign(instance, { BaseUriLogger: { fatal: vi.fn(), info: vi.fn() } });

		// Criamos um bypass onde validateBaseEnvDatas não faz nada, deixando _baseEnvValues como undefined
		instance.validateBaseEnvDatas = vi.fn();

		// Ao chamar init agora, a linha 76 deve estourar o erro!
		expect(() => instance.init()).toThrow(/Erro ao inicializar criação de string de conexão/);
	});
});
