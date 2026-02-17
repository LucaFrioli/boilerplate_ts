import { logger } from "@/configs/logger.js";

/**
 * Responsável exclusivamente por realizar o parsing (análise) de strings de data
 * provenientes do banco de dados ou outras fontes externas.
 * Fornece métodos estáticos para converter strings em objetos Date válidos,
 * lidando com diferentes formatos e fusos horários.
 *
 * @dependências Utiliza DateUtils.isValidDate para validação final.
 */
export class DateParser {

    /**
     * Verifica se uma string de data está no formato UTC (ISO 8601 com offset ou 'Z').
     * O formato UTC é detectado pela presença de:
     * - 'Z' no final (indica UTC puro), ou
     * - um offset no formato +hh:mm ou -hh:mm no final.
     *
     * @param dateString - A string de data a ser verificada.
     * @returns `true` se a string termina com 'Z' ou com um offset de fuso horário; caso contrário, `false`.
     */
    static isUTCFormat(dateString: string): boolean {
        return /Z$|[+-]\d{2}:\d{2}$/.test(dateString);
    }

    /**
     * Converte uma string de data vinda do banco de dados em um objeto Date.
     * Suporta dois formatos principais:
     * 1. Strings em formato UTC (detectado por isUTCFormat) – interpretadas diretamente.
     * 2. Strings no formato "yyyy-mm-dd HH:MM:SS" (ou apenas "yyyy-mm-dd") – interpretadas
     *    como data/hora local ou UTC, conforme a opção `timezone`.
     *
     * O processo de parsing para o formato não‑UTC:
     * - Divide a string em parte de data e parte de hora (padrão "00:00:00" se ausente).
     * - Extrai ano, mês, dia da parte de data (separador '-').
     * - Extrai hora, minuto, segundo da parte de hora (separador ':').
     * - Valida se todos os componentes numéricos são números válidos.
     * - Constrói o Date usando `Date.UTC` se a opção timezone for 'utc', ou
     *   o construtor local se for 'local'.
     *
     * @param dbDateString - A string de data do banco (pode ser nula ou indefinida).
     * @param options - Opções de interpretação:
     *                  - `timezone`: define se a data deve ser tratada como UTC ('utc') ou
     *                    no fuso local do ambiente ('local'). O padrão é 'local'.
     * @returns Um objeto Date válido, ou `null` se a string for inválida ou nula.
     */
    static parseDBDate(
        dbDateString?: string | null,
        options?: { timezone?: 'utc' | 'local' }
    ): Date | null {

        if (!dbDateString) return null;

        const timezone = options?.timezone ?? 'local';

        // Se a string já está em formato UTC, utiliza o construtor padrão Date(string)
        if (this.isUTCFormat(dbDateString)) {
            const parsed = new Date(dbDateString);
            return DateUtils.isValidDate(parsed) ? parsed : null;
        }

        // Separa data e hora (formato esperado: "yyyy-mm-dd HH:MM:SS" ou "yyyy-mm-dd")
        const parts = dbDateString.split(' ');

        const datePart = parts[0];
        if (datePart === undefined) return null;

        const timePart = parts[1] ?? '00:00:00';

        // Extrai componentes da data
        const dateParts = datePart.split('-');
        if (dateParts.length !== 3) return null;

        const year = Number(dateParts[0]);
        const month = Number(dateParts[1]);
        const day = Number(dateParts[2]);

        if ([year, month, day].some(n => Number.isNaN(n))) return null;

        // Extrai componentes da hora
        const timeParts = timePart.split(':');
        if (timeParts.length < 2) return null;

        const hour = Number(timeParts[0]);
        const minute = Number(timeParts[1]);
        const second = Number(timeParts[2] ?? 0);

        if ([hour, minute, second].some(n => Number.isNaN(n))) return null;

        // Cria a data respeitando o fuso horário solicitado
        if (timezone === 'utc') {
            return new Date(Date.UTC(year, month - 1, day, hour, minute, second));
        }

        return new Date(year, month - 1, day, hour, minute, second);
    }

    /**
     * Converte uma string ISO 8601 em um objeto Date.
     * A string pode estar em formato simplificado (ex.: "2023-12-25") ou completo
     * com hora e fuso (ex.: "2023-12-25T10:30:00Z").
     *
     * @param iso - A string no formato ISO.
     * @returns Um objeto Date válido, ou `null` se a string não representar uma data válida.
     */
    static fromISO(iso: string): Date | null {
        const parsed = new Date(iso);
        return DateUtils.isValidDate(parsed) ? parsed : null;
    }

    /**
     * Converte um timestamp Unix (milissegundos desde 1970-01-01 UTC) em um objeto Date.
     *
     * @param timestamp - Número de milissegundos.
     * @returns Um objeto Date válido, ou `null` se o timestamp não resultar em uma data válida.
     */
    static fromTimestamp(timestamp: number): Date | null {
        const parsed = new Date(timestamp);
        return DateUtils.isValidDate(parsed) ? parsed : null;
    }
}

/**
 * Responsável exclusivamente por formatar objetos Date em strings legíveis ou padronizadas.
 * Todos os métodos validam a data de entrada utilizando DateUtils.isValidDate.
 */
export class DateFormatter {

