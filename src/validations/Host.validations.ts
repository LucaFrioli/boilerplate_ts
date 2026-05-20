import { isIP } from 'node:net';

/**
 * Classificador estático de tipos de host para validação de infraestrutura de rede.
 *
 * Utilizado como componente atômico
 * para validar individualmente cada nó de uma malha distribuída (ex: Valkey Sentinel),
 * ou um endereço ip.
 *
 * **Características arquiteturais:**
 * - **Zero dependências de projeto** — importa apenas `node:net` (stdlib). Isso o posiciona
 *   como um validador-folha (Level 1 Peer) na pirâmide de dependências da ADR 012.
 * - **Classe estática pura** — sem estado, sem side-effects, sem I/O. Perfeitamente testável.
 * - **Union Type literal** — o retorno `'IPv4' | 'IPv6' | 'DNS' | 'invalid'` permite
 *   pattern matching exaustivo no TypeScript, garantindo que o compilador force o tratamento
 *   de todos os casos possíveis nos consumidores.
 */
export class HostValidator {
	/**
	 * Expressão regular para validação de nomes de domínio conforme RFC 1034 / RFC 1123.
	 *
	 * **Anatomia da regex:**
	 * - `(?=.{1,253}$)` — Lookahead: o domínio completo deve ter entre 1 e 253 caracteres.
	 * - `(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\\.)+` — Cada label (segmento entre pontos)
	 *   deve iniciar e terminar com alfanumérico, com até 61 hifens/alfanuméricos no meio (max 63 chars/label).
	 * - `[a-zA-Z]{2,63}$` — O TLD final deve ser puramente alfabético, com 2 a 63 caracteres.
	 *
	 * **Limitações conhecidas:**
	 * - Não aceita `localhost` (tratado como exceção hardcoded no método público).
	 * - Não aceita domínios terminados em ponto (trailing dot), embora sejam tecnicamente válidos pela RFC.
	 * - Não valida a existência real do domínio (nenhuma resolução DNS é executada).
	 */
	private static dnsRegex =
		/^(?=.{1,253}$)(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,63}$/;

	/**
	 * Classifica o tipo de um host fornecido como string.
	 *
	 * O fluxo de decisão segue uma cascata de especificidade:
	 * 1. Tenta classificar como IP (v4 ou v6) via `node:net.isIP()` — método nativo do Node.js.
	 * 2. Se `isIP` retornar `0` (não é IP), verifica se é `localhost` (exceção de DNS local)
	 *    ou se corresponde à regex RFC 1034 para nomes de domínio.
	 * 3. Se nenhum teste passar, retorna `'invalid'`.
	 *
	 * @example
	 * ```typescript
	 * HostValidator.validateHostType('192.168.0.1');              // 'IPv4'
	 * HostValidator.validateHostType('::1');                       // 'IPv6'
	 * HostValidator.validateHostType('sentinel-01.infra.local');   // 'DNS'
	 * HostValidator.validateHostType('localhost');                  // 'DNS'
	 * HostValidator.validateHostType('!!!invalid!!!');              // 'invalid'
	 * ```
	 *
	 * @param host A string do host a ser classificada (sem porta, sem protocolo).
	 * @returns `'IPv4'` | `'IPv6'` | `'DNS'` | `'invalid'` — union literal para pattern matching.
	 */
	public static validateHostType(host: string): 'IPv4' | 'IPv6' | 'DNS' | 'invalid' {
		const ipVersion = isIP(host);

		if (ipVersion === 4) return 'IPv4';
		if (ipVersion === 6) return 'IPv6';

		// Se for 'localhost', o net.isIP retorna 0, então tratamos como exceção válida de DNS local
		if (host === 'localhost' || this.dnsRegex.test(host)) {
			return 'DNS';
		}

		return 'invalid';
	}
}
