import { randomUUID } from 'node:crypto';
import BaseIdentityGenerator from '@Id/contracts/IIdentyti.contract.js';

export default class UuidV4Provider extends BaseIdentityGenerator {
	protected get serviceName(): string {
		return 'UuidV4Provider';
	}
	private readonly UUIDV4_REGEX =
		/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

	protected generateLogic(): string {
		return randomUUID();
	}
	protected generateValidation(id: string): boolean {
		if (typeof id !== 'string' || id.length !== 36) {
			this.identityLogger.warn(
				{ serviceName: this.serviceName, valueOfId: id, typeOfValue: typeof id },
				`O id fornecido foi provavelmentte comprometido ou não é do tipo string, ${id}`,
			);
			return false;
		}
		return this.UUIDV4_REGEX.test(id);
	}
}
