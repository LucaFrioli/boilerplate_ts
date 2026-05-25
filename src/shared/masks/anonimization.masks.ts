/**
 * @fileoverview Centralização de mascaras de anomimização para aplicação
 *
 */

import { type DatabaseUsername } from '@Types';
import { env } from '@Configs/env.js';
import { HostValidator } from '@/validations/Host.validations.js';
import type pino from 'pino';

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

/**
 * **masPII**
 *
 * Função dedicada para anonimização de dados pessoais de identificação,
 * Uma das mascaras mais necessárias para poder lidr com anonimização de dados dedicada a
 * informações pessoais dentro dos loggers, esta mascara permite seguir os conformes de
 * anonimização declarados pela GDPR e LGPD, bem como uma gama grande de leis nacionais
 * ou de blocos economicos sobre dados e informações pessoais de clientes.
 */
export function maskPII(rawValue: unknown, logger: pino.Logger): string {
	try {
		String(rawValue);
	} catch (e) {
		logger.error(
			{
				call: 'maskPII',
				typeofRawValue: typeof rawValue,
				error: e,
			},
			'Foi impossível transformar o valor em string',
		);
		throw new Error(
			'Impossível transicionar valor para string, atenção contate um administradorpor meio dos canias legais: ' +
				env.EMAIL_TO_CONTACT,
			{ cause: e },
		);
	}

	const onString = String(rawValue);

	const emailParts = onString.split('@');
	const verifyDomainEmail = emailParts[1] || '';

	if (onString.includes('@') && HostValidator.validateHostType(verifyDomainEmail) === 'DNS') {
		const [user = '', domain = ''] = onString.split('@');

		const repeatCountVerification = Math.max(0, user.length - 2);
		const repeatCount = repeatCountVerification <= 3 ? 3 : repeatCountVerification;
		const endChar = user.length > 1 ? user.substring(user.length - 1) : '';

		const maskedUser = user.substring(0, 1) + '*'.repeat(repeatCount) + endChar;
		return `${maskedUser}@${domain}`;
	}

	if (onString.length <= 4) {
		return onString;
	}

	const repeatCount = Math.max(0, onString.length - 4);
	const endOffset = Math.max(0, onString.length - 2);

	return onString.substring(0, 2) + '*'.repeat(repeatCount) + onString.substring(endOffset);
}