    /**
     * Formata uma data no padrão brasileiro de data e hora curtas.
     * Exemplo: "25/12/2023 10:30".
     *
     * @param date - O objeto Date a ser formatado (pode ser nulo ou indefinido).
     * @returns A string formatada no padrão 'pt-BR' com dateStyle='short' e timeStyle='short',
     *          ou `null` se a data for inválida.
     */
    static toLocaleBR(date?: Date | null): string | null {
        if (!DateUtils.isValidDate(date)) return null;

        return date.toLocaleString('pt-BR', {
            dateStyle: 'short',
            timeStyle: 'short'
        });
    }

    /**
     * Retorna a representação ISO 8601 completa da data (inclui data, hora, fuso UTC).
     * Exemplo: "2023-12-25T10:30:00.000Z".
     *
     * @param date - O objeto Date a ser convertido.
     * @returns A string ISO, ou `null` se a data for inválida.
     */
    static toISO(date?: Date | null): string | null {
        if (!DateUtils.isValidDate(date)) return null;
        return date.toISOString();
    }

    /**
     * Retorna apenas a parte da data (ano-mês-dia) de uma representação ISO.
     * Exemplo: para "2023-12-25T10:30:00.000Z", retorna "2023-12-25".
     *
     * @param date - O objeto Date.
     * @returns A string no formato "YYYY-MM-DD", ou `null` se a data for inválida.
     */
    static toISODateOnly(date?: Date | null): string | null {
        if (!DateUtils.isValidDate(date)) return null;

        const iso = date.toISOString();
        const [datePart] = iso.split('T');

        return datePart ?? null;
    }

    /**
     * Formata a data em uma string segura para uso em nomes de arquivo.
     * Substitui os caracteres ':' e '.' por '-' na string ISO completa.
     * Exemplo: "2023-12-25T10-30-00-000Z".
     *
     * @param date - O objeto Date.
     * @returns A string adaptada para nomes de arquivo, ou `null` se a data for inválida.
     */
    static toFileSafe(date?: Date | null): string | null {
        if (!DateUtils.isValidDate(date)) return null;
        const dateFormated = date.toISOString().replace(/[:.]/g, '-');
        return dateFormated.slice(0, dateFormated.indexOf('T'));
    }
}

/**
 * Utilitários gerais para manipulação e comparação de objetos Date.
 * Fornece funções de validação, ajustes para início/fim do dia e cálculo de diferenças.
 */
export class DateUtils {

    /**
     * Verifica se um valor é um objeto Date válido (não "Invalid Date").
     *
     * @param date - O valor a ser testado.
     * @returns `true` se for uma instância de Date e seu timestamp não for NaN.
     */
    static isValidDate(date: unknown): date is Date {
        return date instanceof Date && !isNaN(date.getTime());
    }

    /**
     * Retorna um novo Date representando o início do dia (00:00:00.000) da data fornecida,
     * no fuso horário local do ambiente.
     *
     * @param date - A data base.
     * @returns Um novo objeto Date ajustado para o início do dia.
     */
    static startOfDay(date: Date): Date {
        if (!this.isValidDate(date)) {
            logger.warn('Data de entrada inválida');
            throw new Error('Data inválida');
        }

        return new Date(
            date.getFullYear(),
            date.getMonth(),
            date.getDate(),
            0, 0, 0, 0
        );
    }

    /**
     * Retorna um novo Date representando o fim do dia (23:59:59.999) da data fornecida,
     * no fuso horário local do ambiente.
     *
     * @param date - A data base.
     * @returns Um novo objeto Date ajustado para o último milissegundo do dia.
     */
    static endOfDay(date: Date): Date {
        if (!this.isValidDate(date)) {
            logger.warn('Data de entrada inválida');
            throw new Error('Data inválida');
        }

        return new Date(
            date.getFullYear(),
            date.getMonth(),
            date.getDate(),
            23, 59, 59, 999
        );
    }

    /**
     * Calcula a diferença em dias inteiros entre duas datas.
     * O cálculo é feito pela diferença dos timestamps em milissegundos, dividida por
     * 86400000 (24 * 60 * 60 * 1000) e aplicando `Math.floor`, o que significa que
     * frações de dia são truncadas para o inteiro inferior.
     *
     * @param a - Primeira data (minuendo).
     * @param b - Segunda data (subtraendo).
     * @returns Número inteiro de dias de diferença (pode ser negativo se `a` for anterior a `b`).
     */
    static differenceInDays(a: Date, b: Date): number {
        const startA = this.startOfDay(a).getTime();
        const startB = this.startOfDay(b).getTime();

        const diff = startA - startB;
        return Math.round(diff / (1000 * 60 * 60 * 24));
    }
}

/**
 * Função utilitária de conveniência que combina o parser de data do banco com a formatação
 * para o padrão brasileiro local.
 *
 * @param dbDateString - String de data vinda do banco (pode ser nula).
 * @param options - Opções de interpretação (mesmas de DateParser.parseDBDate).
 * @returns Data formatada no padrão brasileiro curto, ou `null` se a string for inválida.
 */
export const dbToLocale = (
    dbDateString?: string | null,
    options?: { timezone?: 'utc' | 'local' }
): string | null => {

    const parsed = DateParser.parseDBDate(dbDateString, options);
    return DateFormatter.toLocaleBR(parsed);
};