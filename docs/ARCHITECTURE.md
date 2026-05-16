# Arquitetura do HabitosApp API

> **Propósito deste documento:** Ser o ponto de entrada único para qualquer pessoa - ou IA - que precise entender o projeto em minutos. Leia isto primeiro, depois aprofunde nos [ADRs](./Adrs.md) e [dívidas técnicas](./dividas_tecnicas.md).

---

## Stack Tecnológica

| Camada | Tecnologia | Versão | Papel |
|--------|-----------|--------|-------|
| Runtime | Node.js (ESM nativo) | 22+ | Sem CommonJS, sem transpile de módulos |
| Framework | Express | 5.x | HTTP, middleware, routing |
| Linguagem | TypeScript | 5.x | Strict mode, branded types, project references |
| Banco Persistente | MongoDB (Mongoose) | 9.x | Documento-base, ODM |
| Banco em Memória | Redis / Valkey | - | Cache, sessões, pub/sub |
| Validação de Env | Zod | 4.x | Schema + type inference no boot |
| Logging | Pino | - | Structured JSON, redact automático |
| Hash / Crypto | Argon2 / Bcrypt | - | Seleção via env, factory pattern |
| Identidade | UUID v4/v7, NanoID | - | Seleção via env, factory pattern |
| Testes | Vitest | - | 267 testes, 25 suítes, ~2s de execução |
| Lint | ESLint 10 | Flat config | Strict types, boundary enforcement |

---

## Filosofias Fundamentais

Estas são as regras invioláveis do projeto. Se uma mudança contradiz qualquer uma, ela precisa de um novo ADR justificando a exceção.

