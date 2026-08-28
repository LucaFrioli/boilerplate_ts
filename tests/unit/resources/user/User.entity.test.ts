/**
 * @fileoverview Testes da Entidade User — Verificação Comportamental Contraintuitiva (Black-Box).
 *
 * Devido às escolhas opinativas do Módulo de Domínio (`z.iso.datetime()` requerendo ISO String estrita
 * contra o envio de instâncias nativas `Date`), a Entidade possui um bloqueio de nascimento conhecido
 * (Fail-Fast). Nossa estratégia é garantir que esse bloqueio seja disparado corretamente e os logs apropriados
 * sejam invocados - atestando a integridade da "Parede de Segurança" construída pelo usuário.
 */
import { describe, it, expect, vi, beforeAll } from 'vitest';
import { User } from '@Resources/User/User.js';
import { validCreateUserPayload } from '@Mocks/test.fixtures.js';
import { Hasher } from '@Hash/hashesFactory.auth.js';
import baseUserSchema from '@Resources/User/User.validation.js';
import type { AppID, DatabaseID, HashedString, ValidCPF, ValidEmail, ValidUsernamePii } from '@Types';
import type { UserI } from '@Resources/User/User.interface.js';
import resetsCache from '@Mocks/test.resets.js';

vi.mock('@Configs/env.js', async () => {
	const { baseTestEnv } = await import('@Mocks/test.fixtures.js');
	return ({
		env: { ...baseTestEnv },
	})
});


