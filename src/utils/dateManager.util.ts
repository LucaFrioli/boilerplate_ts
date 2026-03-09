import { createChildLogger } from "@Configs/logger.js";

type aceptedParamValues = string | number | Date;

export default class DateManager {
	private static readonly utilLogger = createChildLogger({ fileType: "util", module: 'DateManeger', service: "valuation" })


	private static isToDate(input: aceptedParamValues): Date {
		const parsedDate = new Date(input);

		if (isNaN(parsedDate.getTime())) {
			this.utilLogger.debug({ methood: 'verifyIsIsoString', input: input }, 'Ops, algo de errado aconteceu durante o desenvolvimento');
			throw new Error(`Data inválida: o valor '${input}' não pode ser convertido`);
		}

		return parsedDate;
	}

	public static toIsoString(input: aceptedParamValues): string {
		const date = this.isToDate(input)
		return date.toISOString()
	}

	public static toFileSafe(input: aceptedParamValues): string {
		const date = this.toIsoString(input);
		const datePart = date.substring(0, 10);

		if (!datePart) {
			this.utilLogger.error({ method: 'toFileSafe' }, 'Falha círtica na criação de noome de arquivos.');
			throw new Error('Erro crítico na criação de nome de arquivos baseados em datas');
		}

		return datePart;
	}

	public static toDisplay(input: aceptedParamValues, timezone?: string, locale: string = 'pt-BR'): string {
		const date = this.isToDate(input);

		return new Intl.DateTimeFormat(locale, {
			dateStyle: "short",
			timeStyle: "short",
			timeZone: timezone
		}).format(date)
	}

	public static isDate(input: unknown): boolean {
		if (input instanceof Date) {
			return !isNaN(input.getTime());
		}

		if (typeof input === 'string') {
			const d = new Date(input);
			return !isNaN(d.getTime()) && d.toISOString() !== 'Invalid Date';
		}

		return false;
	}
}
