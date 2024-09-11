import { PrismaClient, User } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Expected user type object is ;
 *
 * {
 *   userName: 'Jhon Doe',
 *   email: 'jhonDoe@teste.com',
 *   isAdmin: false, (or true in some cases)
 *   isPrimary: true, (or false in some cases)
 *   cellphone: null, (or a string cellphone number)
 *   password: 'teste123',
 *   personID: null, (or a number of index)
 * }
 */
const createUser = async (user: Omit<User, 'id' | 'createAt'>) => {
    await prisma.user.create({
        data: user,
    });
};

const getAllUsers = async () => {
    const usersList = await prisma.user.findMany();
    return usersList;
};

const getUserByUsername = async (username: string) => {
    const user = await prisma.user.findUnique({
        where: {
            userName: username,
        },
    });

    return user;
};

const getUserById = async (id: number) => {
    const user = await prisma.user.findUnique({
        where: {
            id,
        },
    });

    return user;
};

const updateUser = async (
    id: number,
    data: Partial<Omit<User, 'id' | 'createAt' | 'personID'>>
) => {
    await prisma.user.update({
        where: {
            id,
        },
        data: data,
    });
};

const deleteUser = async (id: number) => {
    await prisma.user.delete({
        where: {
            id,
        },
    });
};

export {
    createUser,
    getAllUsers,
    getUserByUsername,
    getUserById,
    updateUser,
    deleteUser,
    prisma,
};
