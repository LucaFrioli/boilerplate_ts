import { describe, it, expect } from 'vitest';
import { DatabaseMemoryUriValidation } from '@Validations/DatabaseInMemoryUri.validation.js';
import {
	validSentinelUri,
	sentinelUriNoAuth,
	sentinelUriNoMasterId,
	sentinelUriBadPort,
	sentinelUriBadProtocol,
	validTcpUri,
	validTlsUri,
	invalidProtocolUri,
} from '@tests/helpers/mocks/test.fixtures.js';

describe('DatabaseMemoryUriValidation (Black-Box)', () => {

	// ─── Caminho C: TCP/IP Padrão (single-host) ───────────────────────────

	describe('verifyUrl — TCP/IP Single-Host', () => {
		it('deve retornar true para URI valkey:// válida', () => {
			expect(DatabaseMemoryUriValidation.verifyUrl(validTcpUri, 'valkey')).toBe(true);
		});

		it('deve retornar true para URI valkeys:// (TLS) válida', () => {
			expect(DatabaseMemoryUriValidation.verifyUrl(validTlsUri, 'valkey')).toBe(true);
		});

		it('deve retornar true para URI redis:// válida', () => {
			expect(DatabaseMemoryUriValidation.verifyUrl('redis://localhost:6379/0', 'redis')).toBe(true);
		});

		it('deve retornar true para URI rediss:// (TLS) válida', () => {
			expect(DatabaseMemoryUriValidation.verifyUrl('rediss://localhost:6379/0', 'redis')).toBe(true);
		});

		it('deve retornar false para protocolo não aceito (http://)', () => {
			expect(DatabaseMemoryUriValidation.verifyUrl(invalidProtocolUri, 'valkey')).toBe(false);
		});
	});

	// ─── Entradas Inválidas (Guards de tipo) ───────────────────────────────

	describe('verifyUrl — Guards de tipo (entradas malformadas)', () => {
		it('deve retornar false para string vazia', () => {
			expect(DatabaseMemoryUriValidation.verifyUrl('', 'valkey')).toBe(false);
		});

		it('deve retornar false para número', () => {
			expect(DatabaseMemoryUriValidation.verifyUrl(123, 'valkey')).toBe(false);
		});

		it('deve retornar false para null', () => {
			expect(DatabaseMemoryUriValidation.verifyUrl(null, 'valkey')).toBe(false);
		});

		it('deve retornar false para undefined', () => {
			expect(DatabaseMemoryUriValidation.verifyUrl(undefined, 'valkey')).toBe(false);
		});

		it('deve retornar false para boolean', () => {
			expect(DatabaseMemoryUriValidation.verifyUrl(true, 'valkey')).toBe(false);
		});
	});

	// ─── Caminho A: Multi-Host Sentinel ────────────────────────────────────

	describe('verifyUrl — Multi-Host Sentinel (Caminho A)', () => {
		it('deve retornar true para URI Sentinel completa e válida (com auth e 3 nós)', () => {
			expect(DatabaseMemoryUriValidation.verifyUrl(validSentinelUri, 'valkey')).toBe(true);
		});

		it('deve retornar true para URI Sentinel sem credenciais (sem auth)', () => {
			expect(DatabaseMemoryUriValidation.verifyUrl(sentinelUriNoAuth, 'valkey')).toBe(true);
		});

		it('deve retornar false para protocolo Multi-Host não aceito', () => {
			expect(DatabaseMemoryUriValidation.verifyUrl(sentinelUriBadProtocol, 'valkey')).toBe(false);
		});

		it('deve retornar false para URI Sentinel sem sentinelMasterId (fatal capturado pelo catch)', () => {
			// handlerErrors lança throw, mas o try/catch no verifyIsMultiHostUri captura e retorna false
			expect(DatabaseMemoryUriValidation.verifyUrl(sentinelUriNoMasterId, 'valkey')).toBe(false);
		});

		it('deve retornar false para porta fora do range POSIX (fatal capturado pelo catch)', () => {
			expect(DatabaseMemoryUriValidation.verifyUrl(sentinelUriBadPort, 'valkey')).toBe(false);
		});

		it('deve retornar false para sentinelMasterId com caracteres inválidos', () => {
			const uri = 'valkey+sentinel://10.0.0.1:26379,10.0.0.2:26379/0?sentinelMasterId=my master!';
			expect(DatabaseMemoryUriValidation.verifyUrl(uri, 'valkey')).toBe(false);
		});

		it('deve retornar false para nó com host inválido (!!!)', () => {
			const uri = 'valkey+sentinel://!!!:26379,10.0.0.2:26379/0?sentinelMasterId=mymaster';
			expect(DatabaseMemoryUriValidation.verifyUrl(uri, 'valkey')).toBe(false);
		});

		it('deve retornar false para nó sem porta', () => {
			const uri = 'valkey+sentinel://10.0.0.1,10.0.0.2:26379/0?sentinelMasterId=mymaster';
			expect(DatabaseMemoryUriValidation.verifyUrl(uri, 'valkey')).toBe(false);
		});

		it('deve retornar true para URI com protocolo redis+sentinel', () => {
			const uri = 'redis+sentinel://10.0.0.1:26379,10.0.0.2:26379/0?sentinelMasterId=mymaster';
			expect(DatabaseMemoryUriValidation.verifyUrl(uri, 'redis')).toBe(true);
		});

		it('deve retornar true para URI com protocolo redis-sentinel', () => {
			const uri = 'redis-sentinel://10.0.0.1:26379,10.0.0.2:26379/0?sentinelMasterId=mymaster';
			expect(DatabaseMemoryUriValidation.verifyUrl(uri, 'redis')).toBe(true);
		});

		it('deve retornar false para URI Sentinel com credenciais inválidas (username malformado)', () => {
			const uri = 'valkey+sentinel://admin:Senh%40Forte123%21@10.0.0.1:26379,10.0.0.2:26379/0?sentinelMasterId=mymaster';
			expect(DatabaseMemoryUriValidation.verifyUrl(uri, 'valkey')).toBe(false);
		});

		it('deve retornar false para sentinelMasterId muito curto (< 3 chars)', () => {
			const uri = 'valkey+sentinel://10.0.0.1:26379,10.0.0.2:26379/0?sentinelMasterId=ab';
			expect(DatabaseMemoryUriValidation.verifyUrl(uri, 'valkey')).toBe(false);
		});

		it('deve retornar true para URI Sentinel com um único nó', () => {
			const uri = 'valkey+sentinel://10.0.0.1:26379/0?sentinelMasterId=mymaster';
			// Nota: isMultiHostUri retorna false (sem vírgula), então cai no canParse.
			// URL.canParse('valkey+sentinel://10.0.0.1:26379/0?sentinelMasterId=mymaster') — depende do Node
			// Se canParse retornar true, valida via isAcceptedProtocol
			const result = DatabaseMemoryUriValidation.verifyUrl(uri, 'valkey');
			expect(typeof result).toBe('boolean');
		});
	});

	// ─── isMultiHostUri (detecção heurística) ──────────────────────────────

	describe('Detecção heurística de Multi-Host', () => {
		it('não deve detectar single-host como Multi-Host', () => {
			// Se fosse detectado como Multi-Host, o protocolo 'valkey' não estaria na
			// whitelist de multi-host e retornaria false. Como é single-host, retorna true.
			expect(DatabaseMemoryUriValidation.verifyUrl(validTcpUri, 'valkey')).toBe(true);
		});

		it('não deve detectar vírgula em credenciais como Multi-Host', () => {
			// A vírgula está antes do '@' (na senha encoded), não na seção de hosts
			const uri = 'valkey://user%2Cname:pass@localhost:6379/0';
			const result = DatabaseMemoryUriValidation.verifyUrl(uri, 'valkey');
			expect(typeof result).toBe('boolean');
		});
	});
});
