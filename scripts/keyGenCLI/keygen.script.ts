import { randomBytes } from 'node:crypto';
import { createInterface } from 'node:readline';

// --- Codificadores Nativos Customizados ---

function toBase32(buffer: Buffer): string {
  const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  let bits = 0;
  let value = 0;
  let output = '';

  for (const byte of buffer) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      const idx = (value >>> (bits - 5)) & 31;
      output += ALPHABET.charAt(idx);
      bits -= 5;
    }
  }
  if (bits > 0) {
    const idx = (value << (5 - bits)) & 31;
    output += ALPHABET.charAt(idx);
  }
  return output;
}

function toBase58(buffer: Buffer): string {
  const ALPHABET = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
  const digits = [0];

  for (const byte of buffer) {
    let temp = byte;
    for (const [j, digit] of digits.entries()) {
      temp += digit << 8;
      digits[j] = temp % 58;
      temp = Math.floor(temp / 58);
    }
    while (temp > 0) {
      digits.push(temp % 58);
      temp = Math.floor(temp / 58);
    }
  }
  return digits.reverse().map(d => ALPHABET.charAt(d)).join('');
}

// --- Funções de Geração (Mapeadas para os requisitos mínimos das suas Regex) ---

const generators = {
  '1': {
    name: 'Hexadecimal',
    regexName: 'regexValidationToHexadecimalKeyMinimalRequire',
    generate: (bytesCount: number): string => randomBytes(bytesCount).toString('hex')
  },
  '2': {
    name: 'Base64',
    regexName: 'regexValidationToBase64KeyMinimalRequire',
    generate: (bytesCount: number): string => randomBytes(bytesCount).toString('base64').replace(/=+$/, '')
  },
  '3': {
    name: 'Base32',
    regexName: 'regexValidationToBase32KeyMinimalRequire',
    generate: (bytesCount: number): string => toBase32(randomBytes(bytesCount))
  },
  '4': {
    name: 'Base58',
    regexName: 'regexValidationToBase58KeyMinimalRequire',
    generate: (bytesCount: number): string => toBase58(randomBytes(bytesCount))
  }
};

// --- Interface de Linha de Comando (CLI) ---

const rl = createInterface({
  input: process.stdin,
  output: process.stdout
});

console.clear();
console.log('🏗️  WildcardBoiler — Gerador de Chaves Entrópicas de Segurança\n');

rl.question('Quantos bits de entropia deseja para a chave? (padrão: 256 apenas digite enter): ', (bitsInput) => {
  const input = bitsInput.trim();
  let bits = input === '' ? 256 : parseInt(input, 10);

  if (isNaN(bits) || bits <= 0) {
    console.log('\x1b[31mQuantidade de bits inválida.\x1b[0m Usando padrão de 256 bits.');
    bits = 256;
  }

  const bytesCount = Math.ceil(bits / 8);
  console.log(`\nEntropia configurada: ${String(bits)} bits (~${String(bytesCount)} bytes)\n`);

  console.log('Selecione o formato de string criptográfica que deseja gerar:');
  Object.entries(generators).forEach(([key, value]) => {
    console.log(`  [${key}] — ${value.name}`);
  });
  console.log('  [5] — Gerar TODOS os formatos simultaneamente\n');

  rl.question('Escolha uma opção (1-5): ', (answer) => {
    const option = answer.trim();

    console.log('\n--------------------------------------------------');

    if (option === '5') {
      console.log('🔑  Gerando todas as chaves seguras para o seu .env:\n');
      Object.values(generators).forEach((gen) => {
        console.log(`📌 Alvo: ${gen.regexName}`);
        console.log(`👉 Chave: \x1b[32m${gen.generate(bytesCount)}\x1b[0m\n`);
      });
    } else if (option in generators) {
      const target = generators[option as keyof typeof generators];
      console.log(`📌 Validador Alvo: ${target.regexName}`);
      console.log(`👉 Chave Gerada:  \x1b[32m${target.generate(bytesCount)}\x1b[0m`);
    } else {
      console.log('\x1b[31mOpção inválida.\x1b[0m O processo foi encerrado.');
    }

    console.log('--------------------------------------------------');
    rl.close();
  });
});
