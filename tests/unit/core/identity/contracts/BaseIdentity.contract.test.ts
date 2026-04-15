/* eslint-disable @typescript-eslint/no-unused-vars */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import BaseIdentityGenerator from '@Id/contracts/IIdentyti.contract.js';

vi.mock('@Configs/env.js', () => ({
	env: {
		EMAIL_TO_CONTACT: 'admin@habitos.app',
	},
}));

class StubIdentity extends BaseIdentityGenerator {
	protected get serviceName(): string {
		return 'StubIdentityService';
	}
	protected generateLogic(): string {
		throw new Error('Simulated Generator Error');
	}
	protected generateValidation(id: string): boolean {
		throw new Error('Simulated Generator Validation Error');
	}
}

class ValidStubIdentity extends BaseIdentityGenerator {
	protected get serviceName(): string {
		return 'ValidStubIdentityService';
	}
	protected generateLogic(): string {
		return 'valid_id_string';
	}
	protected generateValidation(id: string): boolean {
		return true;
	}
}

describe('Core / Identity / BaseIdentityGenerator Contract (Fail-Fast Hooks)', () => {
	let stubIdentity: StubIdentity;
	let validIdentity: ValidStubIdentity;

	beforeEach(() => {
		vi.clearAllMocks();
		stubIdentity = new StubIdentity();
		validIdentity = new ValidStubIdentity();
	});

	describe('generate()', () => {
		it('deve formatar erro fatal em caso de throw no generateLogic', () => {
			expect(() => stubIdentity.generate()).toThrow(
				/Erro interno crítico, contate algum administrador por meio dos canais legais admin@habitos.app/
			);
		});

		it('deve retornar id e dar Object.freeze na string retornada', () => {
			const id = validIdentity.generate();
			expect(id).toBe('valid_id_string');
			expect(Object.isFrozen(id)).toBe(true);
		});
	});

	describe('validate()', () => {
		it('deve formatar erro fatal em caso de throw no generateValidation', () => {
			expect(() => stubIdentity.validate('any_id')).toThrow(
				/Erro interno crítico, contate algum administrador por meio dos canais legais admin@habitos.app/
			);
		});

		it('deve retornar true caso a validação ocorra tranquilamente', () => {
			expect(validIdentity.validate('123')).toBe(true);
		});
	});
});
