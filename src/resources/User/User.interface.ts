import type { DatabaseID, AppID, HashedString } from '@Types';

/**
 * DTO de Domínio e Persistência.
 * Representa o contrato absoluto de dados formadores de um Usuário no Banco de Dados.
 * ATENÇÃO: Contém dados altamente sensíveis (Senhas, CPF). Jamais exportar para o Frontend.
 */
export interface UserI {
	readonly id: DatabaseID;
	readonly publicId: AppID;
	active: boolean;
	username: string;
	email: string;
	passwordHash: HashedString;
	cpf: string;

	//--- Aqqui podemos ver campos que podem ser utilizados em relações 1:1 como o usuário é o pilar da maioria das aplicações e é com base nele que os acessos são concedidos, optei por deixar no boilerplate relação 1:1 nas relações já que cobre 90% dos usos recorrentes em aplicações mais padrões
	//####
	stripeId: string | null;
	walletId: string | null;
	profileId: DatabaseID;

	// --- Auditoria
	readonly createdAt: Date;
	updatedAt: Date | null;
	deletedAt: Date | null;
}

/**
 * DTO de Apresentação (Frontend).
 * Representa a visão dessecada e segura de um Usuário.
 * Dados de auditoria interna e PII (Pessoalmente Identificáveis) foram removidos.
 */
export interface PublicUserI {
	readonly id: AppID;
	username: string;
	email: string;
	active: boolean;
	hasBillingProfile: boolean;
}

/**
 * DTO de Criação (Boundary Contract).
 * Contrato estrito que os Services/Controllers devem preencher para alimentar a Factory (User.create).
 * Exige Senha em texto puro, pois a Fábrica fará a criptografia de forma isolada.
 */
export interface CreateUserExpectedData {
	username: string;
	email: string;
	cpf: string;
	rawPassword: string;
}