1. **Fail-Fast** - Erros são detectados e lançados imediatamente. Nenhum módulo opera em estado inválido. Handlers retornam `: never`. ([ADR 003](./Adrs.md#adr-003-contratos-de-conexão-com-fail-fast-never-return))

2. **Defense in Depth** - Validação ocorre em múltiplas camadas: Zod no boot, Type Guards no runtime, Branded Types no compile-time. ([ADR 009](./Adrs.md#adr-009-type-guards-e-type-narrowing-como-fronteiras-de-segurança-cybersecurity))

3. **Branded Types > Type Assertions** - `as Type` é proibido em fluxos críticos. Toda transição de tipo passa por um Type Guard com validação de memória real. ([ADR 002](./Adrs.md#adr-002-branded-types-para-identidade-e-segurança), [ADR 009](./Adrs.md#adr-009-type-guards-e-type-narrowing-como-fronteiras-de-segurança-cybersecurity))

4. **Contracts-First** - Novos providers implementam contratos abstratos (`BaseHasher`, `BaseUri`, `BaseEntity`). O contrato é testado primeiro (TDD), o provider depois. ([ADR 010](./Adrs.md#adr-010-adoção-de-metodologia-tdd))

5. **Zero Side-Effects em Barrel Exports** - Módulos re-exportados via `@Types` não podem executar lógica dependente de env no top-level. Valores dinâmicos usam Lazy Singleton. ([ADR 011](./Adrs.md#adr-011-proibição-de-side-effects-em-avaliação-de-módulos-barrel-exported-lazy-initialization))

---

## Pirâmide de Dependências (ADR 012)

O nível de um módulo é definido pelo **nível mais alto que ele importa + 1**. Módulos de nível inferior **nunca** importam de níveis superiores.

```
Level 0 - Folhas Puras (zero imports internos)
├── configs/constants/env.constants.ts       constantes, regex, listas
└── configs/logger.ts                        Pino + process.env direto

Level 1 - Consumidores de Level 0 (peers entre si)
├── shared/types/*                           Brand types, Type Guards
├── configs/schemas/*.schema.ts              Zod schemas de validação
└── validations/*                            Classes validadoras

Level 2 - Agregador de Configuração
└── configs/env.ts                           Agrega schemas, valida, exporta env

Level 3 - Infraestrutura de Serviço
├── core/identity/                           IdentityFactory + providers
├── auth/hash/                               HasherFactory + providers
└── databases/                               URI factories + connections

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
2. env.ts agrega todos os schemas Zod
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
│   ├── constants/env.constants.ts   ← Level 0: verdade absoluta
│   ├── logger.ts                    ← Level 0: Pino com redact
│   ├── schemas/                     ← Level 1: Zod schemas
│   │   ├── dbEnv.schema.ts
│   │   ├── hasherEnv.schema.ts
│   │   ├── idEnv.schema.ts
│   │   └── memDbEnv.schema.ts
│   └── env.ts                       ← Level 2: agregador + validação
│
├── shared/types/                    ← Level 1: sistema de tipos
│   ├── index.ts                     ← Barrel export (@Types)
│   ├── brand.type.ts                ← Brand<T, B> genérico
│   ├── identity.type.ts             ← AppID, NanoIDString
│   ├── security.types.ts            ← HashedString, DatabaseURI, Type Guards
│   ├── pii.types.ts                 ← CPF branded type
│   ├── primitives.type.ts           ← NonEmptyString, PositiveInteger
│   └── static.types.ts              ← DeepReadonly<T>, utility types
│
├── validations/                     ← Level 1: classes validadoras
│   ├── Cpf.validations.ts
│   ├── Password.validations.ts
│   ├── DatabaseUsername.validation.ts
│   ├── DatabasePassword.validation.ts
│   └── DatabaseInMemoryUri.validation.ts
│
├── auth/hash/                       ← Level 3: criptografia
│   ├── contracts/IHasher.contract.ts
│   ├── hashesFactory.auth.ts        ← Factory: seleciona provider via env
│   └── providers/
│       ├── Argon2.service.auth.ts
│       └── Bcrypt.service.auth.ts
│
├── core/identity/                   ← Level 3: geração de IDs
│   ├── contracts/IIdentyti.contract.ts
│   ├── IdentityFactory.identity.ts  ← Factory: seleciona provider via env
│   └── providers/
│       ├── NanoId.service.identity.ts
│       ├── UuidV4.service.identity.ts
│       └── UuidV7.service.identity.ts
│
├── databases/                       ← Level 3: persistência
│   ├── uri/
│   │   ├── contracts/
│   │   │   ├── BaseUri.contract.ts      ← Contrato abstrato para DB persistente
│   │   │   └── BaseMemUri.contract.ts   ← Contrato abstrato para DB em memória
│   │   ├── mongodb.uri.ts               ← Implementação MongoDB
│   │   └── valkey.uri.ts                ← Implementação Valkey/Redis
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
├── utils/                           ← Utilitários transversais
│   ├── masks.util.ts
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
1. Crie `src/databases/uri/postgres.uri.ts`
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
│   ├── env/loadTestEnv.ts           ← Carrega .env.test com isolamento
│   └── mocks/test.fixtures.ts       ← Stubs reutilizáveis
└── unit/                            ← Espelho de src/
    ├── auth/hash/                   ← Testa contratos + providers
    ├── configs/                     ← Testa schemas + env + logger
    ├── core/identity/               ← Testa contratos + providers
    ├── databases/                   ← Testa URI contracts + connections
    ├── resources/user/              ← Testa entidade User
    ├── shared/types/                ← Testa Type Guards
    ├── utils/                       ← Testa utilitários
    └── validations/                 ← Testa classes validadoras
```

**Padrões de teste:**
- Cada teste de contrato usa **Stubs** que estendem o contrato abstrato - testa o contrato, não a implementação
- `vi.mock('@Configs/env.js')` é usado em testes de Type Guards para evitar que `env.ts` chame `process.exit(1)` durante a avaliação
- O `.env.test` fornece valores válidos mas fictícios para todas as variáveis

**Executar:** `npx vitest run` - 267 testes, ~2 segundos

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
| [dividas_tecnicas.md](./dividas_tecnicas.md) | Bugs conhecidos, TODOs, dívidas de segurança |
| [ToDo.md](./ToDo.md) | Roadmap de implementações futuras |
| [readme.md](../readme.md) | Instruções de setup e uso |

---

## Como Manter Este Documento

Este documento deve ser atualizado quando:

- **Novo módulo/diretório é criado** → Atualize o mapa de diretórios e a pirâmide se necessário
- **Nova ADR é criada** → Adicione referência na seção de filosofias se for uma regra inviolável
- **Novo contrato abstrato é criado** → Adicione guia de extensão na seção "Contratos e Como Estendê-los"
- **Stack muda** (ex: troca de Express por Fastify) → Atualize a tabela de stack

**Não é necessário atualizar para:**
- Mudanças internas em implementações existentes
- Novos testes (a contagem exata não precisa estar atualizada)
- Correções de bugs

**Dica de manutenção:** Ao final de cada sprint/ciclo de desenvolvimento significativo, releia este documento em 2 minutos. Se algo parecer desatualizado, corrija. É mais fácil manter atualizado incrementalmente do que reconstruir do zero.
