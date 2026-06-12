/**
 * @module DateManager
 * @description Utilitário corporativo para gerenciamento, conversão, formatação e validação de datas.
 *
 * ## Objetivo:
 * Padroniza a manipulação de datas no boilerplate, prevenindo erros clássicos de fuso horário (Timezones),
 * datas inválidas poluindo logs e falhas de escrita de arquivos por caracteres ilegais gerados por conversões de data.
 */

import { createChildLogger } from '@Configs/logger.js';

/**
 * União de tipos aceitáveis para conversão e processamento de datas no sistema.
 */
type aceptedParamValues = string | number | Date;

/**
 * @class DateManager
 * @description Classe estática utilitária para tratamento padronizado de datas e fusos horários.
 */
export default class DateManager {
	/**
	 * Logger estruturado do DateManager.
	 */
	private static readonly utilLogger = createChildLogger({
		fileType: 'util',
		module: 'DateManeger',
		service: 'valuation',
	});

	/**
	 * Tenta converter com segurança uma entrada arbitrária para uma instância nativa e válida de Date.
	 *
	 * @param input O valor a ser convertido (String ISO, Timestamp numérico ou objeto Date).
	 * @returns Uma instância válida do objeto Date.
	 * @throws {Error} Se o valor de entrada for inválido e não puder ser traduzido pelo parser nativo.
	 */
	private static isToDate(input: aceptedParamValues): Date {
		const parsedDate = new Date(input);

		if (isNaN(parsedDate.getTime())) {
			this.utilLogger.debug(
				{ methood: 'verifyIsIsoString', input: input },
				'Ops, algo de errado aconteceu durante o desenvolvimento',
			);
			throw new Error(`Data inválida: o valor '${String(input)}' não pode ser convertido`);
		}

		return parsedDate;
	}

	/**
	 * Converte uma entrada de data para o padrão estrito ISO 8601 (UTC).
	 *
	 * @param input A data a ser formatada.
	 * @returns Uma string contendo a data formatada no padrão ISO (ex: '2026-06-12T03:49:06.000Z').
	 */
	public static toIsoString(input: aceptedParamValues): string {
		const date = this.isToDate(input);
		return date.toISOString();
	}

	/**
	 * Retorna a porção YYYY-MM-DD de uma data, adequada para nomenclatura segura de arquivos físicos no disco.
	 *
	 * @param input A data a ser convertida.
	 * @returns Uma string segura contendo apenas a data (ex: '2026-06-12').
	 * @throws {Error} Se houver erro inesperado ao extrair a substring da data ISO.
	 */
	public static toFileSafe(input: aceptedParamValues): string {
		const date = this.toIsoString(input);
		const datePart = date.substring(0, 10);

		if (!datePart) {
			this.utilLogger.error(
				{ method: 'toFileSafe' },
				'Falha círtica na criação de noome de arquivos.',
			);
			throw new Error('Erro crítico na criação de nome de arquivos baseados em datas');
		}

		return datePart;
	}

	/**
	 * Formata a data de entrada para exibição amigável ao usuário final utilizando Intl.DateTimeFormat.
	 *
	 * @param input A data a ser formatada.
	 * @param timezone Opcional. Fuso horário de destino (ex: 'America/Sao_Paulo').
	 * @param locale O local de formatação regional (padrão: 'pt-BR').
	 * @returns A data formatada com estilos curtos de data e hora (ex: '12/06/2026 03:49').
	 */
	public static toDisplay(
		input: aceptedParamValues,
		timezone?: string,
		locale: string = 'pt-BR',
	): string {
		const date = this.isToDate(input);

		return new Intl.DateTimeFormat(locale, {
			dateStyle: 'short',
			timeStyle: 'short',
			timeZone: timezone,
		}).format(date);
	}

	/**
	 * Valida em runtime se o parâmetro fornecido representa uma data válida ou pode ser parseado com segurança.
	 *
	 * @param input O valor arbitrário sob teste.
	 * @returns Retorna true se for uma instância de Date ativa ou se for uma string convertível e coerente.
	 */
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
