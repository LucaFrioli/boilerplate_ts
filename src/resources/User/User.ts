import { BaseEntity } from "@Contracts/Entity.contract.js";
import type UserI from "./User.interface.js";


export class User extends BaseEntity<UserI> {

    protected validate(data: unknown): UserI {
        throw new Error("Method validate on User class not implemented.");
    }

}
