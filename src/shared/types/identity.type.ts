import { type Brand } from '@Types/brand.type.js';

/**
 * ID de Aplicação (Público/URL)
 * Geralmente um NanoID para ser amigável e curto.
 */
export type AppID = Brand<string, 'AppID'>;

/**
 * ID de Banco de Dados (Interno/Indexação)
 * Geralmente um UUIDv7 para performance e ordenação.
 */
export type DatabaseID = Brand<string, 'DatabaseID'>;
