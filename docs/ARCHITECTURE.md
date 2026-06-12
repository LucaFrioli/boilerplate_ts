# Arquitetura do WildcardBoiler API

> **Propósito deste documento:** Ser o ponto de entrada único para qualquer pessoa - ou IA - que precise entender o projeto em minutos. Leia isto primeiro, depois aprofunde nos [ADRs](./Adrs.md), nas [dívidas técnicas](./dividas_tecnicas.md) e no [guia de Branded Types](./BRANDED_TYPES.md).

---

## Stack Tecnológica

| Camada | Tecnologia | Versão | Papel |
|--------|-----------|--------|-------|
| Runtime | Node.js (ESM nativo) | 22+ | Sem CommonJS, sem transpile de módulos |
| Framework | Express | 5.x | HTTP, middleware, routing |
| Linguagem | TypeScript | 5.x | Strict mode, branded types, project references |
| Banco Persistente | MongoDB (Mongoose) | 9.x | Documento-base, ODM |
| Banco em Memória | Redis / Valkey | - | Cache, sessões, pub/sub (TCP, TLS, UDS, Sentinel) |
| Validação de Env | Zod | 4.x | Schema + type inference no boot |
| Logging | Pino | 10.x | Structured JSON, redact automático de PII |
| Hash / Crypto | Argon2 / Bcrypt / HMAC | - | Hashing de senhas e hashes determinísticos (Factory pattern) |
| Derivação de Chave | HKDF (WebCrypto) | - | Derivação de chaves criptográficas (RFC 5869) |
| Identidade | UUID v4/v7, NanoID | - | Seleção via env (Factory pattern) |
| Testes | Vitest | 4.x | 662 testes, 45 test files, ~6s de execução |
| Lint | ESLint 10 | Flat config | Strict types, boundary enforcement |

---

## Filosofias Fundamentais

Estas são as regras invioláveis do projeto. Se uma mudança contradiz qualquer uma, ela precisa de um novo ADR justificando a exceção.

