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

interface UserMethods {
	changeEmail(newEmail: string): void;
	changePassword(newPassword: string): Promise<void>;
	changeUsername(newUsername: string): void;
	activateUser(): void;
	/**
	 * Usado para desativar user
	 */
	deactiveUser(): void;
	/**
	 * Usado para realizar o safe delete, este método altera a data deletedAt
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

export class User extends BaseEntity<UserI, PublicUserI> implements UserMethods {
	protected get entityName(): string {
		return 'User';
	}

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

	public toPublicDTO(): DeepReadonly<PublicUserI> {
		this.logInfo('debug', `${this.props.publicId} foi requisitado por frontend`);
		return {
			id: this.props.publicId,
			username: this.props.username,
			email: this.props.email,
			active: this.props.active,
			hasBillingProfile: this.props.stripeId !== null,
		};
	}

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

	private updateDate(): void {
		this.props.updatedAt = new Date(DateManager.toIsoString(Date.now()));
	}

	public changeEmail(newEmail: string): void {
		const validateEmail = z
			.object({
				email: z.email({ error: 'o email deve ser válido, tente novamente!' }).nonempty(),
			})
			.safeParse(newEmail);

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

		this.props.email = validateEmail.data.email;
		this.updateDate();
	}

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
				'tentativa de trocar senha para uma senha inválida',
			);
		}
		this.props.username = validatedUsername.data;
		this.updateDate();
	}

	public activateUser(): void {
		this.props.active = true;
		this.updateDate();
	}

	public deactiveUser(): void {
		this.props.active = false;
		this.updateDate();
	}

	public deleteUser(): void {
		this.deactiveUser();
		this.props.deletedAt = new Date(DateManager.toIsoString(Date.now()));
	}
}
