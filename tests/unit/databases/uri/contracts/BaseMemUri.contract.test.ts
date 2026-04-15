import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BaseMemUri } from '@Database/uri/contracts/BaseMemUri.contract.js';
import { isMemDatabaseUri, type MemDatabaseURI } from '@Types/security.types.js';

vi.mock('@Configs/env.js', () => ({
	env: {
		NODE_ENV: 'test',
		DATABASE_TYPE: 'mongodb',
		DATABASE_HOST: 'localhost',
		DATABASE_PORT: 27017,
		DATABASE_NAME: 'test',
		DATABASE_USERNAME: 'dev_user',
		DATABASE_PASSWORD: 'Dev!Password12345678#',
		MEM_DB_TYPE: 'redis',
	},
}));

class StubMemUri extends BaseMemUri {
	protected get ServiceName(): string {
		return 'StubMemUri';
	}

	public setUri(val: MemDatabaseURI): void {
		this._uri = val;
	}

	// call protected for coverage
	public triggerLog(): void {
		this.logInfo('Mensagem teste', 'triggerLog', { id: 1 });
	}
}

describe('Databases / Uri / Contracts / BaseMemUri Contract', () => {
	let stubUri: StubMemUri;

	beforeEach(() => {
		vi.clearAllMocks();
		stubUri = new StubMemUri();
	});

	it('deve disparar erro fatal ao acessar getter de uri sem setar ou com uri invalida', () => {
		expect(() => stubUri.uri).toThrow(/Erro interno, a uri é indefinida ou mal formada!/);
	});

	it('deve retornar uri validada quando setado valor corretamente com padrao isMemDatabaseUri', () => {
		// protocolo redis:// ou rediss://
		const truthyUri = 'redis://localhost:6379'
		expect(isMemDatabaseUri(truthyUri)).toBe(true);

		if(isMemDatabaseUri(truthyUri)){
			stubUri.setUri(truthyUri);
		}

		expect(stubUri.uri).toBe('redis://localhost:6379');
	});

	it('deve chamar funçao logInfo sem estourar erros', () => {
		expect(function () { stubUri.triggerLog() }).not.toThrow();
	})
});
