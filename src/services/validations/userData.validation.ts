import { User } from '../interfaces/user.interfaces';
import * as fildsValidation from '../validations/fields.validations';

interface OutputInfo {
    flag: boolean;
    errors: string[];
}

const userValidationSchema = fildsValidation.z.object({
    id: fildsValidation.z.number(),
    userName: fildsValidation.usernameSchema,
    email: fildsValidation.emailSchema,
    password: fildsValidation.passwordSchema,
    createAt: fildsValidation.dateSchema,
    isAdmin: fildsValidation.booleanSchema,
    isPrimary: fildsValidation.booleanSchema,
    cellphone: fildsValidation.cellphoneSchema,
    personID: fildsValidation.z.number(),
});

export default class VelidateEntryUserData {
    private data: any;
    public outputInfo: OutputInfo = {
        errors: [],
        flag: true,
    };

    constructor(data: Partial<User>, errors: string[]) {
        this.data = data;
        this.outputInfo.errors = errors;
    }

    public validateGettedUser() {
        const validUser = userValidationSchema.safeParse(this.data);
        this.outputInfo.flag = validUser.success;
        if (!this.outputInfo.flag) {
            const errors = validUser.error?.format();

            // Iterando sobre os erros e adicionando ao array
            for (const field in errors) {
                this.outputInfo.errors.push(errors[field].message);
            }
        }
    }
}
const arrayDeTeste: string[] = [];

const teste = new VelidateEntryUserData(
    {
        cellphone: 'teste',
    },
    arrayDeTeste
);
teste.validateGettedUser();

console.log('Este é o output : \n', teste.outputInfo);
