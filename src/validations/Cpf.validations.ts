import { createChildLogger } from '@/configs/logger.js';

export class CpfValidator {
	private static cpfValidatorLogger = createChildLogger({
		module: 'cpf',
		fileType: 'validation',
		service: 'util',
	});

	/**
	 * validateAndSaniteze
	 * @param rawCpf string
	 * @returns string
	 **/
	public static validateAndSanitize(rawCpf: string): string {
		if (typeof rawCpf !== 'string') throw new Error('O cpf passado deve ser uma string');

		const clearCpf = rawCpf.replace(/\D/g, '');

		if (clearCpf.length !== 11)
			throw new Error(
				'Ops um cpf deve ter ao menos 11 dígitos numéricos além de sua mascara',
			);

		if (/^(\d)\1+$/.test(clearCpf)) {
			this.cpfValidatorLogger.warn(
				'Houve uma tentativa de validaçãodo CPF com números repetidos!',
			);
			throw new Error('O cpf não pode ter números repetidos');
		}

		const parcialCpf = clearCpf.slice(0, -2);
		const firstDigit = this.generateDigit(parcialCpf);
		const secondDigit = this.generateDigit(parcialCpf + firstDigit);
		const generatedCpf = parcialCpf + firstDigit + secondDigit;

		if (generatedCpf !== clearCpf) {
			this.cpfValidatorLogger.warn(
				'Tentativa de validação de CPF com digitos verificadores inválidos',
			);
			throw new Error('Ops! Digite um cpf válido para poder continuaar com a operação');
		}

		// aqui estva pensando em implementar uma chamada de um outro método privado para focar em uma validação a nível de api da receita federal

		return Object.freeze(clearCpf);
	}

	private static generateDigit(numberCalculus: string): string {
		const cpfArray = Array.from(numberCalculus);
		let regressive = cpfArray.length + 1;
		const total = cpfArray.reduce((acu, v) => {
			acu += regressive * Number(v);
			regressive--;
			return acu;
		}, 0);
		const digit = 11 - (total % 11);
		return digit > 9 ? `0` : String(digit);
	}

	// private static validateOnPF(mathValidCPF: string): object /*Objeto vindo da API da receita*/ {}
}
