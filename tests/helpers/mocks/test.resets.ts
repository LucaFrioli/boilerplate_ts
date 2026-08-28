import { KeyDerivatorBase } from '@Crypto/contracts/KeyDerivator.contract.js';
import { DeterministicHahserBase } from '@Crypto/contracts/DeterministicHasher.contract.js';
import { BaseHasher } from '@Hash/contracts/IHasher.contract.js';
import { BaseMemUri } from '@DbUri/contracts/BaseMemUri.contract.js';
import { BaseUri } from '@DbUri/contracts/BaseUri.contract.js';

// 1. Mapeamento de execução (Registry)
// Cada chave string aponta diretamente para a ação de reset da classe correspondente
const RESET_REGISTRY = {
  BaseHasher: () => {
    (BaseHasher as unknown as { _baseEnv: unknown })._baseEnv = undefined;
  },
  DeterministicHasherBase: () => {
    (DeterministicHahserBase as unknown as { _baseEnv: unknown })._baseEnv = undefined;
  },
  KeyDerivatorBase: () => {
    (KeyDerivatorBase as unknown as { _baseEnv: unknown })._baseEnv = undefined;
  },
  BaseMemUri: () => {
    (BaseMemUri as unknown as { _baseEnvMemDb: unknown })._baseEnvMemDb = undefined;
  },
  BaseUri: () => {
    (BaseUri as unknown as { _baseEnvValues: unknown })._baseEnvValues = undefined;
  },
} as const;

// 2. Extração automática da união das chaves: 'BaseHasher' | 'DeterministicHasherBase' | ...
export type EnvResetAllowed = keyof typeof RESET_REGISTRY;

// Lista completa padrão gerada a partir das chaves do dicionário
export const ENV_RESET_ALLOWED = Object.keys(RESET_REGISTRY) as readonly EnvResetAllowed[];

// 3. Validador de duplicatas em tempo de compilação
type NoDuplicates<T extends readonly unknown[]> =
  T extends readonly [infer Head, ...infer Tail]
    ? Head extends Tail[number]
      ? never
      : readonly [Head, ...NoDuplicates<Tail>]
    : T;

// 4. Função auxiliar de testes
export default function resetsCache<const T extends readonly EnvResetAllowed[]>(
  list?: T & NoDuplicates<T>
): void {
  const targets = list ?? ENV_RESET_ALLOWED;

  for (const target of targets) {
    // Acesso direto O(1) e 100% tipado à função de limpeza
    RESET_REGISTRY[target]();
  }
}
