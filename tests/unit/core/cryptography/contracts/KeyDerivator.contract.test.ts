/* eslint-disable @typescript-eslint/only-throw-error */
/* eslint-disable @typescript-eslint/no-confusing-void-expression */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/explicit-function-return-type */
/* eslint-disable @typescript-eslint/require-await */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { KeyDerivatorBase } from '@Crypto/contracts/KeyDerivator.contract.js';
import { validCryptographyKeys, invalidCryptographyKeys } from '@Mocks/test.fixtures.js';
import { type DerivedKey } from '@Types'

// Setup environment and logger mocks using vi.hoisted to avoid early evaluation issues
const { mockFatal, mockError, mockInfo, mockEnv } = vi.hoisted(() => ({
	mockFatal: vi.fn(),
	mockError: vi.fn(),
	mockInfo: vi.fn(),
	mockEnv: {
		NODE_ENV: 'test',
		CRIPTOGRAPHY_PASSWORDS_DIGESTOR: 'sha256',
		CRIPTOGRAPHY_DERIVATION_KEY_ALGORITHM: 'hkdf',
		CRIPTOGRAPHY_ENGINE_MODE: 'sync_node',
	},
}));

vi.mock('@Configs/logger.js', () => ({
	createChildLogger: () => ({
		fatal: mockFatal,
		error: mockError,
		info: mockInfo,
		debug: mockInfo,
	}),
}));

vi.mock('@Configs/env.js', () => ({
	env: mockEnv,
}));

// Stub implementation of KeyDerivatorBase for contract testing
class StubKeyDerivator extends KeyDerivatorBase {
	protected get providerName(): string {
		return 'StubKeyDerivator';
	}

	public deriveSyncStub = vi.fn();
	public deriveInEdgeStub = vi.fn();

	protected deriveSync<N extends number>(
		masterKey: string,
		contextInfo: string,
		outputLengthBytes: N
	): DerivedKey<N> {
		return this.deriveSyncStub(masterKey, contextInfo, outputLengthBytes);
	}

	protected async deriveInEdge<N extends number>(
		masterKey: string,
		contextInfo: string,
		outputLengthBytes: N
	): Promise<DerivedKey<N>> {
		return this.deriveInEdgeStub(masterKey, contextInfo, outputLengthBytes);
	}

	// Helpers to trigger protected methods in unit tests
	public triggerValidatedEnvValues(): void {
		this.validatedEnvValues();
	}

	public triggerValidateMasterKey(key: unknown): any {
		return this.validateMasterKey(key);
	}

	public triggerNormalizeDigestorNameToWebCryptoApi(): string {
		return this.normalizeDigestorNameToWebCryptoApi();
	}

	public triggerLogInfo(lvl: 'info' | 'debug', obj: object, msg: string): void {
		this.logInfo(lvl, obj, msg);
	}

	public getBaseEnv(): any {
		return this._baseEnv;
	}

	public setBaseEnv(val: any): void {
		this._baseEnv = val;
	}
}

