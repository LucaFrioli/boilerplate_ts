/* eslint-disable @typescript-eslint/explicit-function-return-type */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/require-await */
/* eslint-disable @typescript-eslint/no-unused-vars */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BaseHasher } from '@Hash/contracts/IHasher.contract.js';

const { mockEnv } = vi.hoisted(() => ({
	mockEnv: {
		NODE_ENV: 'test',
		EMAIL_TO_CONTACT: 'admin@habitos.app',
		HASHER_PROVIDER: 'bcrypt',
		HASHER_BCRYPT_ROUNDS: 12,
		HASHER_LENGTH: 32,
		HASHER_MEMORY_COST: 65536,
		HASHER_PARALLELISM: 4,
		HASHER_SALT_LENGTH: 16,
		HASHER_SECURITY_PEPPER: 'YWJjZGVmZ2hpamtsbW5vcHFyc3R1dnd4eXowMTIzNDU2Nzg5+++///2=',
		HASHER_TIME_COST: 3,
		CRIPTOGRAPHY_DERIVATION_KEY_ALGORITHM: 'hkdf',
		CRIPTOGRAPHY_ENGINE_MODE: 'sync_node',
		CRIPTOGRAPHY_DERIVATION_KEY_SALT: 32,
		CRIPTOGRAPHY_PASSWORDS_DIGESTOR: 'sha256',
	},
}));

vi.mock('@Configs/env.js', () => ({
	env: mockEnv,
}));

class StubHasher extends BaseHasher {
	protected get ServiceName(): string {
		return 'StubHasherService';
	}
	protected async executeHash(payload: string): Promise<string> {
		return '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/lewKyBAzMCLGu8OBu';
	}
	protected async executeCompare(payload: string, hashedString: string): Promise<boolean> {
		throw new Error('Simulated Compare Error');
	}
	protected executeValidation(hashedString: string): boolean {
		throw new Error('Simulated Validation Error');
	}
}

class InvalidFormatStubHasher extends BaseHasher {
	protected get ServiceName(): string {
		return 'InvalidFormatStubService';
	}
	protected async executeHash(payload: string): Promise<string> {
		return 'qualquer-string-que-nao-seja-padrao-argon2-ou-bcrypt';
	}
	protected async executeCompare(payload: string, hashedString: string): Promise<boolean> {
		return true;
	}
	protected executeValidation(hashedString: string): boolean {
		return true;
	}
}

