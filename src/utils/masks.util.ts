/**
 * @fileoverview Centralização de mascaras para aplicação
 *
 */

import { type DatabaseUsername } from '@Types';

/**
 * **maskLogDatabaseUsername**
 *
 * função extritamente necessária para quando for logar
 * strings de conexão ou o username do banco de dados,
 * ela evita vazar usuários, caso atacante tenha acesso aos
 * logs fica mais difícil de obter acesso as credênciais
 */

export function maskLogDatabaseUsername(unmaskedDatabaseUsername: DatabaseUsername): string {
	const parts: string[] = unmaskedDatabaseUsername.split('_');

	// por ventura se algo falhar retornamos  o username completamente mascarado no log
	if (parts.length < 5) return '***********';

	const context = parts.slice(0, 4).join('_');
	return `${context}_************`;
}
