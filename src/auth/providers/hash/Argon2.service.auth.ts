import { BaseHasher } from "@Auth/contracts/IHasher.contract.js";
import { argon2id, hash, verify, type Options as ArgonOptions } from 'argon2';
import { env } from "@Configs/env.js";
import { randomBytes } from "node:crypto";

export default class Argon2Provider extends BaseHasher {
    protected ServiceName: string = 'Argon2Provider';

    private argonConfigs: ArgonOptions = {
        type: argon2id,

        memoryCost: env.HASHER_MEMORY_COST,
        timeCost: env.HASHER_TIME_COST,
        parallelism: env.HASHER_PARALLELISM,

        secret: Buffer.from(env.HASHER_SECURITY_PEPPER),
        hashLength: env.HASHER_LENGTH,

        salt: randomBytes(env.HASHER_SALT_LENGTH)
    };

    protected async executeHash(payload: string): Promise<string> {
        const result = await hash(payload, {
            ...this.argonConfigs,
            salt: randomBytes(env.HASHER_SALT_LENGTH)
        });
        return result;
    }


    public async executeCompare(payload: string, hashedString: string): Promise<boolean> {
        return await verify(hashedString, payload, {
            secret: this.argonConfigs.secret
        })

    }
}