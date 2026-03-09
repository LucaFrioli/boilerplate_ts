import type { Brand } from './brand.type.js';

/**
 * String que já passou pelo processo de Hashing.
 * Garante que dados sensíveis não circulem em texto puro.
 */
export type HashedString = Brand<string, 'HashedString'>;
