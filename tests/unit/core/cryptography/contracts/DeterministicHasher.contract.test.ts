/* eslint-disable @typescript-eslint/only-throw-error */
/* eslint-disable @typescript-eslint/no-confusing-void-expression */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/explicit-function-return-type */
/* eslint-disable @typescript-eslint/require-await */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DeterministicHahserBase } from '@Crypto/contracts/DeterministicHasher.contract.js';
import { validCryptographyKeys, invalidCryptographyKeys } from '@Mocks/test.fixtures.js';

// Setup environment and logger mocks using vi.hoisted to avoid early evaluation issues
const { mockFatal, mockError, mockInfo, mockEnv } = vi.hoisted(() => ({
	mockFatal: vi.fn(),
	mockError: vi.fn(),
	mockInfo: vi.fn(),
	mockEnv: {
		NODE_ENV: 'test',
		CRIPTOGRAPHY_PASSWORDS_DIGESTOR: 'sha256',
		CRIPTOGRAPHY_PASSWORDS_ALGORITHM: 'hmac',
		CRIPTOGRAPHY_SECURITY_PEPPER: '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef', // 64 chars hex (valid)
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


// Stub implementation of DeterministicHahserBase for contract testing
class StubDeterministicHasher extends DeterministicHahserBase {
	protected get proviederName(): string {
		return 'StubDeterministicHasher';
	}

	public hashSyncStub = vi.fn();
	public hashInEdgeStub = vi.fn();

	protected hashSync(plaintext: string, secretPepper: string): string {
		return this.hashSyncStub(plaintext, secretPepper);
	}

	protected async hashInEdge(plaintext: string, secretPepper: string): Promise<string> {
		return this.hashInEdgeStub(plaintext, secretPepper);
	}

	// Helpers to trigger protected methods in unit tests
	public triggerValidatedEnvValues(): void {
		this.validatedEnvValues();
	}

	public triggerValidatePepper(pepper: unknown): any {
		return this.validatePepper(pepper);
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

describe('Core / Cryptography / DeterministicHasher Base Contract', () => {
	let stub: StubDeterministicHasher;

	beforeEach(() => {
		vi.clearAllMocks();
		stub = new StubDeterministicHasher();

		// Reset env properties to default valid state
		mockEnv.NODE_ENV = 'test';
		mockEnv.CRIPTOGRAPHY_PASSWORDS_DIGESTOR = 'sha256';
		mockEnv.CRIPTOGRAPHY_PASSWORDS_ALGORITHM = 'hmac';
		mockEnv.CRIPTOGRAPHY_SECURITY_PEPPER = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
		mockEnv.CRIPTOGRAPHY_ENGINE_MODE = 'sync_node';
	});

	describe('validatedEnvValues()', () => {
		it('deve validar e salvar baseEnv quando as variáveis de ambiente forem válidas', () => {
			stub.triggerValidatedEnvValues();
			expect(stub.getBaseEnv()).toEqual({
				NODE_ENV: 'test',
				CRIPTOGRAPHY_PASSWORDS_DIGESTOR: 'sha256',
				CRIPTOGRAPHY_PASSWORDS_ALGORITHM: 'hmac',
				CRIPTOGRAPHY_SECURITY_PEPPER: '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef',
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
				/Erro ao validar env, tentativa de macular valores durante execução/
			);
			expect(mockFatal).toHaveBeenCalled();
		});

		it('deve disparar erro fatal via handlerErrors se CRIPTOGRAPHY_SECURITY_PEPPER for inválido (muito curto)', () => {
			mockEnv.CRIPTOGRAPHY_SECURITY_PEPPER = invalidCryptographyKeys.hexTooShort;
			expect(() => stub.triggerValidatedEnvValues()).toThrow(
				/Erro ao validar env, tentativa de macular valores durante execução/
			);
			expect(mockFatal).toHaveBeenCalled();
		});
	});

	describe('hash()', () => {
		it('deve chamar hashSync se CRIPTOGRAPHY_ENGINE_MODE for sync_node', async () => {
			stub.hashSyncStub.mockReturnValue('sync_hash_result');
			const result = await stub.hash('myPlaintext', 'myPepper');

			expect(stub.hashSyncStub).toHaveBeenCalledWith('myPlaintext', 'myPepper');
			expect(stub.hashInEdgeStub).not.toHaveBeenCalled();
			expect(result).toBe('sync_hash_result');
		});

		it('deve chamar hashInEdge se CRIPTOGRAPHY_ENGINE_MODE for async_web_api', async () => {
			// Definimos no env
			mockEnv.CRIPTOGRAPHY_ENGINE_MODE = 'async_web_api';
			stub.hashInEdgeStub.mockResolvedValue('async_hash_result');
			const result = await stub.hash('myPlaintext', 'myPepper');

			expect(stub.hashInEdgeStub).toHaveBeenCalledWith('myPlaintext', 'myPepper');
			expect(stub.hashSyncStub).not.toHaveBeenCalled();
			expect(result).toBe('async_hash_result');
		});

		it('deve lançar erro se o baseEnv for undefined após a chamada de validatedEnvValues (Dead-Code safety)', async () => {
			// Simulamos baseEnv permanecendo undefined burlando a validação
			const customStub = new StubDeterministicHasher();
			vi.spyOn(customStub as any, 'validatedEnvValues').mockImplementation(() => {});
			customStub.setBaseEnv(undefined);

			await expect(customStub.hash('plain', 'pepper')).rejects.toThrow(
				/Erro dentro dos valores das variaveis de hambiente/
			);
			expect(mockFatal).toHaveBeenCalled();
		});

		it('deve capturar erro lançado pelo motor sync e lançar via handlerErrors', async () => {
			stub.hashSyncStub.mockImplementation(() => {
				throw new Error('Sync Engine Error');
			});
			await expect(stub.hash('plain', 'pepper')).rejects.toThrow(
				/Falha cítica durante a execução do hash/
			);
			expect(mockError).toHaveBeenCalled();
		});

		it('deve capturar erro não-Error lançado pelo motor sync e converter para Error', async () => {
			stub.hashSyncStub.mockImplementation(() => {
				throw 'raw string error';
			});
			await expect(stub.hash('plain', 'pepper')).rejects.toThrow(
				/Falha cítica durante a execução do hash/
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
			stub.hashInEdgeStub.mockRejectedValue(new Error('Async Engine Error'));
			await expect(stub.hash('plain', 'pepper')).rejects.toThrow(
				/Falha cítica durante a execução do hash/
			);
			expect(mockError).toHaveBeenCalled();
		});
	});

	describe('validatePepper()', () => {
		it('deve aceitar pepper válido de alta entropia (Hex)', () => {
			const pepper = validCryptographyKeys.hex;
			const result = stub.triggerValidatePepper(pepper);
			expect(result).toBe(pepper);
			expect(mockError).not.toHaveBeenCalled();
		});

		it('deve aceitar pepper válido de alta entropia (Base64)', () => {
			const pepper = validCryptographyKeys.base64;
			const result = stub.triggerValidatePepper(pepper);
			expect(result).toBe(pepper);
			expect(mockError).not.toHaveBeenCalled();
		});

		it('deve lançar erro via handlerErrors para pepper inválido (muito curto)', () => {
			const pepper = invalidCryptographyKeys.hexTooShort;
			expect(() => stub.triggerValidatePepper(pepper)).toThrow(
				/Validação do secret pepper falhou, verifique o pepper que você passou/
			);
			expect(mockError).toHaveBeenCalled();
		});
	});

	describe('normalizeDigestorNameToWebCryptoApi()', () => {
		it('deve normalizar sha256 para SHA-256', () => {
			stub.triggerValidatedEnvValues(); // inicializa baseEnv
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
				/Infelizmente não foi possível acessar o parametro que disponibiliza o digestor/
			);
			expect(mockFatal).toHaveBeenCalled();
		});
	});

	describe('logInfo()', () => {
		it('deve permitir chamar logInfo sem erros nos níveis info e debug', () => {
			expect(() => stub.triggerLogInfo('info', { extra: 'data' }, 'message')).not.toThrow();
			expect(mockInfo).toHaveBeenCalledWith(
				expect.objectContaining({
					serviceNmae: 'StubDeterministicHasher',
					extra: 'data',
				}),
				'message'
			);
		});
	});
});