1. **Fail-Fast** - Erros são detectados e lançados imediatamente. Nenhum módulo opera em estado inválido. Handlers retornam `: never`. ([ADR 003](./Adrs.md#adr-003-contratos-de-conexão-com-fail-fast-never-return))

2. **Defense in Depth** - Validação ocorre em múltiplas camadas: Zod no boot, Type Guards no runtime, Branded Types no compile-time. ([ADR 009](./Adrs.md#adr-009-type-guards-e-type-narrowing-como-fronteiras-de-segurança-cybersecurity))

3. **Branded Types > Type Assertions** - `as Type` é proibido em fluxos críticos. Toda transição de tipo passa por um Type Guard com validação de memória real. (Para uma lista completa e exemplos práticos, consulte o [Guia de Branded Types](./BRANDED_TYPES.md)). ([ADR 002](./Adrs.md#adr-002-branded-types-para-identidade-e-segurança), [ADR 009](./Adrs.md#adr-009-type-guards-e-type-narrowing-como-fronteiras-de-segurança-cybersecurity))

4. **Contracts-First** - Novos providers implementam contratos abstratos (`BaseHasher`, `BaseUri`, `BaseEntity`, `KeyDerivatorBase`, `DeterministicHasherBase`). O contrato é testado primeiro (TDD), o provider depois. ([ADR 010](./Adrs.md#adr-010-adoção-de-metodologia-tdd))

5. **Zero Side-Effects em Barrel Exports** - Módulos re-exportados via `@Types` não podem executar lógica dependente de env no top-level. Valores dinâmicos usam Lazy Singleton. ([ADR 011](./Adrs.md#adr-011-proibição-de-side-effects-em-avaliação-de-módulos-barrel-exported-lazy-initialization))

---

## Pirâmide de Dependências (ADR 012)

O nível de um módulo é definido pelo **nível mais alto que ele importa + 1**. Módulos de nível inferior **nunca** importam de níveis superiores.

```
Level 0 - Folhas Puras (zero imports internos)
├── configs/constants/                       Constantes, regex, listas (env, crypto, pii, database)
└── configs/logger.ts                        Pino + process.env direto

Level 1 - Consumidores de Level 0 (peers entre si)
├── shared/types/*                           Brand types, Type Guards (@Types)
├── shared/masks/*                           Máscaras de anonimização (@Masks)
├── shared/helpers/EncodingToByte.ts         Universal Bytes Decoder (hex/base64/etc.)
├── configs/schemas/*.schema.ts              Zod schemas de validação
└── validations/*                            Classes validadoras (Host, CPF, Password, etc.)

Level 2 - Agregador de Configuração
└── configs/env.ts                           Agrega schemas, valida, exporta env

Level 3 - Infraestrutura de Serviço
├── core/cryptography/                       KeyDerivation, DeterministicHash (Factories + providers)
├── core/identity/                           IdentityFactory + providers
├── auth/hash/                               HasherFactory + providers
└── databases/                               URI factories (cache/persistence) + connections

Level 4 - Domínio
└── resources/                               Entidades (User, futuras)

Level 5 - Bootstrap
├── app.ts                                   Express setup
└── server.ts                                Boot, connect, listen
```

### Invariante Obrigatório (enforced por ESLint)

```
shared/types/*  ──────→  validations/*     ✅ Permitido
validations/*   ──╳───→  shared/types/*    ❌ Proibido (ADR 012)
```

Violação gera erro de lint: `⛔ ADR 012: Validadores não podem importar de @Types...`

Referência completa: [ADR 012](./Adrs.md#adr-012-hierarquia-de-dependências-baseada-em-imports-reais-pirâmide-de-níveis-v2)

---

## Fluxo de Boot

```
1. dotenv carrega .env
2. env.ts agrega todos os schemas Zod (dbEnv, memDbEnv, hasherEnv, idEnv, criptography)
3. Zod valida process.env inteiro de uma vez
4. Se falhar → log fatal + process.exit(1)        ← Fail-Fast
5. Se passar → `env` é exportado como objeto tipado e imutável
6. server.ts importa env + logger
7. MongodbConnect instancia → BaseUri valida URI → BaseConnect abre conexão
8. Express começa a ouvir na porta configurada
```

**Regra crítica:** Nenhum módulo que importe `env` pode ser importado por módulos de Level 0 ou Level 1. O `env.ts` é o divisor - tudo acima dele (Level 0–1) funciona sem env; tudo abaixo (Level 3–5) depende dele.

---

## Mapa de Diretórios

```
src/
├── configs/
│   ├── constants/                   ← Level 0: verdade absoluta
│   │   ├── env.constants.ts
│   │   ├── crypto.constants.ts
│   │   ├── pii.constants.ts
│   │   ├── database.constants.ts
│   │   └── identify.constants.ts
│   ├── logger.ts                    ← Level 0: Pino com redact
│   ├── schemas/                     ← Level 1: Zod schemas
│   │   ├── dbEnv.schema.ts
│   │   ├── hasherEnv.schema.ts
│   │   ├── idEnv.schema.ts
│   │   ├── memDbEnv.schema.ts
│   │   └── criptography.schema.ts
│   └── env.ts                       ← Level 2: agregador + validação
│
├── shared/                          ← Level 1: Módulos Compartilhados
│   ├── types/                       ← Sistema de tipos (Branded + Guards - @Types)
│   │   ├── index.ts                 ← Barrel export (@Types)
│   │   ├── brand.type.ts            ← Brand<T, B> genérico
│   │   ├── identity.type.ts         ← AppID, DatabaseID
│   │   ├── security.types.ts        ← ValidCryptoKey, HashedString, Uri, DatabaseUsername, DerivedKey
│   │   ├── pii.types.ts             ← ValidCPF, ValidEmail, ValidUsernamePii
│   │   ├── primitives.type.ts       ← StringWithLegth
│   │   └── static.types.ts          ← DeepReadonly<T>
│   │
│   ├── helpers/                     ← Utilitários compartilhados
│   │   └── EncodingToByte.ts        ← Decodificador universal agnóstico
│   │
│   └── masks/                       ← Utilitários de anonimização (@Masks)
│       ├── index.ts                 ← Barrel export (@Masks)
│       └── anonimization.masks.ts   ← maskPII + maskLogDatabaseUsername
│
├── validations/                     ← Level 1: classes validadoras
│   ├── Cpf.validations.ts
│   ├── Password.validations.ts
│   ├── Host.validations.ts
│   ├── DatabaseUsername.validation.ts
│   ├── DatabasePassword.validation.ts
│   ├── DatabaseInMemoryUri.validation.ts
│   ├── EncondingAlphabets.validations.ts
│   ├── Email.validations.ts
│   └── UsernamePII.validations.ts
│
├── auth/hash/                       ← Level 3: hashing não-determinístico (senhas)
│   ├── contracts/IHasher.contract.ts
│   ├── hashesFactory.auth.ts        ← Factory: seleciona provider via env
│   └── providers/
│       ├── Argon2.service.auth.ts
│       └── Bcrypt.service.auth.ts
│
├── core/cryptography/               ← Level 3: criptografia e chaves
│   ├── contracts/
│   │   ├── KeyDerivator.contract.ts          ← Contrato base de KDF
│   │   └── DeterministicHasher.contract.ts   ← Contrato base de hashing determinístico
│   ├── keyDerivation/
│   │   ├── KeyDerivation.factory.crypto.ts   ← Factory singleton
│   │   └── provider/
│   │       └── Hkdf.provider.crypto.ts       ← Implementação HKDF
│   └── deterministicHash/
│       ├── DeterministicHash.factory.crypto.ts ← Factory singleton
│       └── providers/
│           └── Hmac.provider.crypto.ts       ← Implementação HMAC
│
├── core/identity/                   ← Level 3: geração de IDs
│   ├── contracts/IIdentyti.contract.ts
│   ├── IdentityFactory.identity.ts  ← Factory: seleciona provider via env
│   └── providers/
│       ├── NanoId.service.identity.ts
│       ├── UuidV4.service.identity.ts
│       └── UuidV7.service.identity.ts
│
├── databases/                       ← Level 3: persistência e cache
│   ├── uri/
│   │   ├── contracts/
│   │   │   ├── BaseUri.contract.ts      ← Contrato abstrato para DB persistente
│   │   │   └── BaseMemUri.contract.ts   ← Contrato abstrato para DB em memória
│   │   ├── cache/
│   │   │   └── valkey.uri.ts            ← Conexão Valkey/Redis (TCP, UDS, Sentinel)
│   │   └── persistence/
│   │       └── mongodb.uri.ts           ← Conexão MongoDB
│   └── connections/
│       ├── contracts/BaseConnect.contract.ts
│       └── mongodb.database.ts
│
├── resources/                       ← Level 4: domínio
│   ├── contracts/Entity.contract.ts
│   └── User/
│       ├── User.interface.ts
│       ├── User.ts
│       └── User.validation.ts
│
├── utils/                           ← Utilitários transversais (Level 0)
│   └── dateManager.util.ts
│
├── app.ts                           ← Level 5: Express setup
└── server.ts                        ← Level 5: bootstrap
```

---

## Contratos e Como Estendê-los

O projeto usa **Abstract Classes** como contratos. Para adicionar um novo provider:

### Novo Hasher (ex: Scrypt)
1. Crie `src/auth/hash/providers/Scrypt.service.auth.ts`
2. Estenda `IHasher` - implemente `generate()` e `compare()`
3. Adicione o case em `hashesFactory.auth.ts`
4. Adicione o provider em `supportedHashProviders` no `env.constants.ts`
5. Adicione regex de validação em `regexValidationToHasherProvidersSupported`
6. Crie teste em `tests/unit/auth/hash/Scrypt.provider.test.ts`

### Novo Banco de Dados (ex: PostgreSQL URI)
1. Crie `src/databases/uri/persistence/postgres.uri.ts`
2. Estenda `BaseUri` - implemente `guardBroken()`, `generateUriDev()`, `generateUriProd()`, `maskUriToLog()`
3. O contrato já valida env, loga erros e protege o getter
4. Crie teste baseado em `tests/unit/databases/uri/mongodb.uri.test.ts`

### Nova Entidade (ex: Habit)
1. Crie `src/resources/Habit/Habit.interface.ts` - defina a interface
2. Crie `src/resources/Habit/Habit.ts` - estenda `Entity`
3. Crie `src/resources/Habit/Habit.validation.ts` - validações de domínio
4. O contrato `Entity` já fornece: ID gerado via factory, `validate()`, `changePassword()` pattern

---

## Testes

```
tests/
├── helpers/
│   ├── env/loadTestEnv.ts           ← Carrega .env.test com isolamento (@tests)
│   └── mocks/test.fixtures.ts       ← Stubs e Fixtures reutilizáveis (@Mocks)
└── unit/                            ← Espelho de src/
    ├── auth/hash/                   ← Testa contratos + providers (Argon2, Bcrypt)
    ├── configs/                     ← Testa schemas + env + logger
    ├── core/identity/               ← Testa contratos + providers (UUIDs, NanoID)
    ├── core/cryptography/           ← Testa contratos + KDF (HKDF) + Hasher (HMAC)
    ├── databases/                   ← Testa URI contracts + connections (Mongo, Valkey)
    ├── resources/user/              ← Testa entidade User
    ├── shared/                      ← Testa componentes compartilhados
    │   ├── types/                   ← Testa Type Guards (@Types)
    │   ├── masks/                   ← Testa utilitários de anonimização (@Masks)
    │   └── helpers/                 ← Testa utilitários agnósticos (EncodingToByte)
    ├── utils/                       ← Testa utilitários (DateManager)
    └── validations/                 ← Testa classes validadoras (Host, CPF, Password, etc.)
```

**Padrões de teste:**
- Cada teste de contrato usa **Stubs** que estendem o contrato abstrato - testa o contrato, não a implementação.
- `vi.mock('@Configs/env.js')` é usado em testes de Type Guards para evitar que `env.ts` chame `process.exit(1)` durante a avaliação.
- O `.env.test` fornece valores válidos mas fictícios para todas as variáveis.

**Executar:** `npm run test` - 662 testes executados com 100% de cobertura nos arquivos principais de `src/` em aproximadamente 6 segundos.

---

## Regras Que Nunca Devem Ser Quebradas

| Regra | Enforcement | Consequência da Violação |
|-------|-------------|--------------------------|
| Sem `as Type` em fluxos críticos | ESLint strict + code review | Bypass de validação de memória |
| Sem `any` | ESLint `no-explicit-any: error` | Perda de type safety |
| Sem side-effects em barrel exports | ADR 011 + testes de isolamento | Testes quebram por dependências transitivas |
| Validadores não importam de `@Types` | ESLint `no-restricted-imports` | Ciclo ESM → Type Guards undefined → bypass de segurança |
| Nível N não importa de Nível N+1 | ADR 012 + análise de imports | Inversão de dependência, acoplamento ascendente |
| Secrets nunca em logs | Pino redact + masks.util.ts | Vazamento de PII/credenciais (ver dívidas D6–D10) |
| Retorno de funções sempre explícito | ESLint `explicit-function-return-type` | Inferência perigosa em APIs |

---

## Documentos Relacionados

| Documento | Propósito |
|-----------|----------|
| [Adrs.md](./Adrs.md) | Decisões arquiteturais com contexto e justificativa |
| [BRANDED_TYPES.md](./BRANDED_TYPES.md) | Catálogo completo de tipos nominais, guards, asserções e anti-patterns |
| [dividas_tecnicas.md](./dividas_tecnicas.md) | Bugs conhecidos, TODOs, dívidas de segurança |
| [ToDo.md](./ToDo.md) | Roadmap de implementações futuras |
| [readme.md](../readme.md) | Instruções de setup e uso |

---

## Como Manter Este Documento

Este documento deve ser atualizado quando:

- **Novo módulo/diretório é criado** → Atualize o mapa de diretórios e a pirâmide se necessário.
- **Nova ADR é criada** → Adicione referência na seção de filosofias se for uma regra inviolável.
- **Novo contrato abstrato é criado** → Adicione guia de extensão na seção "Contratos e Como Estendê-los".
- **Stack muda** (ex: troca de Express por Fastify) → Atualize a tabela de stack.

**Não é necessário atualizar para:**
- Mudanças internas em implementações existentes.
- Novos testes (a contagem exata não precisa estar atualizada no detalhe de unidade, mas marcos consolidados sim).
- Correções de bugs.
