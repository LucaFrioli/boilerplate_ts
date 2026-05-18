/**
 * @fileoverview Módulo de Fixtures e Dados de Teste Reutilizáveis.
 *
 * ## O que são Fixtures?
 * Fixtures são dados pré-fabricados usados nos testes para representar cenários
 * esperados — usuários válidos, senhas corretas, CPFs válidos, etc.
 * Centralizar aqui evita repetição e facilita manutenção: se o schema mudar,
 * você ajusta apenas este arquivo.
 *
 * ## Como usar:
 * ```ts
 * import { validUserPayload, invalidCpf } from '@tests/helpers/mocks/test.fixtures';
 *
 * it('deve rejeitar CPF inválido', () => {
 *   expect(() => cpfValidationSchema.parse(invalidCpf)).toThrow();
 * });
 * ```
 *
 * ## Regra importante:
 * Fixtures NUNCA devem conter segredos reais. Use dados claramente fictícios.
 * CPFs de teste usam sequências com dígitos verificadores válidos mas números
 * obviamente falsos (ex: 123.456.789-09 é inválido por design).
 */

import type { ValidCPF } from "@/shared/types/pii.types.js";

/**
 * Payload mínimo válido para criar um User via `User.create()`.
 * Todos os campos passam nas validações do User.validation.ts.
 */
export const validCreateUserPayload = {
	username: 'test_user',
	email: 'test@example.com',
	rawPassword: 'Senh@Forte123!',
	cpf: '74448309088' as ValidCPF,
} as const;

/**
 * String que representa um email mal formado.
 * Usado para testar rejeições de validação.
 */
export const invalidEmail = 'isso-nao-e-um-email';

/**
 * Senha deliberadamente fraca — não deve passar em `passwordStrength()`.
 */
export const weakPassword = '123456';

/**
 * Hash Argon2id válido gerado com parâmetros padrão.
 * Usado para testar `isHashedString()` sem precisar gerar um hash real.
 */
export const validArgon2Hash =
	'$argon2id$v=19$m=65536,t=3,p=4$c2FsdHNhbHRzYWx0c2E$hashhashhashhashhashhash';

/**
 * Hash Bcrypt válido no formato `$2b$`.
 * Usado para testar `isHashedString()` com provider Bcrypt.
 */
export const validBcryptHash = '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/lewKyBAzMCLGu8OBu';

/**
 * NanoID válido: 21 chars, apenas chars do alfabeto configurado (A-Z a-z 0-9 - _)
 * Gerado manualmente seguindo o padrão do .env.test (IDENTIFIER_NANOID_SIZE=21, URL-safe alphabet)
 * Nota: cada char pertence ao alfabeto ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_
 */
export const validNanoId: string = 'V1StGXR8_Z5jdHi6Bmyt3'; // 21 chars, todos URL-safe, sem '@' ou chars especiais

/**
 * UUIDv7 válido: identificado pelo nibble '7' no terceiro grupo.
 * Formato: xxxxxxxx-xxxx-7xxx-xxxx-xxxxxxxxxxxx
 */
export const validUuidV7: string = '018e9f3a-1b2c-7d4e-8f5a-6b7c8d9e0f1a';

/**
 * UUIDv4 válido: identificado pelo nibble '4' no terceiro grupo.
 * Formato: xxxxxxxx-xxxx-4xxx-xxxx-xxxxxxxxxxxx
 */
export const validUuidV4: string = 'f47ac10b-58cc-4372-a567-0e02b2c3d479';

// ─── Fixtures de Hosts (para HostValidator) ────────────────────────────────

/** Hosts válidos para cada tipo retornado pelo HostValidator */
export const validHosts = {
	ipv4: '192.168.0.1',
	ipv6: '::1',
	dns: 'sentinel-01.infra.local',
	localhost: 'localhost',
} as const;

/** Hosts inválidos que devem retornar 'invalid' */
export const invalidHosts = ['!!!invalid!!!', '', '192.168.0.1:6379', '-invalid.com', '..dots..'] as const;

// ─── Fixtures de Usernames de Banco de Dados ───────────────────────────────

/**
 * Username válido seguindo a morfologia:
 * `ambiente_servico_permissao_id_entropia`
 * Morfologia regex: /^(prd|stg|dev|tst)_[a-z]{3,}_(ro|rw|adm)_[0-9]{2}_[a-zA-Z0-9\-_.~]{9,}$/
 */
export const validDbUsername = 'tst_api_rw_01_aB3dEf9xYz';

/** Usernames inválidos — cada um viola uma regra diferente da morfologia */
export const invalidDbUsernames = [
	'admin',                     // sem padrão de morfologia
	'',                          // vazio
	'prd_ab_rw_01_aB3dEf9xYz',  // serviço com menos de 3 chars
	'xxx_api_rw_01_aB3dEf9xYz', // ambiente não aceito
	'tst_api_xx_01_aB3dEf9xYz', // permissão não aceita
	'tst_api_rw_1_aB3dEf9xYz',  // id com 1 dígito (precisa 2)
	'tst_api_rw_01_short',       // entropia curta (<9 chars)
] as const;

// ─── Fixtures de Senhas de Banco de Dados ──────────────────────────────────

/** Senha que passa na validação medium (default em dev/test) */
export const validDbPassword = 'Senh@Forte123!';

/** Senha fraca que não passa em nenhum nível */
export const weakDbPassword = 'abc';

// ─── Fixtures de URIs (Sentinel Multi-Host, TCP, Socket) ───────────────────

/** URI Sentinel completa e válida com 3 nós */
export const validSentinelUri =
	'valkey+sentinel://tst_api_rw_01_aB3dEf9xYz:Senh%40Forte123%21@10.0.0.1:26379,10.0.0.2:26379,10.0.0.3:26379/0?sentinelMasterId=mymaster';

/** URI Sentinel sem credenciais */
export const sentinelUriNoAuth =
	'valkey+sentinel://10.0.0.1:26379,10.0.0.2:26379/0?sentinelMasterId=mymaster';

/** URI Sentinel sem sentinelMasterId (deve falhar fatal) */
export const sentinelUriNoMasterId =
	'valkey+sentinel://10.0.0.1:26379,10.0.0.2:26379/0';

/** URI Sentinel com porta fora do range POSIX (deve falhar fatal) */
export const sentinelUriBadPort =
	'valkey+sentinel://10.0.0.1:99999,10.0.0.2:26379/0?sentinelMasterId=mymaster';

/** URI Sentinel com protocolo inválido */
export const sentinelUriBadProtocol =
	'http+sentinel://10.0.0.1:26379,10.0.0.2:26379/0?sentinelMasterId=mymaster';

/** URI TCP single-host válida */
export const validTcpUri = 'valkey://localhost:6379/0';

/** URI TLS single-host válida */
export const validTlsUri = 'valkeys://localhost:6379/0?tls=true';

/** URI com protocolo não aceito */
export const invalidProtocolUri = 'http://localhost:6379/0';
