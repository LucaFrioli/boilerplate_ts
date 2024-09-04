import * as UserCrud from '../models/user.model';
import { User, CreateUser, UpdateUser } from './interfaces/user.interfaces';

class UserService {
    private body: User | null = null;
    private user: User | null = null;
    private id: number = -1;

    // remember to set the body in the initialization
    constructor() {}

    //getters

    public async getUser(username: string) {
        try {
            const user = await this.getUserByUsername(username);
            return user;
        } catch (e) {
            console.error(e);
            process.exit(0);
        }
    }

    public getId() {
        if (this.id > 0) {
            return this.id;
        }
    }

    public getBody() {
        return this.body;
    }

    // setters

    private setId(id: number) {
        this.id = id;
    }

    private setBody(body: User) {
        this.body = body;
    }

    /**
     * createUser
     */
    public async createUser(body: CreateUser): Promise<void> {
        // adicionar validações de corpo de requisição e hashing de senha aqui
        try {
            await UserCrud.createUser(body);
            const username = body.userName;
            console.log(
                'Ususário criado com sucesso! Segue as informações : \n',
                await this.getUser(username)
            );
        } catch (e) {
            console.error(e);
            process.exit(0);
        }
    }

    /**
     * getUserByUsername
     */
    public async getUserByUsername(username: string): Promise<User> {
        try {
            const user = await UserCrud.getUserByUsername(username);
            if (!user) {
                throw new Error('Usuário não encontrado !');
            }
            this.setId(user.id);
            return user;
        } catch (e) {
            console.error(e);
            process.exit(0);
        }
    }

    /**
     * updateUser
     */
    public async updateUser(
        id: number,
        body: Partial<Omit<User, 'id' | 'createAt' | 'personID'>>
    ) {
        try {
            await UserCrud.updateUser(id, body);
        } catch (e) {
            console.error(e);
            process.exit(0);
        }
    }

    /**
     * finalizeTransaction
     *
     * If there is a need to better control database connections and disconnections,
     * simply use the following method as follows:
     *
     * this.finalizeTransaction(() => UserCrud.createUser(body));
     *
     * @param {Promise<void>} fn
     * @returns {void}
     */
    private async finalizeTransaction(fn: () => Promise<void>): Promise<void> {
        try {
            await UserCrud.prisma.$connect();
            await fn();
        } catch (error) {
            console.log(error);
            process.exit(0);
        } finally {
            await UserCrud.prisma.$disconnect();
        }
    }
}

export default UserService;
