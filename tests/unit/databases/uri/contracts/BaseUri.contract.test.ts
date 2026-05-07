/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BaseUri } from '@Database/uri/contracts/BaseUri.contract.js';
import { isDatabaseUri, type DatabaseURI } from '@Types';

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
	})
});
