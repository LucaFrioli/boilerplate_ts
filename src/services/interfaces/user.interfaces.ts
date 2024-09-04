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

export { CreateUser, UpdateUser };
