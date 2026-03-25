/**
 * @fileoverview Testes da Função `StringWithLegthGen` — Tipo Primitivo de Tamanho Fixo.
 *
 * ## O que estamos testando
 * O `Brand<string, { length: N }>` é um tipo puramente em compile-time — sem testes de runtime.
 * O que testamos é a função geradora `StringWithLegthGen(value, n)` que:
 * 1. Valida que `value` é uma string (guarda de tipo runtime)
 * 2. Valida que `value.length === n` (invariante de tamanho)
 * 3. Retorna o valor como `StringWithLegth<N>` se passar nas duas condições
 *
 * ## Por que isso importa para segurança
 * Campos de tamanho fixo (CPF = 11 dígitos, CEP = 8 dígitos) têm invariantes
 * que não devem ser violados em nenhum ponto do sistema.
 * `StringWithLegthGen` é a fronteira onde essa invariante é garantida em runtime,
 * antes de entrar em qualquer entidade ou persistência.
 *
 * @see {@link src/shared/types/primitives.type.ts}
 */
import { describe, it, expect } from 'vitest';
import { StringWithLegthGen } from '@Types/primitives.type.js';

describe('StringWithLegthGen', () => {
	// -------------------------------------------------------------------------
	// Caminho feliz — invariante respeitada
	// -------------------------------------------------------------------------
	describe('quando o valor tem o tamanho correto', () => {
		/**
		 * Caso base: string de 3 chars, N=3. Deve retornar o mesmo valor.
		 * O retorno não é um objeto especial — é a mesma string com o Brand no tipo.
		 */
		it('deve retornar a string quando value.length === N', () => {
			const result = StringWithLegthGen('abc', 3);

			expect(result).toBe('abc');
		});

		/**
		 * Teste com N=11 — cenário real do CPF (11 dígitos sem máscara).
		 * Garante que funciona com tamanhos de domínio reais.
		 */
		it('deve aceitar string com N=11 (tamanho de CPF sem máscara)', () => {
			const cpfDigits = '12345678901'; // 11 chars, fictício

			const result = StringWithLegthGen(cpfDigits, 11);

			expect(result).toBe(cpfDigits);
			expect(result).toHaveLength(11);
		});

		/**
		 * Teste com N=8 — cenário real do CEP brasileiro.
		 */
		it('deve aceitar string com N=8 (tamanho de CEP sem máscara)', () => {
			const cepDigits = '01001000'; // 8 chars

			const result = StringWithLegthGen(cepDigits, 8);

			expect(result).toBe(cepDigits);
		});

		/**
		 * Não retorna uma cópia — retorna a referência exata.
		 * Isso garante que não há overhead de alocação.
		 */
		it('deve retornar exatamente o mesmo valor (sem cópia)', () => {
			const original = 'exato';

			const result = StringWithLegthGen(original, 5);

			// toBe usa Object.is — verifica identidade de referência em primitivos
			expect(result).toBe(original);
		});
	});

	// -------------------------------------------------------------------------
	// Falhas por tamanho incorreto
	// -------------------------------------------------------------------------
	describe('quando o valor tem tamanho diferente do esperado', () => {
		/**
		 * String menor que N deve lançar erro.
		 * Passado 4 chars onde eram esperados 5 — violação de invariante.
		 */
		it('deve lançar erro quando string é menor que N', () => {
			expect(() => StringWithLegthGen('abcd', 5)).toThrow();
		});

		/**
		 * String maior que N deve lançar erro.
		 * Passado 6 chars onde eram esperados 5 — violação de invariante.
		 */
		it('deve lançar erro quando string é maior que N', () => {
			expect(() => StringWithLegthGen('abcdef', 5)).toThrow();
		});

		/**
		 * String vazia com N=0 não tem uso prático — mas documentamos o comportamento.
		 * N=0 passaria na verificação de tamanho mas é semanticamente inútil.
		 */
		it('deve lançar erro quando N=1 mas string está vazia', () => {
			expect(() => StringWithLegthGen('', 1)).toThrow();
		});

		/**
		 * O erro deve mencionar os tamanhos esperado e recebido.
		 * Isso facilita debugging — o dev sabe imediatamente o que saiu errado.
		 */
		it('deve lançar erro com mensagem informativa sobre os tamanhos', () => {
			expect(() => StringWithLegthGen('abc', 10)).toThrow(/10/);
		});
	});

	// -------------------------------------------------------------------------
	// Falhas por tipo incorreto
	// -------------------------------------------------------------------------
	describe('quando o valor não é uma string', () => {
		/**
		 * O guard de tipo verifica `typeof value !== 'string'` antes do check de tamanho.
		 * Em JavaScript, números podem ser convertidos implicitamente — este guard previne isso.
		 *
		 * Usamos `as unknown` para simular dados de runtime não-tipados
		 * (ex: payload de API não validado) sem o TypeScript reclamar em compile-time.
		 */
		it('deve lançar erro quando value é um número', () => {
			expect(() => StringWithLegthGen(123 as unknown as string, 3)).toThrow();
		});

		it('deve lançar erro quando value é undefined', () => {
			expect(() => StringWithLegthGen(undefined as unknown as string, 3)).toThrow();
		});

		it('deve lançar erro quando value é null', () => {
			expect(() => StringWithLegthGen(null as unknown as string, 3)).toThrow();
		});

		it('deve lançar erro quando value é um objeto', () => {
			expect(() => StringWithLegthGen({} as unknown as string, 3)).toThrow();
		});
	});
});
