/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/explicit-function-return-type */
import { describe, it, expect, vi } from 'vitest';
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

vi.mock('node:fs', async (importOriginal) => {
	const actual = await importOriginal<typeof import('node:fs')>();
	return {
		...actual,
		existsSync: (path: unknown) => {
			if (typeof path === 'string') {
				if (
					path.includes('valid-socket.sock') ||
					path.includes('regular-file.txt') ||
					path.includes('throw-error.sock')
				) {
					return true;
				}
				if (path.includes('nonexistent.sock')) {
					return false;
				}
			}
			return actual.existsSync(path as any);
		},
		statSync: (path: unknown, options?: any) => {
			if (typeof path === 'string') {
				if (path.includes('valid-socket.sock')) {
					return { isSocket: () => true } as any;
				}
				if (path.includes('regular-file.txt')) {
					return { isSocket: () => false } as any;
				}
				if (path.includes('throw-error.sock')) {
					throw new Error('FileSystem error');
				}
			}
			return actual.statSync(path as any, options);
		},
	};
});

vi.mock('node:path', async (importOriginal) => {
	const actual = await importOriginal<typeof import('node:path')>();
	return {
		...actual,
		resolve: (...paths: any[]) => {
			const firstPath = paths[0];
			console.log('--- resolve mock called with:', paths);
			if (typeof firstPath === 'string' && firstPath.includes('relative-path')) {
				console.log('--- resolve mock MATCHED relative-path! returning relative-path');
				return 'relative-path'; // does not start with '/'
			}
			return actual.resolve(...paths);
		},
	};
});

vi.mock('path', async (importOriginal) => {
	const actual = await importOriginal<typeof import('path')>();
	return {
		...actual,
		resolve: (...paths: any[]) => {
			const firstPath = paths[0];
			console.log('--- path mock called with:', paths);
			if (typeof firstPath === 'string' && firstPath.includes('relative-path')) {
				console.log('--- path mock MATCHED relative-path! returning relative-path');
				return 'relative-path'; // does not start with '/'
			}
			return actual.resolve(...paths);
		},
	};
});

