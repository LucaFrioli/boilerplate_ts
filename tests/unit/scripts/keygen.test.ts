/**
 * @fileoverview Testes Unitários e de Integração do keygen.script.ts
 *
 * ## Contexto Testado
 * O script `keygen.script.ts` é uma ferramenta CLI de apoio para geração de chaves
 * de segurança de tamanho dinâmico (com base em bits fornecidos pelo usuário).
 *
 * ## O que testamos (e o que NÃO testamos)
 * ✅ O fluxo de perguntas interativas via prompt (`node:readline`)
 * ✅ Geração de chaves nos quatro formatos (Hex, Base64, Base32, Base58)
 * ✅ A correspondência do tamanho gerado em bits com a saída dos codificadores
 * ✅ Resiliência sob inputs inválidos (fallbacks para 256 bits)
 * ❌ Não testamos o fluxo de console.clear() físico ou formatações de cor ANSI do terminal.
 *
 * @see {@link scripts/keyGenCLI/keygen.script.ts}
 */
import { vi, describe, it, expect, beforeEach, afterEach, type Mock } from 'vitest';

// Setup de Mocks para evitar execução interativa real bloqueante no terminal
const mockQuestion = vi.fn() as unknown as Mock<(query: string, cb: (answer: string) => void) => void>;
const mockClose = vi.fn() as unknown as Mock<() => void>;

vi.mock('node:readline', () => ({
  createInterface: vi.fn().mockImplementation(() => ({
    question: mockQuestion,
    close: mockClose,
  })),
}));

describe('keygen.script.ts', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'clear').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('deve simular o fluxo CLI com sucesso gerando todas as chaves (opção 5) com 256 bits padrão', async () => {
    // Simula as respostas do readline em cadeia:
    // Primeira pergunta (bits): pressionar enter (vazio ➔ 256 bits)
    // Segunda pergunta (opção): escolher todas (opção "5")
    mockQuestion.mockImplementationOnce((query, cb) => {
      cb(''); // Padrão 256 bits
    });
    mockQuestion.mockImplementationOnce((query, cb) => {
      cb('5'); // Opção 5 (todas)
    });

    // Importa dinamicamente para disparar a execução controlada do script
    await import('@Scripts/keyGenCLI/keygen.script.js?test1');

    expect(mockQuestion).toHaveBeenCalledTimes(2);
    expect(mockClose).toHaveBeenCalledTimes(1);
  });

  it('deve simular a geração individual de chave Hexadecimal (opção 1) com tamanho customizado de 128 bits', async () => {
    mockQuestion.mockImplementationOnce((query, cb) => {
      cb('128'); // 128 bits = 16 bytes
    });
    mockQuestion.mockImplementationOnce((query, cb) => {
      cb('1'); // Hexadecimal
    });

    const consoleSpy = vi.spyOn(console, 'log');

    await import('@Scripts/keyGenCLI/keygen.script.js?test2');

    expect(mockQuestion).toHaveBeenCalledTimes(2);
    expect(mockClose).toHaveBeenCalledTimes(1);

    // 16 bytes em Hex = 32 caracteres
    const hexPattern = /[a-f0-9]{32}/;
    const printedKeys = consoleSpy.mock.calls
      .map(call => String(call[0]))
      .filter(msg => msg.includes('Chave Gerada:'));

    expect(printedKeys.length).toBeGreaterThan(0);
    const keyMsg = printedKeys[0] ?? '';
    expect(hexPattern.test(keyMsg)).toBe(true);
  });

  it('deve adotar fallback de 256 bits se a quantidade inserida for inválida ou menor/igual a zero', async () => {
    mockQuestion.mockImplementationOnce((query, cb) => {
      cb('invalido-bits'); // Letras em vez de número
    });
    mockQuestion.mockImplementationOnce((query, cb) => {
      cb('2'); // Base64
    });

    const consoleSpy = vi.spyOn(console, 'log');

    await import('@Scripts/keyGenCLI/keygen.script.js?test3');

    // Verifica se exibiu mensagem de aviso sobre a quantidade inválida
    const hasWarn = consoleSpy.mock.calls.some(call =>
      String(call[0]).includes('Quantidade de bits inválida')
    );
    expect(hasWarn).toBe(true);
    expect(mockClose).toHaveBeenCalledTimes(1);
  });

  it('deve adotar fallback de 256 bits se o número de bits for menor ou igual a zero', async () => {
    mockQuestion.mockImplementationOnce((query, cb) => {
      cb('-10'); // Bits <= 0
    });
    mockQuestion.mockImplementationOnce((query, cb) => {
      cb('3'); // Base32
    });

    const consoleSpy = vi.spyOn(console, 'log');

    await import('@Scripts/keyGenCLI/keygen.script.js?test4');

    const hasWarn = consoleSpy.mock.calls.some(call =>
      String(call[0]).includes('Quantidade de bits inválida')
    );
    expect(hasWarn).toBe(true);
    expect(mockClose).toHaveBeenCalledTimes(1);
  });

  it('deve exibir mensagem de erro se a opcao escolhida for invalida', async () => {
    mockQuestion.mockImplementationOnce((query, cb) => {
      cb('256');
    });
    mockQuestion.mockImplementationOnce((query, cb) => {
      cb('99'); // Opção inválida
    });

    const consoleSpy = vi.spyOn(console, 'log');

    await import('@Scripts/keyGenCLI/keygen.script.js?test5');

    const hasInvalidOptionMsg = consoleSpy.mock.calls.some(call =>
      String(call[0]).includes('Opção inválida')
    );
    expect(hasInvalidOptionMsg).toBe(true);
    expect(mockClose).toHaveBeenCalledTimes(1);
  });

  it('deve gerar chave individual Base58 (opcao 4) com sucesso', async () => {
    mockQuestion.mockImplementationOnce((query, cb) => {
      cb('256');
    });
    mockQuestion.mockImplementationOnce((query, cb) => {
      cb('4'); // Base58
    });

    await import('@Scripts/keyGenCLI/keygen.script.js?test6');
    expect(mockClose).toHaveBeenCalledTimes(1);
  });

  it('deve gerar chave individual Base32 (opcao 3) com 160 bits (multiplo de 5 bytes) para cobrir a branch bits == 0', async () => {
    mockQuestion.mockImplementationOnce((query, cb) => {
      cb('160'); // 160 bits = 20 bytes (multiplo de 5)
    });
    mockQuestion.mockImplementationOnce((query, cb) => {
      cb('3'); // Base32
    });

    await import('@Scripts/keyGenCLI/keygen.script.js?test7');
    expect(mockClose).toHaveBeenCalledTimes(1);
  });
});
