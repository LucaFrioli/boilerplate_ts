import { BaseEntity } from "@Contracts/Entity.contract.js";
import type { UserI, PublicUserI } from "./User.interface.js";
import baseUserSchema from "./User.validation.js";
import type { DeepReadonly } from "@/shared/types/static.types.js";


export class User extends BaseEntity<UserI, PublicUserI> {
	protected entityName: string = 'User';

	protected validate(data: unknown): UserI {

		const user = baseUserSchema.safeParse(data)
		if (!user.success) {
			const messages = user.error.issues.map(issue => issue.message)
			this.handlingUserError('warn', this.entityName, { rawrErrors: user.error, messages: messages }, 'Erro ao tentar validar o usuário');
		}

		return user.data;
	}

	public toPublicDTO(): DeepReadonly<PublicUserI> {
		return {
			id: this.props.publicId,
			username: this.props.username,
			email: this.props.email,
			active: this.props.active,
			hasBillingProfile: this.props.stripeId !== null
		}
	}

}
