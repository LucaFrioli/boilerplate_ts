import * as UserCrud from '../models/user.model';
import { CreateUser, UpdateUser } from './interfaces/user.interfaces';

class UserService {
    // remember to set the body in the initialization
    constructor(body: number | string) {
        // this.body = body;
    }

    /**
     * createUser
     */
    public async createUser(body: CreateUser) {
      // adicionar validações de corpo de requisição e hashing de senha aqui
        this.finalizeTransaction(() => UserCrud.createUser(body));
    }

    private async finalizeTransaction(fn: () => Promise<void>) {
        try {
            await fn();
            await UserCrud.prisma.$disconnect();
        } catch (error) {
            console.log(error);
            await UserCrud.prisma.$disconnect();
            process.exit(1);
        }
    }
}

export default UserService;
