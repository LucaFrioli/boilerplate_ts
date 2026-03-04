import { createChildLogger } from "@Configs/logger.js";
import { env } from "@Configs/env.js";

export interface IIdentity {
    genrate(): string;
    validate(id: string): boolean;
}


export default abstract class BaseIdentityGenerator implements IIdentity {
    protected identityLogger = createChildLogger({ module: 'Identity', fileType: 'core', service: 'generation' })
    protected abstract readonly serviceName: string;

    abstract generateLogic(): string;
    abstract generateValidation(id: string): boolean;

    genrate(): string {
        try {
            const id = this.generateLogic();
            return id;
        } catch (e) {
            this.logFailures('generate', e);
        }
    }

    validate(id: string): boolean {
        try {
            return this.generateValidation(id);
        } catch (e) {
            this.logFailures('validate', e);
        }
    }

    protected logFailures(method: string, error: unknown): never {
        this.identityLogger.error({ method, error, serviceName: this.serviceName }, `Falha cŕitica no módulo de identidade ${this.serviceName}`);
        throw new Error(`Erro interno crítico, contate algum administrador por meio dos canais legais ${env.EMAIL_TO_CONTACT}`);

    }
}
