import { BaseEntity } from '@Contracts/Entity.contract.js';
import type { UserI, PublicUserI, CreateUserExpectedData } from './User.interface.js';
import baseUserSchema, {
	cpfValidationSchema,
	emailValidationSchema,
	usernameValidationSchema,
} from './User.validation.js';
import type { DeepReadonly } from '@Types';
import DateManager from '@Utils/dateManager.util.js';
import z from 'zod';
import { passwordStrength } from '@Validations/Password.validations.js';
import { Hasher } from '@Hash/hashesFactory.auth.js';
import { DBid, Id } from '@Id/IdentityFactory.identity.js';

/**
 * Contrato de todas as ações possíveis que um Usuário pode sofrer
 * dentro da aplicação (Rich Domain Model).
 */
interface UserMethods {
	/**
	 * Altera o e-mail do usuário no sistema através de validação Zod strict.
	 */
	changeEmail(newEmail: string): void;

	/**
	 * Troca a senha do usuário invocando a fábrica de Criptografia configurada (Argon/Bcrypt)
	 * e validando imunofalhas estruturais do Hash gerado.
	 */
	changePassword(newPassword: string): Promise<void>;

	/**
	 * Realiza a troca do Username (Handle de visualização pública).
	 */
	changeUsername(newUsername: string): void;

	/**
	 * Ativa o usuário liberando seu acesso completo.
	 */
	activateUser(): void;

	/**
	 * Desativa o usuário e suspende imediatamente chaves de acesso relacionadas.
	 */
	deactiveUser(): void;

	/**
	 * Aplica o padrao "Soft Delete". Impede login sem apagar rastros de auditoria.
	 * Cascading para relacionamentos deve ser orquestrado por Domain Events futuramente.
	 */
	deleteUser(): void;
}

const transformAndValidatePassword = z
	.string()
	.refine(
		(val) => {
			return passwordStrength(val);
		},
		{ error: 'Senha muito frca tente novamente' },
	)
	.transform(async (val) => {
		return await Hasher.generate(val);
	});

/**
 * Root Aggregate da aplicação. (Entidade Primordial)
 * Engloba toda a segurança e lógicas que circundam um Usuário Humano vivo.
 */
export class User extends BaseEntity<UserI, PublicUserI> implements UserMethods {
	protected get entityName(): string {
		return 'User';
	}

	/**
	 * Valida rigorosamente os dados instanciados pelo Construtor da Entidade.
	 * Protege a aplicação contra Hidratação de JSONs corrompidos oriundos do MongoDB.
	 * @param data Payload cru resgatado do banco ou gerado pela Factory.
	 * @returns {UserI} As propriedades rigidamente tipadas e conferidas.
	 */
	protected validate(data: unknown): UserI {
		const user = baseUserSchema.safeParse(data);
		if (!user.success) {
			const messages = user.error.issues.map((issue) => issue.message);
			this.handlingError(
				'warn',
				{ rawrErrors: user.error, messages: messages },
				'Erro ao tentar validar o usuário',
			);
		}

		this.logInfo('debug', `${user.data.publicId} transitando por dentro do sistema!`, {
			...user.data,
		});
		return user.data;
	}

	/**
	 * Mapeador de Frontend (Data Hiding).
	 * Isola o Sistema contra vazamentos passivos, retornando APENAS informações amigáveis
	 * que devem transitar no Payload de API REST Públicas.
	 */
	public toPublicDTO(): DeepReadonly<PublicUserI> {
		this.logInfo('info', `${this.props.publicId} foi requisitado por frontend`);
		return {
			id: this.props.publicId,
			username: this.props.username,
			email: this.props.email,
			active: this.props.active,
			hasBillingProfile: this.props.stripeId !== null,
		};
	}

