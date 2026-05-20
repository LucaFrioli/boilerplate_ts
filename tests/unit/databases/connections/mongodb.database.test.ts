/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@Configs/env.js', () => ({
	env: {
		DATABASE_TYPE: 'mongodb',
	},
}));

vi.mock('@DbUri/persistence/mongodb.uri.js', () => ({
	mongoURI: 'mongodb://mocked-user:mocked-pwd@localhost:27017/test-db',
}));

import mongoose from 'mongoose';
import MongodbConnect from '@Database/connections/mongodb.database.js';
import { env } from '@Configs/env.js';

vi.mock('mongoose', () => ({
	default: {
		connect: vi.fn(),
		disconnect: vi.fn(),
		connection: {
			readyState: 1, // connected
		},
		ConnectionStates: {
			connected: 1,
			disconnected: 0,
		},
	},
}));

describe('Databases / MongodbConnect', () => {
	let connectInstance: MongodbConnect;

	beforeEach(() => {
		vi.clearAllMocks();
		env.DATABASE_TYPE = 'mongodb';
		connectInstance = new MongodbConnect();
	});

	describe('connect()', () => {
		it('deve realizar a conexão com sucesso via URI', async () => {
			vi.mocked(mongoose.connect).mockResolvedValueOnce(undefined as any);

			await connectInstance.connect();

			expect(mongoose.connect).toHaveBeenCalledWith('mongodb://mocked-user:mocked-pwd@localhost:27017/test-db');
			// Verificamos a alteração de estado interna baseada em isConnected ou properties
			expect((connectInstance as any).connectionStatus).toBe(true);
		});

		it('deve disparar erro fatal se DATABASE_TYPE for divergente de mongodb', async () => {
			env.DATABASE_TYPE = 'postgres';

			// Sendo async a função connect e o erro sendo síncrono no handler, o `await expect` ou `expect` catch error.
			// Na implementação o `handlerErrors` dá `throw new Error`, o que pode acontecer antes do await mongoose.
			await expect(connectInstance.connect()).rejects.toThrow(
				/Erro de módulo MongoConnect: erro detectado Erro no tipo de banco da env verifique se DATABSE_TYPE é mongodb/
			);
		});

		it('deve formatar um erro fatal em caso de falha silenciosa do mongoose', async () => {
			const mockError = new Error('TCP mock error rejection');
			vi.mocked(mongoose.connect).mockRejectedValueOnce(mockError);

			await expect(connectInstance.connect()).rejects.toThrow(
				/Erro de módulo MongoConnect: erro detectado Falha na conexão do banco!/
			);

			expect((connectInstance as any).connectionStatus).toBe(false);
		});
	});

	describe('disconnect()', () => {
		it('deve realizar a desconexão com o banco', async () => {
			vi.mocked(mongoose.disconnect).mockResolvedValueOnce(undefined as any);

			await connectInstance.disconnect();

			expect(mongoose.disconnect).toHaveBeenCalled();
			expect((connectInstance as any).connectionStatus).toBe(false);
		});

		it('deve disparar erro fatal caso a desconexão falhe', async () => {
			const mockError = new Error('Falha no disconnect');
			vi.mocked(mongoose.disconnect).mockRejectedValueOnce(mockError);

			await expect(connectInstance.disconnect()).rejects.toThrow(
				/Erro de módulo MongoConnect: erro detectado Falha ao realizar a desconexão com o banco de dados/
			);
		});
	});

	describe('isConnected()', () => {
		it('deve retornar true quando readyState for connected', () => {
			(mongoose.connection as any).readyState = mongoose.ConnectionStates.connected;
			expect(connectInstance.isConnected()).toBe(true);
		});

		it('deve retornar false quando readyState for não connected (ex: disconnected)', () => {
			(mongoose.connection as any).readyState = mongoose.ConnectionStates.disconnected;
			expect(connectInstance.isConnected()).toBe(false);
		});
	});
});