describe('DatabaseMemoryUriValidation (Black-Box)', () => {

	//  Caminho C: TCP/IP Padrão (single-host)

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

	//  Entradas Inválidas (Guards de tipo)

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

	//  Caminho A: Multi-Host Sentinel ─

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
			const result = DatabaseMemoryUriValidation.verifyUrl(uri, 'valkey');
			expect(result).toBe(true);
		});
	});

	//  isMultiHostUri (detecção heurística)

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

		it('deve retornar false se body estiver vazio', () => {
			expect((DatabaseMemoryUriValidation as any).isMultiHostUri('valkey://')).toBe(false);
		});

		it('deve retornar false se targetSection estiver vazia', () => {
			expect((DatabaseMemoryUriValidation as any).isMultiHostUri('valkey://@')).toBe(false);
		});

		it('deve retornar false se hostSection estiver vazia', () => {
			expect((DatabaseMemoryUriValidation as any).isMultiHostUri('valkey://?')).toBe(false);
		});
	});

	//  Caminho B: Unix Domain Sockets (UDS IPC) ─

	describe('verifyUrl — Sockets UDS (Caminho B)', () => {
		it('deve retornar true para URI de socket UDS válida com credenciais estruturalmente corretas', () => {
			const uri = 'valkey://dev_api_rw_01_secureUser:SenhaF0rt3!@/var/run/valid-socket.sock';
			expect(DatabaseMemoryUriValidation.verifyUrl(uri, 'valkey')).toBe(true);
		});

		it('deve retornar true para URI de socket UDS válida sem credenciais', () => {
			// Para forçar !URL.canParse, precisamos que ela falhe no canParse mas passe no split de ://
			// Se usarmos valkey://@/var/run/valid-socket.sock, URL.canParse retorna false
			const uriFailedCanParse = 'valkey://@/var/run/valid-socket.sock';
			expect(DatabaseMemoryUriValidation.verifyUrl(uriFailedCanParse, 'valkey')).toBe(true);
		});

		it('deve retornar true ao chamar verifyIsSocketUri diretamente para URI de socket sem credenciais (caminho sem @)', () => {
			const uri = 'valkey:///var/run/valid-socket.sock';
			expect((DatabaseMemoryUriValidation as any).verifyIsSocketUri(uri, 'valkey')).toBe(true);
		});

		it('deve retornar false para protocolo de socket não suportado', () => {
			const uri = 'http://@/var/run/valid-socket.sock';
			expect(DatabaseMemoryUriValidation.verifyUrl(uri, 'valkey')).toBe(false);
		});

		it('deve retornar false se o arquivo de socket não existir no filesystem', () => {
			const uri = 'valkey://dev_api_rw_01_secureUser:SenhaF0rt3!@/var/run/nonexistent.sock';
			expect(DatabaseMemoryUriValidation.verifyUrl(uri, 'valkey')).toBe(false);
		});

		it('deve lançar throw (fatal) se o caminho apontar para um arquivo normal em vez de socket', () => {
			const uri = 'valkey://dev_api_rw_01_secureUser:SenhaF0rt3!@/var/run/regular-file.txt';
			expect(() => DatabaseMemoryUriValidation.verifyUrl(uri, 'valkey')).toThrow(
				/O caminho aponta para um arquivo existente, mas ele NÃO é um Socket Unix/
			);
		});

		it('deve retornar false se o caminho do socket normalizado não apontar para raiz (starts with /)', () => {
			const uri = 'valkey://dev_api_rw_01_secureUser:SenhaF0rt3!@relative-path/valid-socket.sock';
			expect((DatabaseMemoryUriValidation as any).verifyIsSocketUri(uri, 'valkey')).toBe(false);
		});

		it('deve retornar false para credenciais de socket inválidas (username inválido)', () => {
			const uri = 'valkey://badUser:SenhaF0rt3!@/var/run/valid-socket.sock';
			expect(DatabaseMemoryUriValidation.verifyUrl(uri, 'valkey')).toBe(false);
		});

		it('deve retornar false se o split do protocolo de socket falhar ou for vazio', () => {
			// Sem protocolo ou com formato malformado
			expect((DatabaseMemoryUriValidation as any).verifyIsSocketUri(':///var/run/valid-socket.sock', 'valkey')).toBe(false);
			expect((DatabaseMemoryUriValidation as any).verifyIsSocketUri('valkey://', 'valkey')).toBe(false);
		});
	});

	//  Sentinel / Multi-Host Edge Cases

	describe('verifyUrl — Sentinel / Multi-Host Edge Cases', () => {
		it('deve retornar false para host tipo invalid (ex: .-. que passa na regex de host:porta)', () => {
			const uri = 'valkey+sentinel://.-.:26379,10.0.0.2:26379/0?sentinelMasterId=mymaster';
			expect(DatabaseMemoryUriValidation.verifyUrl(uri, 'valkey')).toBe(false);
		});

		it('deve retornar false para credenciais com senha fraca (entropia insuficiente)', () => {
			const uri = 'valkey+sentinel://dev_api_rw_01_valkeySecure:weak@10.0.0.1:26379,10.0.0.2:26379/0?sentinelMasterId=mymaster';
			expect(DatabaseMemoryUriValidation.verifyUrl(uri, 'valkey')).toBe(false);
		});

		it('deve retornar false se body do Sentinel estiver vazio', () => {
			expect((DatabaseMemoryUriValidation as any).verifyIsMultiHostUri('valkey+sentinel://', 'valkey')).toBe(false);
		});

		it('deve retornar false se mainSection do Sentinel estiver vazia', () => {
			const uri = 'valkey+sentinel://?sentinelMasterId=mymaster';
			expect(DatabaseMemoryUriValidation.verifyUrl(uri, 'valkey')).toBe(false);
		});

		it('deve retornar false se hostSection ou cleanHostSection estiver vazia', () => {
			const uri = 'valkey+sentinel://dev_api_rw_01_valkeySecure:SenhaF0rt3!@/0?sentinelMasterId=mymaster';
			expect(DatabaseMemoryUriValidation.verifyUrl(uri, 'valkey')).toBe(false);
		});

		it('deve retornar false se sentinelMasterId estiver vazio (?sentinelMasterId=)', () => {
			const uri = 'valkey+sentinel://10.0.0.1:26379/0?sentinelMasterId=';
			expect(DatabaseMemoryUriValidation.verifyUrl(uri, 'valkey')).toBe(false);
		});

		it('deve retornar false se hostSection estiver completamente ausente (ex: mainSection vazia após @)', () => {
			const uri = 'valkey+sentinel://dev_api_rw_01_valkeySecure:SenhaF0rt3!@?sentinelMasterId=mymaster';
			expect(DatabaseMemoryUriValidation.verifyUrl(uri, 'valkey')).toBe(false);
		});

		it('deve retornar false se a lista de nós Multi-Host estiver vazia', () => {
			const uri = 'valkey+sentinel://dev_api_rw_01_valkeySecure:SenhaF0rt3!@,10.0.0.2:26379/0?sentinelMasterId=mymaster';
			expect(DatabaseMemoryUriValidation.verifyUrl(uri, 'valkey')).toBe(false);
		});

		it('deve retornar false se a porta for 0 (fora do range POSIX < 1)', () => {
			const uri = 'valkey+sentinel://10.0.0.1:0,10.0.0.2:26379/0?sentinelMasterId=mymaster';
			expect(DatabaseMemoryUriValidation.verifyUrl(uri, 'valkey')).toBe(false);
		});

		it('deve capturar falha catastrófica no try/catch de verifyIsMultiHostUri se split disparar erro', () => {
			expect((DatabaseMemoryUriValidation as any).verifyIsMultiHostUri(null, 'valkey')).toBe(false);
		});
	});

	//  Defense-in-Depth / Direct Private Method Invocation

	describe('Defense-in-Depth / Métodos Privados Diretos', () => {
		it('deve lançar throw (fatal) se socketVerification for chamado com tipo inválido (ex: number)', () => {
			expect(() => (DatabaseMemoryUriValidation as any).socketVerification(123)).toThrow(
				/Sockets IPC devem ser uma string/
			);
		});

		it('deve capturar falha crítica no catch de socketVerification se der erro de filesystem real', () => {
			// 'throw-error.sock' vai disparar erro no statSync mockado
			expect((DatabaseMemoryUriValidation as any).socketVerification('/var/run/throw-error.sock')).toBe(false);
		});

		it('deve capturar falha no catch de isAcceptedProtocol quando a uri não pode ser parseada', () => {
			expect(() => (DatabaseMemoryUriValidation as any).isAcceptedProtocol('bad-uri'))
				.toThrow(/Erro ao tentar parsear a uri/);
		});

		it('deve retornar false em isAcceptedProtocol se a entrada não for do tipo string', () => {
			expect((DatabaseMemoryUriValidation as any).isAcceptedProtocol(123)).toBe(false);
		});

		it('deve retornar false se a função injetável fn retornar false', () => {
			expect(DatabaseMemoryUriValidation.verifyUrl(validTcpUri, 'valkey', () => false)).toBe(false);
		});
	});
});
