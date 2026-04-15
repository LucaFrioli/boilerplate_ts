/* eslint-disable @typescript-eslint/require-await */
/* eslint-disable @typescript-eslint/no-unused-vars */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BaseHasher } from '../../../../../src/auth/hash/contracts/IHasher.contract.js';

vi.mock('@Configs/env.js', () => ({
	env: {
		EMAIL_TO_CONTACT: 'admin@habitos.app',
	},
}));

class StubHasher extends BaseHasher {
	protected get ServiceName(): string {
		return 'StubHasherService';
	}
	protected async executeHash(payload: string): Promise<string> {
		throw new Error('Simulated Execution Error');
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
		stubHasher = new StubHasher();
	});

	describe('generate()', () => {
		it('deve disparar handleErrorFatal em caso de throw no executeHash', async () => {
			await expect(stubHasher.generate('validPayload')).rejects.toThrow(
				/Erro interno crítico, contate algum administrador por meio dos canais legais admin@habitos.app/
			);
		});

		it('deve disparar handleErrorFatal caso isHashedString valide falso a geracao do motor', async () => {
			const invalidFormatStub = new InvalidFormatStubHasher();
			await expect(invalidFormatStub.generate('validPayload')).rejects.toThrow(
				/Erro interno crítico, contate algum administrador por meio dos canais legais admin@habitos.app/
			);
		});

		it('deve disparar erro comum se o payload enviado for invalido (vazio/espaços)', async () => {
			await expect(stubHasher.generate(' ')).rejects.toThrow(
				/O payload para geração de hash não pode estar vazio/
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
