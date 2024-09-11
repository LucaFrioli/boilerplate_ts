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
    cellphone: fildsValidation.cellphoneSchema.optional(),
    personID: fildsValidation.z.number().optional(),
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
            const errors: any = validUser.error?.format();

            console.log(errors);

            // Iterando sobre os erros e adicionando ao array
            for (const field in errors) {
                this.outputInfo.errors.push(errors[field]._errors);
            }
            this.organizeErrors(this.outputInfo.errors);
        }
    }

    private organizeErrors(arr: string[]) {
        let temp: any = [];
        arr.forEach((el) => {
            if (el) {
                temp.push(...el);
            }
        });
        this.outputInfo.errors = temp;
    }
}
