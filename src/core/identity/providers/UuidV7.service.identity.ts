import { randomBytes } from "node:crypto";
import BaseIdentityGenerator from "../contracts/IIdentyti.contract.js";

export default class UuidV7Provider extends BaseIdentityGenerator {
    protected serviceName: string = 'UuidV7Provider';
    private readonly UUIDV7_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

    protected generateLogic(): string {
        // está função contém a lógica a nível de bitwise caso a altere tome muito cuidado!
        const value = randomBytes(16);
        const timestamp = Date.now();

        // sobreescrvemos os primeiros 6 bytes com o timestamp
        value.writeUintBE(timestamp, 0, 6);

        // setamos obrigatoriamente que o sexto byte começe com 7 definindo a verção do UUID
        value[6] = (value[6]! & 0x0f) | 0x70;

        // definimos a regra de inicio para o 8º byte
        value[8] = (value[8]! & 0x3f) | 0x80;

        //retrona o uuid formatado em hexadecimal e válido, literalmente transformamos binário em hexadecimal
        return value.toString('hex').replace(
            /^(.{8})(.{4})(.{4})(.{4})(.{12})$/,
            '$1-$2-$3-$4-$5'
        );
    }
    protected generateValidation(id: string): boolean {
        if (typeof id !== 'string' || id.length !== 36) {
            this.identityLogger.warn({ serviceName: this.serviceName, valueOfId: `${id}`, typeOfValue: typeof id }, `O id fornecido foi provavelmentte comprometido ou não é do tipo string, ${id}`);
            return false;
        }
        return this.UUIDV7_REGEX.test(id);
    }

}