import { env } from "@Configs/env.js";
import { createChildLogger } from "@Configs/logger.js";

export interface IHasherProvider {
    /**
     * Recebe uma string limpa e retorna o hash gerado.
     * @param payload - O dado sensível (ex: senha)
     */
    generate(payload: string): Promise<string>;

    /**
     * Compara um texto puro com um hash existente.
     * @param payload - O texto enviado pelo usuário
     * @param hashed - O hash recuperado do banco de dados
     */
    compare(payload: string, hashedString: string): Promise<string>
}

export abstract class BaseHasher implements IHasherProvider {
    private hasherLgger = createChildLogger({ module: 'security', fileType: 'util', service: 'hasher' })


    abstract generate(payload: string): Promise<string>
    abstract compare(payload: string, hashedString: string): Promise<string>

    protected handleFatalErrors(error: unknown, method: string): void {
        this.hasherLgger.fatal({ error, method }, `Falha crítica no motor de criptografia no método ${method}`);
        throw new Error(`Erro interno crítico, contate algum administrador por meio dos canais legais ${env.EMAIL_TO_CONTACT}`);
        
    }
}