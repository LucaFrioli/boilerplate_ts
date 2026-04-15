import { describe, it, expect, vi } from 'vitest';
import DateManager from '@Utils/dateManager.util.js';

describe('DateManager Util (Black-Box)', () => {

	describe('toIsoString', () => {
		it('deve converter uma string de data válida para ISO 8601', () => {
			const input = '2026-01-01T12:00:00Z';
			const result = DateManager.toIsoString(input);
			expect(result).toBe('2026-01-01T12:00:00.000Z');
		});

		it('deve converter uma data nativa para ISO 8601', () => {
			const date = new Date('2026-04-02T10:00:00Z');
			const result = DateManager.toIsoString(date);
			expect(result).toBe('2026-04-02T10:00:00.000Z');
		});

		it('deve converter um timestamp (number) para ISO 8601', () => {
			const timestamp = 1775126400000; // 2026-04-02T10:40:00.000Z
			const result = DateManager.toIsoString(timestamp);
			expect(result).toBe('2026-04-02T10:40:00.000Z');
		});

		it('deve falhar de forma rápida (Fail-Fast) ao receber uma data inválida', () => {
			expect(() => DateManager.toIsoString('data-invalida')).toThrow('Data inválida');
		});
	});

	describe('toFileSafe', () => {
		it('deve retornar apenas a porção da data segura para nomes de arquivo (YYYY-MM-DD)', () => {
			const input = '2026-10-31T23:59:59Z';
			const result = DateManager.toFileSafe(input);
			expect(result).toBe('2026-10-31');
		});

		it('deve lançar um erro caso seja provida uma data inválida', () => {
			expect(() => DateManager.toFileSafe('invalida')).toThrow('Data inválida');
		});

		it('deve formatar erro fatal persistente (Edge case falsy substring) mockando interno', () => {
			vi.spyOn(DateManager, 'toIsoString').mockReturnValueOnce('');
			expect(() => DateManager.toFileSafe(new Date())).toThrow('Erro crítico na criação de nome de arquivos baseados em datas');
			vi.restoreAllMocks();
		});
	});

	describe('toDisplay', () => {
		it('deve retornar a data formatada corretamente em pt-BR (padrão)', () => {
			// Mockamos a timezone para garantir consistência no CI
			const input = new Date('2026-12-25T15:30:00Z');
			const result = DateManager.toDisplay(input, 'UTC');
			// pt-BR: '25/12/2026, 15:30' (o Intl formata assim dependendo do node v, usaremos match)
			expect(result).toMatch(/25\/12\/2026/);
			expect(result).toMatch(/15:30/);
		});

		it('deve respeitar timezone e idioma passado', () => {
			const input = new Date('2026-12-25T15:30:00Z');
			const result = DateManager.toDisplay(input, 'America/New_York', 'en-US');
			expect(result).toMatch(/12\/25\/26/); // Formato US
		});
	});

	describe('isDate', () => {
		it('deve retornar true para instância válida de Date', () => {
			expect(DateManager.isDate(new Date())).toBe(true);
		});

		it('deve retornar false para instância inválida de Date', () => {
			expect(DateManager.isDate(new Date('invalida'))).toBe(false);
		});

		it('deve retornar true para string formatada de data válida', () => {
			expect(DateManager.isDate('2026-04-02T10:00:00Z')).toBe(true);
		});

		it('deve retornar false para string inválida', () => {
			expect(DateManager.isDate('qualquer-coisa')).toBe(false);
		});

		it('deve retornar false para tipo não suportado diretamente (booleano, etc)', () => {
			expect(DateManager.isDate(true)).toBe(false);
			expect(DateManager.isDate(null)).toBe(false);
			expect(DateManager.isDate(undefined)).toBe(false);
		});
	});

});