describe('Auth / Hash / BaseHasher Contract (Fail-Fast Hooks)', () => {
	let stubHasher: StubHasher;

	beforeEach(() => {
		vi.clearAllMocks();
		(BaseHasher as any)._baseEnv = undefined;
		stubHasher = new StubHasher();
		// Reset mock environment parameters before each test
		mockEnv.NODE_ENV = 'test';
		mockEnv.EMAIL_TO_CONTACT = 'admin@habitos.app';
		mockEnv.HASHER_PROVIDER = 'bcrypt';
		mockEnv.HASHER_BCRYPT_ROUNDS = 12;
		mockEnv.HASHER_LENGTH = 32;
		mockEnv.HASHER_MEMORY_COST = 65536;
		mockEnv.HASHER_PARALLELISM = 4;
		mockEnv.HASHER_SALT_LENGTH = 16;
		mockEnv.HASHER_SECURITY_PEPPER = 'YWJjZGVmZ2hpamtsbW5vcHFyc3R1dnd4eXowMTIzNDU2Nzg5+++///2=';
		mockEnv.HASHER_TIME_COST = 3;
		mockEnv.CRIPTOGRAPHY_DERIVATION_KEY_ALGORITHM = 'hkdf';
		mockEnv.CRIPTOGRAPHY_ENGINE_MODE = 'sync_node';
		mockEnv.CRIPTOGRAPHY_DERIVATION_KEY_SALT = 32;
		mockEnv.CRIPTOGRAPHY_PASSWORDS_DIGESTOR = 'sha256';
	});

	describe('generate()', () => {
		it('deve disparar error comum se o payload enviado for invalido (vazio/espaços)', async () => {
			await expect(stubHasher.generate(' ')).rejects.toThrow(
				/O payload para geração de hash não pode estar vazio/
			);
		});

		it('deve disparar error se a execucao interna do motor falhar (simulado)', async () => {
			const errorStub = new StubHasher();
			vi.spyOn(errorStub as any, 'executeHash').mockRejectedValueOnce(new Error('Simulated Execution Error'));
			await expect(errorStub.generate('validPayload')).rejects.toThrow(
				/Erro interno crítico, contate algum administrador/
			);
		});

		it('deve disparar/rejeitar caso isHashedString valide falso a geracao do motor', async () => {
			const invalidFormatStub = new InvalidFormatStubHasher();
			await expect(invalidFormatStub.generate('validPayload')).rejects.toThrow(
				/Erro interno crítico, contate algum administrador por meio dos canais legais admin@habitos.app/
			);
		});

		it('deve validar com sucesso um ambiente correto e gerar a hash com sucesso (Black-Box)', async () => {
			const result1 = await stubHasher.generate('validPayload');
			const result2 = await stubHasher.generate('validPayload');
			expect(result1).toBeDefined();
			expect(result2).toBe(result1);
		});

		it('deve falhar se as variaveis de ambiente forem maculadas/deletadas no meio da execucao (Black-Box)', async () => {
			class MaculationStub extends BaseHasher {
				protected get ServiceName(): string { return 'MaculationStub'; }
				protected async executeHash(payload: string): Promise<string> {
					return '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/lewKyBAzMCLGu8OBu';
				}
				protected async executeCompare(payload: string, hashedString: string): Promise<boolean> { return true; }
				protected executeValidation(hashedString: string): boolean { return true; }
				protected async validateEnvValues() {
					const res = await super.validateEnvValues();
					(BaseHasher as any)._baseEnv = undefined;
					return res;
				}
			}
			const maculationStub = new MaculationStub();
			await expect(maculationStub.generate('validPayload')).rejects.toThrow(
				/Erro interno crítico, contate algum administrador/
			);
		});

		it('deve cobrir a re-entrada de validacao quando o ambiente ja esta definido (Black-Box)', async () => {
			class ReentryStub extends BaseHasher {
				protected get ServiceName(): string { return 'ReentryStub'; }
				protected async executeHash(payload: string): Promise<string> {
					await this.validateEnvValues(); // Re-entrada com _baseEnv definido
					return '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/lewKyBAzMCLGu8OBu';
				}
				protected async executeCompare(payload: string, hashedString: string): Promise<boolean> { return true; }
				protected executeValidation(hashedString: string): boolean { return true; }
			}
			const reentryStub = new ReentryStub();
			const result = await reentryStub.generate('validPayload');
			expect(result).toBeDefined();
		});

		it('deve falhar a validacao se o ambiente Zod estiver incorreto (email invalido) (Black-Box)', async () => {
			mockEnv.EMAIL_TO_CONTACT = 'not-an-email';
			await expect(stubHasher.generate('validPayload')).rejects.toThrow(
				/Erro interno crítico, contate algum administrador/
			);
		});

		it('deve falhar a validacao se o email nao for do tipo string (Black-Box)', async () => {
			mockEnv.EMAIL_TO_CONTACT = 123 as any;
			await expect(stubHasher.generate('validPayload')).rejects.toThrow(
				/Erro interno crítico, contate algum administrador/
			);
		});

		it('deve falhar se a derivacao de chaves falhar (pepper com formato invalido) (Black-Box)', async () => {
			mockEnv.HASHER_SECURITY_PEPPER = 'aA1!bB2@cC3#dD4$eE5%fF6^gG7&hH8*';
			await expect(stubHasher.generate('validPayload')).rejects.toThrow(
				/Erro interno crítico, contate algum administrador/
			);
		});
	});

	describe('compare()', () => {
		it('deve retornar false caso executeCompare dispare erro', async () => {
			const result = await stubHasher.compare('payload', 'any_hash');
			expect(result).toBe(false);
		});
	});

	describe('validateHash()', () => {
		it('deve lançar novo Error formatado caso executeValidation dispare erro', () => {
			expect(() => stubHasher.validateHash('any_hash')).toThrow(
				/Verifique novamente a senha enviada!/
			);
		});
	});
});
