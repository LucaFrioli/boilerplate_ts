// piis

/**
 * String de 11 caracteres numerais
 */
export const cpf_raw_regexp = /^\d{11}$/;

/**
 * regexEmailFormat
 *
 * Regex pragmática padrão W3C (HTML5): valida a estrutura sem complexidade excessiva
 *
 * ### Alinhamento com Padrões Internacionais
 * - **Padrão W3C (HTML5):** Esta regex implementa estritamente a especificação definida pelo
 *   W3C para o elemento `<input type="email">`. Ela remove intencionalmente a complexidade
 *   obscura da RFC 5322 (como comentários embutidos ou aspas na parte local) para focar na
 *   morfologia real utilizada em 99.9% dos sistemas de produção da web moderna.
 * - **Diretrizes OWASP:** Segue o princípio de validação de entrada defensiva (Input Sanitization)
 *   da OWASP. Ao limitar caracteres permitidos e restrições de vizinhança de hífens/pontos,
 *   ela mitiga riscos de injeção de código (XSS/SQLi) via e-mail e previne vulnerabilidades de
 *   **ReDoS (Regular Expression Denial of Service)**, pois não possui agrupamentos ambíguos ou
 *   loops aninhados que sobrecarregam a CPU do Node.js.
 *
 * ### Exemplos de Strings ACEITAS (Matches)
 * - `usuario.comum@provedor.com` (Caso padrão alfanumérico)
 * - `user+filtro@empresa.com.br` (Permite tags de filtragem com caractere '+')
 * - `dev.ops!#$%&'*+-/=?^_`{|}~@subdominio.infra.local` (Permite caracteres especiais POSIX legítimos na parte local)
 * - `suporte@localhost` (Estrutura de domínio local de nó único)
 * - `a@b.c` (Tamanhos mínimos estruturais válidos)
 *
 * ### Exemplos de Strings REJEITADAS (Non-Matches)
 * - `@dominio.com` (Falta a parte local antes do caractere '@')
 * - `usuario@` (Falta a parte do host/domínio após o caractere '@')
 * - `usuario@dominio-.com` (O subdomínio não pode terminar com hífen `-`)
 * - `usuario@-dominio.com` (O subdomínio não pode começar com hífen `-`)
 * - `usuario..comum@dominio.com` (Não permite pontos consecutivos `..` na parte local)
 * - `usuario@dom_inio.com` (O caractere underscore `_` é proibido na seção de hosts DNS)
 * - `usuario espaço@dominio.com` (Espaços em branco não escapados são estritamente rejeitados)
 */
export const regexEmailFormat =
	/^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;

/**
 * regexUsernameFormat
 *
 * ### Regras de Validação (Morfologia):
 * - **Tamanho Limite:** Entre 3 e 30 caracteres (ancorado de forma segura via lookahead).
 * - **Caracteres Permitidos:** Letras de 'a' a 'z' (case-insensitive), números de 0 a 9,
 *   e os caracteres especiais seguros ponto (`.`), hífen (`-`) e sublinhado (`_`).
 * - **Restrição de Bordas:** É proibido iniciar ou terminar com caracteres especiais. O primeiro
 *   e o último caractere devem ser estritamente alfanuméricos.
 * - **Prevenção de Abuso Estético (Consecutivos):** Os caracteres especiais (`.`, `-`, `_`) não
 *   podem ser repetidos de forma consecutiva (ex: `user__name` ou `user.-name` são rejeitados).
 * - **Segurança contra ReDoS:** Totalmente imune devido ao quantificador limitado e grupos disjuntos.
 *
 * ### Exemplos de Strings ACEITAS (Matches):
 * - `User-ExamPle_02.jhon` (Caso complexo com múltiplos separadores válidos intercalados)
 * - `Ana` (Tamanho mínimo estrutural legítimo de 3 caracteres)
 * - `On3-B1g.USER_strange.F0rmcao-2` (Comprimento máximo e caracteres alfanuméricos ASCII puros)
 *
 * ### Exemplos de Strings REJEITADAS (Non-Matches):
 * - `_jhon` (Começa com caractere especial)
 * - `jhon_` (Termina com caractere especial)
 * - `jh..on` (Contém caracteres especiais repetidos consecutivamente)
 * - `jh` (Tamanho inferior a 3 caracteres)
 * - `F0rmção-2` (Rejeitado: caracteres com acentuação ou cedilha como 'ç' e 'ã' não são permitidos)
 */
export const regexUsernameFormat =
	/^(?=.{3,30}$)([a-zA-Z0-9]([._-](?![._-])|[a-zA-Z0-9]){1,28}[a-zA-Z0-9])$/;