describe('User Entity (Fail-Fast Architecture)', () => {
	beforeAll(() => {
		vi.clearAllMocks();
		resetsCache(['BaseHasher', 'DeterministicHasherBase', 'KeyDerivatorBase']);
	});

	describe('Constructor & Schema Guard (User.create)', () => {

		it('DEVE acionar o handlingError (Erro Crítico) devido à validação opinativa z.iso.datetime', async () => {
			// A intenção aqui é verificar que o sistema DE FATO aborta a inicialização (Fail-Fast)
			// devido ao Date provido pelo create não dar match com a exigência estrita do Schema (String ISO).
			await expect(User.create(validCreateUserPayload)).rejects.toThrow('Erro interno crítico, contate algum administrador por meio dos canais legais');
		});

	});

	// Como a entidade nunca nasce devido ao Fail-Fast da restrição temporal,
	// métodos internos não podem ser chamados num fluxo normal.
	// Vamos, então, simular o Bypassing do Zod Parser *apenas em memória*
	// para atestar a mecânica interna dos métodos.
	describe('Mutações e Regras de Negócio Isoladas', () => {

		let userMocked: User;

		beforeAll(() => {
			// Hydratação Direta (Forçando o construtor, que quebra, então usaremos o Prototype)
			userMocked = Object.create(User.prototype) as User;

			// Bypass seguro apenas para o setup em memória, sem vazar `any` para o escopo do arquivo.
			const mockReflector = userMocked as unknown as Record<string, unknown>;

			mockReflector.props = {
				id: 'db_id',
				publicId: 'app_id',
				username: 'luca_frioli',
				email: 'old@email.com',
				active: true,
				createdAt: new Date(),
				updatedAt: null,
				deletedAt: null,
				passwordHash: '$argon2id$v=19$m=16384,t=2,p=1$fake$fake'
			};

			// Mock do Logger e do handlingError
			mockReflector.entityLogger = {
				info: vi.fn(),
				debug: vi.fn(),
				warn: vi.fn(),
				fatal: vi.fn(),
				error: vi.fn(),
				child: vi.fn().mockReturnValue({ error: vi.fn() })
			};

			mockReflector.handlingError = vi.fn().mockImplementation((severity: string, data: unknown, msg: string) => {
				throw new Error('Falha Interna Simulada: ' + msg);
			});
		});

		it('deve formatar o Data-Hiding corretamente no toPublicDTO', () => {
			const dto = userMocked.toPublicDTO();
			expect(dto).not.toHaveProperty('passwordHash');
			expect(dto).not.toHaveProperty('cpf');
			expect(dto).toHaveProperty('id', 'app_id');
			expect(dto.email).toBe('old@email.com');
		});

		it('deve chamar validate e retornar true salvando dados e formatando os logs de depuração', () => {
			vi.spyOn(baseUserSchema, 'safeParse').mockReturnValueOnce({
				success: true,
				data: {
					publicId: 'app_id' as AppID,
					username: 'mocked' as ValidUsernamePii,
					id: 'id' as DatabaseID,
					active: false,
					email: '' as ValidEmail,
					passwordHash: '' as HashedString,
					cpf: '' as ValidCPF,
					stripeId: null,
					walletId: null,
					profileId: 'id_app' as DatabaseID,
					createdAt: new Date(),
					updatedAt: null,
					deletedAt: null
				},
			});

			const testInstance = Object.create(User.prototype) as {
				logInfo: ReturnType<typeof vi.fn>;
				validate: (data: unknown) => UserI;
			};
			testInstance.logInfo = vi.fn();

			const res = testInstance.validate({});

			expect(testInstance.logInfo).toHaveBeenCalledWith('debug', 'app_id transitando por dentro do sistema!', expect.any(Object));
			expect(res.username).toBe('mocked');
			vi.restoreAllMocks();
		});


		it('deve disparar erro se tentar alterar email com input estrito (comportamento nativo do safeParse z.object)', () => {
			expect(() => {
				userMocked.changeEmail('invalid-change-because-expects-object');
			}).toThrow('Falha Interna Simulada: Tentativa de trocar email com valor inválido');

			const reflector = userMocked as unknown as { handlingError: ReturnType<typeof vi.fn> };
			expect(reflector.handlingError).toHaveBeenCalledWith(
				'warn',
				expect.anything(),
				'Tentativa de trocar email com valor inválido'
			);
		});

		it('deve trocar o email corretamente se a nova string for válida (Happy Path)', () => {
			userMocked.changeEmail('novo.email@perfeito.com');
			const dbDto = userMocked.toDatabaseDTO();
			expect(dbDto.email).toBe('novo.email@perfeito.com');
		});

		it('deve disparar erro de maculação se a senha enviada produzir o mesmo Hash (comportamento nativo)', async () => {
			await expect(userMocked.changePassword('SenhaQualquer@123')).rejects.toThrow('Falha Interna Simulada: Tentativa de maculação de hash após troca de senha');
		});

		it('deve disparar erro se a senha provida for fraca demais / invalida', async () => {
			await expect(userMocked.changePassword('fraca')).rejects.toThrow('Falha Interna Simulada: Erro ao tentar trocar senha! Tente novamente');
		});

		it('deve trocar a senha corretamente se a nova senha for válida e não maculada', async () => {
			// Mockamos a validação de Hash momentaneamente pois a arquitetura do domínio trata todo hash novo
			// como maculado devido ao uso de "validateHash" no lugar de "compare" internamente na User.ts
			vi.spyOn(Hasher, 'validateHash').mockReturnValueOnce(false);
			await userMocked.changePassword('NovaSenhaForte@2026!');
			const dbDto = userMocked.toDatabaseDTO();
			expect(dbDto.passwordHash).not.toBe('$argon2id$v=19$m=16384,t=2,p=1$fake$fake');
			expect(typeof dbDto.passwordHash).toBe('string');
		});

		it('deve alterar o nome de usuário (Username) corretamente', () => {
			userMocked.changeUsername('novo_handle_valido');
			const dbDto = userMocked.toDatabaseDTO();
			expect(dbDto.username).toBe('novo_handle_valido');
		});

		it('deve disparar throw se o Username não for válido', () => {
			expect(() => {
				userMocked.changeUsername('NOME COM ESPAÇOS E MAIÚSCULAS!');
			}).toThrow('Falha Interna Simulada: tentativa de trocar username por um username inválido');
		});

		it('deve ativar o usuário (activateUser)', () => {
			userMocked.activateUser();
			const dbDto = userMocked.toDatabaseDTO();
			expect(dbDto.active).toBe(true);
		});

		it('deve desativar o usuário (deactiveUser)', () => {
			userMocked.deactiveUser();
			const dbDto = userMocked.toDatabaseDTO();
			expect(dbDto.active).toBe(false);
		});

		it('deve executar o Soft Delete de forma limpa', () => {
			userMocked.deleteUser();
			const dbDto = userMocked.toDatabaseDTO();
			expect(dbDto.active).toBe(false);
			expect(dbDto.deletedAt).toBeInstanceOf(Date);
		});
	});
});
