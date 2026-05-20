/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

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

import { env } from '@Configs/env.js';
import { MongoConnectionString } from '@DbUri/persistence/mongodb.uri.js';
import { isDatabaseUri } from '@Types';

// O MongoConnectionString não é instanciável diretamente com argumentos se baseia na env global `env`.
// Para testar os branches "caixa preta" (SRV, ReplicaSet, Prod vs Dev), precisamos mockar a propriedade `env`.
// Sendo um JS Object exportado pelo env.js, podemos apenas alterar seus valores durante os testes.

describe('Databases / MongoConnectionString', () => {
	let originalEnv: typeof env;

	beforeEach(() => {
		// Clone shallow para restaurar depois
		originalEnv = { ...env };
	});

	afterEach(() => {
		// Restaura mutações feitas no objeto env
		Object.assign(env, originalEnv);
	});

	describe('generateUriToDev (ambiente de desenvolvimento)', () => {
		it('deve gerar url simples com localhost, database, auth e porta', () => {
			// Mock env
			env.NODE_ENV = 'development';
			env.DATABASE_TYPE = 'mongodb';
			env.DATABASE_HOST = 'localhost';
			env.DATABASE_PORT = 27017;
			env.DATABASE_USERNAME = 'dev_user';
			env.DATABASE_PASSWORD = 'Dev!Password12345678#';
			env.DATABASE_NAME = 'test_db';

			const connection = new MongoConnectionString();
			const uri = connection.uri;
			expect(uri).toBe('mongodb://dev_user:Dev!Password12345678%23@localhost:27017/test_db?retryWrites=true&authSource=admin');
			expect(isDatabaseUri(uri)).toBe(true);
		});
	});

	describe('generateUriToProd (ambiente de produção)', () => {
		beforeEach(() => {
			env.NODE_ENV = 'production';
			env.DATABASE_TYPE = 'mongodb';
			env.DATABASE_USERNAME = 'prod_user';
			env.DATABASE_PASSWORD = 'Prod!Password12345678#';
			env.DATABASE_NAME = 'prod_db';
		});

		it('deve gerar url SRV se o host pertencer aos dominíos SRV', () => {
			env.DATABASE_HOST = 'cluster0.mongodb.net';

			const connection = new MongoConnectionString();
			expect(connection.uri).toBe('mongodb+srv://prod_user:Prod!Password12345678%23@cluster0.mongodb.net/prod_db?retryWrites=true&w=majority&authSource=admin');
		});

		it('deve gerar url Multi-host (Replica Set) se houver virgulas no host', () => {
			env.DATABASE_HOST = 'host1.com,host2.com,host3.com';

			const connection = new MongoConnectionString();
			expect(connection.uri).toBe('mongodb://prod_user:Prod!Password12345678%23@host1.com,host2.com,host3.com/prod_db?retryWrites=true&w=majority&authSource=admin');
		});

		it('deve gerar url Simples (Standalone) de produção se for Single Host não-SRV', () => {
			env.DATABASE_HOST = 'meuhost-secreto-mongo.com'; // não é mongodb.net e não tem vírgula
			env.DATABASE_PORT = 27017;
			const connection = new MongoConnectionString();
			expect(connection.uri).toBe('mongodb://prod_user:Prod!Password12345678%23@meuhost-secreto-mongo.com:27017/prod_db?retryWrites=true&w=majority&authSource=admin');
		});

		it('deve disparar erro fatal se auth faltar em produção', () => {
			env.DATABASE_USERNAME = undefined;
			env.DATABASE_HOST = 'cluster0.mongodb.net';

			expect(() => new MongoConnectionString()).toThrow(/Erro de módulo MongoConnectionString: erro detectado Falha ao gerar autenticação para a URI/);
		});
	});

	describe('guardBroken e validação base', () => {
		it('deve disparar erro fatal se DATABASE_TYPE for diferente de mongodb', () => {
			env.DATABASE_TYPE = 'postgres'; // Incompatível com MongoConnectionString

			expect(() => new MongoConnectionString()).toThrow(/FATAL ERROR tetativa de fromação de URI Mongo porém env configurda como postgres/);
		});

		it('deve disparar erro fatal se _baseEnvValues for falsy (Dead Code do guardBroken)', () => {
			const BaseUriPrototype = Object.getPrototypeOf(MongoConnectionString.prototype);
			const originalValidate = BaseUriPrototype.validateBaseEnvDatas;

			try {
				// eslint-disable-next-line @typescript-eslint/no-explicit-any
				BaseUriPrototype.validateBaseEnvDatas = function (this: any): void {
					// Seta null para burlar o '=== undefined' de BaseUri e atingir o '!this._baseEnvValues' de guardBroken
					this._baseEnvValues = null;
				};

				expect(() => new MongoConnectionString()).toThrow(/Algo deu errado ao instânciar as variaveis/);
			} finally {
				BaseUriPrototype.validateBaseEnvDatas = originalValidate;
			}
		});

		it('deve disparar erro fatal em produção se credenciais não forem strings, porém forem avaliadas como truthy (Dead code do generateAuth)', () => {
			const BaseUriPrototype = Object.getPrototypeOf(MongoConnectionString.prototype);
			const originalValidate = BaseUriPrototype.validateBaseEnvDatas;

			try {
				// eslint-disable-next-line @typescript-eslint/no-explicit-any
				BaseUriPrototype.validateBaseEnvDatas = function (this: any): void {
					// Burlar o Zod do BaseUri para passar credenciais truthy porém non-strings
					this._baseEnvValues = {
						NODE_ENV: 'production',
						DATABASE_TYPE: 'mongodb',
						DATABASE_USERNAME: 12345,
						DATABASE_PASSWORD: 67890
					};
				};

				expect(() => new MongoConnectionString()).toThrow(/Em produção adicione as credências/);
			} finally {
				BaseUriPrototype.validateBaseEnvDatas = originalValidate;
			}
		});

		it('deve atingir falhas condicionais de tipagem e tamanho (Branches 68 e 108) burlando _password falsy com truthy original', () => {
			const BaseUriPrototype = Object.getPrototypeOf(MongoConnectionString.prototype);
			const originalValidate = BaseUriPrototype.validateBaseEnvDatas;

			try {
				// eslint-disable-next-line @typescript-eslint/no-explicit-any
				BaseUriPrototype.validateBaseEnvDatas = function (this: any): void {
					// Um array vazio `[]` é truthy no JS (passa no if), mas encodeURIComponent([]) é "" (falsy).
					// Isso aciona a ramificação falsa do ternary operator em generateAuth (this.auth = '')
					// E a ramificação falsa do tamanho em generateUriToProd (this.auth.length).
					this._baseEnvValues = {
						NODE_ENV: 'production',
						DATABASE_TYPE: 'mongodb',
						DATABASE_USERNAME: 'prod_user', // string normal
						DATABASE_PASSWORD: [] // Array vazio! Truthy condicional -> falsy transformado
					};
				};

				expect(() => new MongoConnectionString()).toThrow(/Falha ao gerar autenticação para a URI/);
			} finally {
				BaseUriPrototype.validateBaseEnvDatas = originalValidate;
			}
		});

		it('deve formatar erro fatal se gerar uma URI mal-formada em desenvolvimento', () => {
			env.NODE_ENV = 'development';
			env.DATABASE_TYPE = 'mongodb';
			env.DATABASE_PASSWORD = 'Dev!Password12345678#';
			// Host string inválida no mongo
			env.DATABASE_HOST = 'host invalido';
			env.DATABASE_NAME = 'test_db';

			// Nota: isValidUri no isDatabaseUri não aprovará a regex ou new URL
			expect(() => new MongoConnectionString()).toThrow(/Erro de módulo MongoConnectionString: erro detectado Erro ao validar como uma url válida/);
		});

		it('deve formatar erro fatal se gerar uma URI mal-formada em produção modalidade SRV', () => {
			env.NODE_ENV = 'production';
			env.DATABASE_TYPE = 'mongodb';
			env.DATABASE_USERNAME = 'prod_user';
			env.DATABASE_PASSWORD = 'Prod!Password12345678#';
			env.DATABASE_HOST = 'cluster0.mongodb.net!!! host invalido';
			env.DATABASE_NAME = 'prod_db';

			expect(() => new MongoConnectionString()).toThrow(/Erro ao criar connection string para Mongodb em modalidade srv/);
		});

		it('deve formatar erro fatal se gerar uma URI mal-formada em produção modalidade Multi-hosted', () => {
			env.NODE_ENV = 'production';
			env.DATABASE_TYPE = 'mongodb';
			env.DATABASE_USERNAME = 'prod_user';
			env.DATABASE_PASSWORD = 'Prod!Password12345678#';
			env.DATABASE_HOST = 'host1.com, host invalido!!!';
			env.DATABASE_NAME = 'prod_db';

			expect(() => new MongoConnectionString()).toThrow(/Erro ao criar connection string para Mongodb em modalidade multi host/);
		});

		it('deve formatar erro fatal se gerar uma URI mal-formada em produção modalidade Single-host', () => {
			env.NODE_ENV = 'production';
			env.DATABASE_TYPE = 'mongodb';
			env.DATABASE_USERNAME = 'prod_user';
			env.DATABASE_PASSWORD = 'Prod!Password12345678#';
			env.DATABASE_HOST = 'host invalido!!!'; // Nao srv, sem virgula
			env.DATABASE_NAME = 'prod_db';

			expect(() => new MongoConnectionString()).toThrow(/Erro ao criar connection string para Mongodb em modalidade single-host/);
		});
	});
});