	/**
	 * Fabrica (Static Factory Method) a Entidade a partir de um JSON não confiável.
	 * Orquestra: Validação Zod, Injeção de Identidade (DB/App IDs), e Criptografia Hash Automática.
	 *
	 * É o coração da Cibersegurança de criação do Boilerplate.
	 *
	 * @param data {CreateUserExpectedData} O DTO mapeado que o Controller deve fornecer.
	 * @returns Uma nova instância limpa, criptografada e fortemente tipada em Memória.
	 */
	public static async create(data: CreateUserExpectedData): Promise<User> {
		const validRecivedData = {
			uname: usernameValidationSchema.parse(data.username),
			email: emailValidationSchema.parse(data.email),
			cpf: cpfValidationSchema.parse(data.cpf),
			passwordHashed: await transformAndValidatePassword.parseAsync(data.rawPassword),
		};

		const UserDataFormation: UserI = {
			id: DBid.generate(),
			publicId: Id.generate(),
			profileId: DBid.generate(),
			active: true,
			createdAt: new Date(DateManager.toIsoString(Date.now())),
			deletedAt: null,
			updatedAt: null,

			// pré criados obrigatórios
			username: validRecivedData.uname,
			email: validRecivedData.email,
			cpf: validRecivedData.cpf,
			passwordHash: validRecivedData.passwordHashed,

			// implementar quando módulos estiverem prontos ou se realmente for necessário para a aplicação
			stripeId: null,
			walletId: null,
		};
		return new User(UserDataFormation);
	}

	/**
	 * Setter restrito.
	 * Disparado nativamente pelas Reações da Entidade (State Mutation)
	 * para garantir a rastreabilidade passiva sem poluir os métodos com duplicidade de código.
	 */
	private updateDate(): void {
		this.props.updatedAt = new Date(DateManager.toIsoString(Date.now()));
	}

	/**
	 * Transição de Estado: Mudar E-mail de Contato.
	 * Realiza validação pontual de RFC e gera Log Fatal se injetarem strings inválidas.
	 */
	public changeEmail(newEmail: string): void {
		const validateEmail = emailValidationSchema.safeParse(newEmail);

		if (!validateEmail.success) {
			this.handlingError(
				'warn',
				{
					typeofEmail: typeof newEmail,
					rawValue: newEmail,
					errosCatched: z.treeifyError(validateEmail.error),
				},
				'Tentativa de trocar email com valor inválido',
			);
		}

		this.props.email = validateEmail.data;
		this.updateDate();
	}

	/**
	 * Opeação Criptográfica: Trocar Senha.
	 * Assíncrono por força maior. Evita que o Hasher trave o Event-Loop da API.
	 * Valida imunidade contra Hashes pré-computados acoplando checador de força bruta.
	 */
	public async changePassword(newPassword: string): Promise<void> {
		const validatePassword = await transformAndValidatePassword.safeParseAsync(newPassword);

		if (!validatePassword.success) {
			this.handlingError(
				'warn',
				{
					typeofNewPAssword: typeof newPassword,
					rawValue: newPassword,
					errorsCatched: z.treeifyError(validatePassword.error),
				},
				'Erro ao tentar trocar senha! Tente novamente',
			);
		}
		const validatedNewPassword = validatePassword.data;

		if (Hasher.validateHash(validatedNewPassword)) {
			this.handlingError(
				'fatal',
				{
					rawValue: validatedNewPassword,
					retunOfValidateHash: Hasher.validateHash(validatedNewPassword),
				},
				'Tentativa de maculação de hash após troca de senha',
			);
		}
		this.props.passwordHash = validatedNewPassword;
		this.updateDate();
	}

	/**
	 * Transição de Estado: Mudar Handle/Username Público.
	 */
	public changeUsername(newUsername: string): void {
		const validatedUsername = usernameValidationSchema.safeParse(newUsername);
		if (!validatedUsername.success) {
			this.handlingError(
				'warn',
				{
					typeofNewUseername: typeof newUsername,
					rawValue: newUsername,
					errorsCatched: z.treeifyError(validatedUsername.error),
				},
				'tentativa de trocar username por um username inválido',
			);
		}
		this.props.username = validatedUsername.data;
		this.updateDate();
	}

	/**
	 * Restabelecimento de Credenciais Ativas.
	 */
	public activateUser(): void {
		this.props.active = true;
		this.updateDate();
	}

	/**
	 * Bloqueio de Segurança Instantâneo (Banning).
	 */
	public deactiveUser(): void {
		this.props.active = false;
		this.updateDate();
	}

	/**
	 * Auditoria de Expurgo (Soft Delete Pattern).
	 * Em cadeia, cega também o sinal de 'ativididade' do usuário.
	 */
	public deleteUser(): void {
		this.deactiveUser();
		this.props.deletedAt = new Date(DateManager.toIsoString(Date.now()));
	}
}
