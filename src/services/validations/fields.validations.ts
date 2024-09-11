import { z } from 'zod';
import { parsePhoneNumberFromString } from 'libphonenumber-js';

const validatePhoneNumber = (value: string): boolean => {
    try {
        const phoneNumber: any = parsePhoneNumberFromString(value);
        return phoneNumber.isValid();
    } catch (error) {
        return false;
    }
};

// teste com zod

const emailSchema = z.string().email({ message: 'Email inválido !' });
const cellphoneSchema = z
    .string()
    .refine(validatePhoneNumber, { message: 'Telefone inválido !' });
const booleanSchema = z.boolean({
    message: 'Defina um valor válido entre verdadeiro ou falso!',
});
const dateSchema = z
    .string()
    .datetime({ message: 'Entre com uma data válida !' });
const usernameSchema = z
    .string()
    .min(7)
    .max(25)
    .regex(/^[a-zA-Z0-9]+$/, {
        message: 'O nome de usuário deve conter apenas letras e números.',
    });
const passwordSchema = z
    .string()
    .min(5, { message: 'A senha deve ter pelomenos 5 caracteres' })
    .max(50, { message: 'A senha deve ter pelomenos 50 caracteres.' })
    .regex(
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]+$/,
        {
            message:
                'A senha deve conter pelo menos uma letra maiúscula, uma minúscula, um número e um caractere especial.',
        }
    );

export {
    emailSchema,
    usernameSchema,
    passwordSchema,
    cellphoneSchema,
    dateSchema,
    booleanSchema,
    z,
};
