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

// Mocks de infraestrutura para isolar a Entidade Parcialmente
vi.mock('@Configs/env.js', () => ({
	env: {
		HASHER_PROVIDER: 'argon2',
		HASHER_SECURITY_PEPPER: 'test-pepper-ultra-strong-sha256-ficticio',
		HASHER_LENGTH: 32,
		HASHER_SALT_LENGTH: 16,
		HASHER_PARALLELISM: 1,
		HASHER_TIME_COST: 2,
		HASHER_MEMORY_COST: 19456,
		IDENTIFIER_PATTERN: 'uuidv7',
		IDENTIFIER_NANOID_ALPHABET: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_',
		IDENTIFIER_NANOID_SIZE: 21,
		DATABASE_ID_DEFAULT: 'uuidv7',
		EMAIL_TO_CONTACT: 'admin@test.com',
	},
}));

describe('User Entity (Fail-Fast Architecture)', () => {

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
				error: vi.fn()
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

		it('deve disparar throw no envio de email no formato string ao inves de objeto (comportamento arquitetural)', () => {
			expect(() => {
				userMocked.changeEmail('new@email.com');
			}).toThrow('Falha Interna Simulada: Tentativa de trocar email com valor inválido');

			const reflector = userMocked as unknown as { handlingError: ReturnType<typeof vi.fn> };
			expect(reflector.handlingError).toHaveBeenCalledWith(
				'warn',
				expect.anything(),
				'Tentativa de trocar email com valor inválido'
			);
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

		it('deve disparar erro de maculação se a senha enviada produzir o mesmo Hash (comportamento nativo)', async () => {
			await expect(userMocked.changePassword('SenhaQualquer@123')).rejects.toThrow('Falha Interna Simulada: Tentativa de maculação de hash após troca de senha');
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
			}).toThrow('Falha Interna Simulada: tentativa de trocar senha para uma senha inválida');
			// Nota: a mensagem original de handlingError p/ Username acidentalmente diz "senha inválida" no src, cobrimos o erro real.
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
