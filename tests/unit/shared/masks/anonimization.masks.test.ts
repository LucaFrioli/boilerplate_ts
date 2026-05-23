import { vi, describe, it, expect } from 'vitest';
import type { DatabaseUsername } from '@Types/security.types.js';

/**
 * Mock de env.ts — necessário pois masks.util.ts importa de @Types,
 * que importa env.ts. Sem este mock, env.ts dispara process.exit(1)
 * durante a validação Zod.
 */
vi.mock('@Configs/env.js', () => ({
	env: {
		HASHER_PROVIDER: 'argon2',
	},
}));

import { maskLogDatabaseUsername } from '@Masks';

describe('maskLogDatabaseUsername (Black-Box)', () => {

	describe('Mascaramento bem-sucedido', () => {
		it('deve mascarar a entropia mantendo o contexto (ambiente_servico_permissao_id)', () => {
			const username = 'prd_api_rw_01_aB3dEf9xYz' as DatabaseUsername;
			const masked = maskLogDatabaseUsername(username);
			expect(masked).toBe('prd_api_rw_01_************');
		});

		it('deve mascarar com contexto stg', () => {
			const username = 'stg_cache_adm_02_ZzYyXxWw123' as DatabaseUsername;
			const masked = maskLogDatabaseUsername(username);
			expect(masked).toBe('stg_cache_adm_02_************');
		});

		it('deve mascarar com contexto dev', () => {
			const username = 'dev_session_ro_99_LongEntropy123' as DatabaseUsername;
			const masked = maskLogDatabaseUsername(username);
			expect(masked).toBe('dev_session_ro_99_************');
		});
	});

	describe('Fallback de segurança total', () => {
		it('deve retornar máscara completa se o username tiver menos de 5 partes', () => {
			const username = 'admin' as DatabaseUsername;
			const masked = maskLogDatabaseUsername(username);
			expect(masked).toBe('***********');
		});

		it('deve retornar máscara completa se o username for apenas underscores', () => {
			const username = 'a_b_c' as DatabaseUsername;
			const masked = maskLogDatabaseUsername(username);
			expect(masked).toBe('***********');
		});

		it('deve retornar máscara completa se o username tiver 4 partes', () => {
			const username = 'prd_api_rw_01' as DatabaseUsername;
			const masked = maskLogDatabaseUsername(username);
			expect(masked).toBe('***********');
		});
	});
});
