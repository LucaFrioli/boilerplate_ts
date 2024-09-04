interface User {
    id: number;
    userName: string;
    email: string;
    password: string;
    createAt: Date;
    isAdmin: boolean;
    isPrimary: boolean;
    cellphone: string | null;
    personID: number | null;
}
interface CreateUser {
    userName: string;
    email: string;
    password: string;
    isAdmin: boolean;
    isPrimary: boolean;
    cellphone: string | null;
    personID: number | null;
}

interface UpdateUser {
    userName?: string;
    email?: string;
    password?: string;
    isAdmin?: boolean;
    isPrimary?: boolean;
    cellphone?: string | null;
}

export { User, CreateUser, UpdateUser };