describe('Core / Cryptography / KeyDerivator Base Contract', () => {
	let stub: StubKeyDerivator;

	beforeEach(() => {
		vi.clearAllMocks();
		stub = new StubKeyDerivator();

		// Reset env properties to default valid state
		mockEnv.NODE_ENV = 'test';
		mockEnv.CRIPTOGRAPHY_PASSWORDS_DIGESTOR = 'sha256';
		mockEnv.CRIPTOGRAPHY_DERIVATION_KEY_ALGORITHM = 'hkdf';
		mockEnv.CRIPTOGRAPHY_ENGINE_MODE = 'sync_node';
	});

	describe('validatedEnvValues()', () => {
		it('deve validar e salvar baseEnv quando as variáveis de ambiente forem válidas', () => {
			stub.triggerValidatedEnvValues();
			expect(stub.getBaseEnv()).toEqual({
				NODE_ENV: 'test',
				CRIPTOGRAPHY_PASSWORDS_DIGESTOR: 'sha256',
				CRIPTOGRAPHY_DERIVATION_KEY_ALGORITHM: 'hkdf',
				CRIPTOGRAPHY_ENGINE_MODE: 'sync_node',
			});
			expect(mockFatal).not.toHaveBeenCalled();
		});

		it('não deve rodar a validação novamente se o baseEnv já estiver definido', () => {
			stub.triggerValidatedEnvValues();
			// Mudamos o env, mas a validação não deve re-rodar
			mockEnv.CRIPTOGRAPHY_ENGINE_MODE = 'async_web_api';
			stub.triggerValidatedEnvValues();
			expect(stub.getBaseEnv()?.CRIPTOGRAPHY_ENGINE_MODE).toBe('sync_node');
		});

		it('deve disparar erro fatal via handlerErrors se NODE_ENV for inválido', () => {
			mockEnv.NODE_ENV = 'unknown_env' as any;
			expect(() => stub.triggerValidatedEnvValues()).toThrow(
				/Erro ao validar env de derivação, tentativa de macular valores em runtime/
			);
			expect(mockFatal).toHaveBeenCalled();
		});

		it('deve disparar erro fatal via handlerErrors se CRIPTOGRAPHY_DERIVATION_KEY_ALGORITHM for inválido', () => {
			mockEnv.CRIPTOGRAPHY_DERIVATION_KEY_ALGORITHM = 'invalid_kdf' as any;
			expect(() => stub.triggerValidatedEnvValues()).toThrow(
				/Erro ao validar env de derivação, tentativa de macular valores em runtime/
			);
			expect(mockFatal).toHaveBeenCalled();
		});
	});

	describe('derive()', () => {
		const masterKey = validCryptographyKeys.hex;

		it('deve chamar deriveSync se CRIPTOGRAPHY_ENGINE_MODE for sync_node', async () => {
			const expectedKey = validCryptographyKeys.hex;
			stub.deriveSyncStub.mockReturnValue(expectedKey);
			const result = await stub.derive(masterKey, 'info', 32);

			expect(stub.deriveSyncStub).toHaveBeenCalledWith(masterKey, 'info', 32);
			expect(stub.deriveInEdgeStub).not.toHaveBeenCalled();
			expect(result).toBe(expectedKey);
		});

		it('deve chamar deriveInEdge se CRIPTOGRAPHY_ENGINE_MODE for async_web_api', async () => {
			mockEnv.CRIPTOGRAPHY_ENGINE_MODE = 'async_web_api';
			const expectedKey = validCryptographyKeys.hex;
			stub.deriveInEdgeStub.mockResolvedValue(expectedKey);
			const result = await stub.derive(masterKey, 'info', 32);

			expect(stub.deriveInEdgeStub).toHaveBeenCalledWith(masterKey, 'info', 32);
			expect(stub.deriveSyncStub).not.toHaveBeenCalled();
			expect(result).toBe(expectedKey);
		});

		it('deve lançar erro se o baseEnv for undefined após a chamada de validatedEnvValues (Dead-Code safety)', async () => {
			const customStub = new StubKeyDerivator();
			vi.spyOn(customStub as any, 'validatedEnvValues').mockImplementation(() => { });
			customStub.setBaseEnv(undefined);

			await expect(customStub.derive(masterKey, 'info', 32)).rejects.toThrow(
				/Erro interno de variáveis de ambiente do derivador de chaves/
			);
			expect(mockFatal).toHaveBeenCalled();
		});

		it('deve capturar erro lançado pelo motor sync e lançar via handlerErrors', async () => {
			stub.deriveSyncStub.mockImplementation(() => {
				throw new Error('Sync KDF Error');
			});
			await expect(stub.derive(masterKey, 'info', 32)).rejects.toThrow(
				/Falha crítica durante a derivação de chaves criptográficas/
			);
			expect(mockError).toHaveBeenCalled();
		});

		it('deve capturar erro não-Error lançado pelo motor sync e converter para Error', async () => {
			stub.deriveSyncStub.mockImplementation(() => {
				throw 'raw string error';
			});
			await expect(stub.derive(masterKey, 'info', 32)).rejects.toThrow(
				/Falha crítica durante a derivação de chaves criptográficas/
			);
			expect(mockError).toHaveBeenCalledWith(
				expect.objectContaining({
					specificErrors: expect.any(Error)
				}),
				expect.any(String)
			);
		});

		it('deve capturar erro lançado pelo motor async e lançar via handlerErrors', async () => {
			mockEnv.CRIPTOGRAPHY_ENGINE_MODE = 'async_web_api';
			stub.deriveInEdgeStub.mockRejectedValue(new Error('Async KDF Error'));
			await expect(stub.derive(masterKey, 'info', 32)).rejects.toThrow(
				/Falha crítica durante a derivação de chaves criptográficas/
			);
			expect(mockError).toHaveBeenCalled();
		});
	});

	describe('validateMasterKey()', () => {
		it('deve aceitar chave mestra válida de alta entropia (Hex)', () => {
			const key = validCryptographyKeys.hex;
			const result = stub.triggerValidateMasterKey(key);
			expect(result).toBe(key);
			expect(mockError).not.toHaveBeenCalled();
		});

		it('deve aceitar chave mestra válida de alta entropia (Base64)', () => {
			const key = validCryptographyKeys.base64;
			const result = stub.triggerValidateMasterKey(key);
			expect(result).toBe(key);
			expect(mockError).not.toHaveBeenCalled();
		});

		it('deve lançar erro via handlerErrors para chave mestra inválida (muito curta)', () => {
			const key = invalidCryptographyKeys.hexTooShort;
			expect(() => stub.triggerValidateMasterKey(key)).toThrow(
				/A chave mestra fornecida não atende aos requisitos mínimos de segurança/
			);
			expect(mockError).toHaveBeenCalled();
		});
	});

	describe('normalizeDigestorNameToWebCryptoApi()', () => {
		it('deve normalizar sha256 para SHA-256', () => {
			stub.triggerValidatedEnvValues();
			const result = stub.triggerNormalizeDigestorNameToWebCryptoApi();
			expect(result).toBe('SHA-256');
		});

		it('deve normalizar sha512 para SHA-512 se configurado no env', () => {
			mockEnv.CRIPTOGRAPHY_PASSWORDS_DIGESTOR = 'sha512';
			stub.triggerValidatedEnvValues();
			const result = stub.triggerNormalizeDigestorNameToWebCryptoApi();
			expect(result).toBe('SHA-512');
		});

		it('deve lançar erro fatal se baseEnv for undefined (Dead-Code safety)', () => {
			stub.setBaseEnv(undefined);
			expect(() => stub.triggerNormalizeDigestorNameToWebCryptoApi()).toThrow(
				/Incapaz de acessar o digestor configurado no sistema/
			);
			expect(mockFatal).toHaveBeenCalled();
		});
	});

	describe('logInfo()', () => {
		it('deve permitir chamar logInfo sem erros nos níveis info e debug', () => {
			expect(() => stub.triggerLogInfo('info', { extra: 'data' }, 'message')).not.toThrow();
			expect(mockInfo).toHaveBeenCalledWith(
				expect.objectContaining({
					serviceName: 'StubKeyDerivator',
					extra: 'data',
				}),
				'message'
			);
		});
	});
});
