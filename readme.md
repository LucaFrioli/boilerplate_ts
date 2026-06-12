<div align="center">

# 🏗️ WildcardBoiler — Enterprise API Boilerplate

### Construído em TypeScript. Pensado como Rust. Testado como produção.

[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Express](https://img.shields.io/badge/Express-5.2-000000?style=for-the-badge&logo=express&logoColor=white)](https://expressjs.com/)
[![MongoDB](https://img.shields.io/badge/MongoDB-9.2-47A248?style=for-the-badge&logo=mongodb&logoColor=white)](https://mongoosejs.com/)
[![Vitest](https://img.shields.io/badge/Vitest-4.1-6E9F18?style=for-the-badge&logo=vitest&logoColor=white)](https://vitest.dev/)
[![Zod](https://img.shields.io/badge/Zod-4.3-3E67B1?style=for-the-badge&logo=zod&logoColor=white)](https://zod.dev/)
[![ESM](https://img.shields.io/badge/ESM-Native-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black)](https://nodejs.org/api/esm.html)
[![Node](https://img.shields.io/badge/Node.js-LTS-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)](https://nodejs.org/)
[![TDD](https://img.shields.io/badge/TDD-Obrigatório-e74c3c?style=for-the-badge)](./docs/Adrs.md)

---

**Um boilerplate que não entrega o mínimo — entrega o estado da arte.**

*Arquitetura de referência para APIs Node.js de nível enterprise com DDD, Branded Types,
<br>TDD obrigatório, segurança criptográfica configurável e Fail-Fast Design.*

[Filosofia](#-filosofia) •
[O Problema](#-o-problema-que-este-boilerplate-resolve) •
[Arquitetura](#-arquitetura) •
[Segurança](#-segurança-de-tipo--make-invalid-states-unrepresentable) •
[Quick Start](#-quick-start) •
[Roadmap](#-roadmap)

</div>

---

## 🎯 O Problema que Este Boilerplate Resolve

A maioria dos boilerplates Node.js/TypeScript entrega o **mínimo viável**: um Express com rotas, um ORM conectado e talvez um middleware de autenticação. O desenvolvedor herda uma base frágil onde:

- ❌ Tipos primitivos (`string`) circulam livremente — uma senha vira `string`, um ID vira `string`, uma URI vira `string`. Tudo é intercambiável e tudo pode ser confundido.
- ❌ Validações existem na borda (controller) mas desaparecem nas camadas internas.
- ❌ Erros silenciosos mantêm o processo vivo em estado corrompido.
- ❌ Trocar de provedor de hash ou de banco de dados exige refatoração em cascata.
- ❌ Testes são um afterthought — código nasce sem contrato e sem garantia.
- ❌ A configuração está espalhada em dezenas de arquivos sem hierarquia.

**Este boilerplate foi construído para resolver cada um desses problemas de forma estrutural, não paliativa.**

| Problema Comum | Solução Neste Boilerplate |
|---|---|
| Tipos primitivos genéricos | **Branded Types** — `AppID ≠ DatabaseID ≠ HashedString` em compile-time |
| Validação apenas na borda | **Defense in Depth** — Zod valida em **todas** as fronteiras (env, entity, DTO, URI) |
| Processo zumbi após erro | **Fail-Fast** — todos os handlers retornam `: never` e matam o processo |
| Trocar provider = refatorar tudo | **Factory Pattern** — trocar de Argon2 para Bcrypt = **mudar 1 variável de ambiente** |
| Testes como afterthought | **TDD obrigatório** — contrato testado antes da implementação (25 suítes, 267 testes) |
| Configuração descentralizada | **Zero-Config DX** — um `.env` controla hasher, banco, IDs, segurança — tudo |

---

## 💡 Filosofia

> *"Construir em TypeScript como se estivéssemos em Rust,*
> *validar como se estivéssemos em produção,*
> *e documentar como se estivéssemos ensinando."*

Este projeto não é apenas um boilerplate — é uma **arquitetura de referência** e um **objeto de estudo** que funciona como ponte conceitual para linguagens de baixo nível. Cada decisão arquitetural é documentada em um [ADR (Architectural Decision Record)](./docs/Adrs.md) e cada padrão é escolhido para ensinar rigor enquanto entrega valor real.

### Os Pilares

<table>
<tr>
<td width="50%">

#### 🧬 Make Invalid States Unrepresentable
Inspiração direta de Rust. Se o código compila, ele é seguro. Branded Types impedem que um `AppID` seja passado onde se espera um `DatabaseID`, mesmo ambos sendo `string` por baixo.

</td>
<td width="50%">

#### 🛡️ Defense in Depth
Nunca confie em uma única camada. Uma senha passa por **5 barreiras** antes de chegar ao banco: validação de força → hash criptográfico → verificação de formato → validação de entidade → freeze de imutabilidade.

</td>
</tr>
<tr>
<td>

#### 💀 Fail-Fast Design
É melhor o processo morrer e ser reiniciado pelo orquestrador do que permanecer em estado inválido. Todos os handlers de erro retornam `: never` — um estado inconsistente **nunca** avança pelo event-loop.

</td>
<td>

#### 📜 Contracts-First
O contrato define o que o sistema pode fazer. A implementação apenas preenche o como. Toda camada segue: `Interface → Abstract Class → Concrete Provider`. Qualquer novo provider é **drop-in** sem risco de regressão.

</td>
</tr>
<tr>
<td>

#### ⚙️ Zero-Config DX
A infraestrutura se auto-constrói a partir do `.env`. Trocar de Argon2 para Bcrypt? Uma variável. Trocar de NanoID para UUIDv7? Uma variável. Schemas Zod centralizados validam tudo no boot — se algo estiver errado, o processo nem sobe.

</td>
<td>

#### 🧪 TDD Obrigatório
Não é sugestão — é lei (ADR 010). O teste do contrato precede a implementação. 25 suítes com 267 testes, fixtures centralizadas, ambiente isolado com 3 camadas de carregamento de env, e hasher configs reduzidos para velocidade.

</td>
</tr>
<tr>
<td>

#### 🦀 Preparação para Rust
A arquitetura simula conceitos-chave de Rust em TypeScript: `Brand<T,B>` = Newtype Pattern, `safeParse()` = `Result<T,E>`, `Object.freeze` = Ownership, ESLint strict = rigor de compilador. Cada ADR documenta o porquê.

</td>
<td>

#### 🤖 Pair Programming com IA
Ecossistema MCP (Model Context Protocol) integrado com 7 servidores locais: memória de longo prazo, inspeção de bancos, Docker, TypeScript e ESLint. Tudo roda na máquina do desenvolvedor — **dados nunca saem para terceiros**.

</td>
</tr>
</table>

---

## 🏛️ Arquitetura

> 📖 Para uma visão técnica aprofundada (boot flow, pirâmide de níveis, invariantes, guia de extensão de contratos), consulte o **[ARCHITECTURE.md](./docs/ARCHITECTURE.md)**.

### Visão Geral do Sistema

```
src/
├── app.ts                        # Bootstrap Express (middlewares + rotas)
├── server.ts                     # Entry point: conecta DB → listen
│
├── configs/                      # 🔧 Módulo de Configuração Centralizado
│   ├── env.ts                    # "Painel de Controle" — agrega todos os schemas
│   ├── logger.ts                 # Pino: dual-target (console + arquivo)
│   ├── constants/                # Level 0 — constantes puras sem deps
│   │   └── env.constants.ts      # Arrays, regex, protocolos suportados
│   └── schemas/                  # Schemas Zod por domínio
│       ├── dbEnv.schema.ts       # Banco principal
│       ├── hasherEnv.schema.ts   # Criptografia
│       ├── idEnv.schema.ts       # Identificadores
│       └── memDbEnv.schema.ts    # Banco em memória
│
├── shared/                       # 🏷️ Componentes Compartilhados (Level 1)
│   ├── types/                    # Sistema de Tipos (Branded + Guards - @Types)
│   │   ├── brand.type.ts         # Brand<T, B> — fundação
│   │   ├── identity.type.ts      # AppID, DatabaseID + guards
│   │   ├── security.types.ts     # HashedString, DatabaseURI + guards
│   │   ├── pii.types.ts          # CPF/Email Branded Types e Type Guards
│   │   └── primitives.type.ts    # StringWithLength<N>, NonEmptyString
│   │
│   └── masks/                    # 🛡️ Máscaras de Anonimização (@Masks)
│       ├── index.ts              # Entry point
│       └── anonimization.masks.ts # maskPII + maskLogDatabaseUsername
│
├── core/identity/                # 🔑 Geração de Identificadores
│   ├── contracts/                # BaseIdentityGenerator (abstrata)
│   ├── providers/                # NanoID · UUIDv4 · UUIDv7
│   └── IdentityFactory.ts        # Factory: env → provider automático
│
├── auth/hash/                    # 🔒 Criptografia de Senhas
│   ├── contracts/                # BaseHasher (abstrata)
│   ├── providers/                # Argon2 · Bcrypt
│   └── hashesFactory.ts          # Factory: env → provider automático
│
├── databases/                    # 🗄️ Infraestrutura de Banco de Dados
│   ├── uri/                      # Construção e validação de URIs
│   │   ├── contracts/            # BaseUri · BaseMemUri (abstratas)
│   │   ├── mongodb.uri.ts        # dev, SRV, multi-host, single-host
│   │   └── valkey.uri.ts         # TCP/IP · Unix Domain Socket (UDS)
│   └── connections/              # Gerenciamento de conexões
│       ├── contracts/            # BaseConnectDb (abstrata)
│       └── mongodb.database.ts   # Mongoose connect/disconnect
│
├── resources/                    # 📦 Entidades de Domínio (DDD)
│   ├── contracts/                # BaseEntity<T, Tout> — "Classe Ouro"
│   └── User/                     # Root Aggregate
│       ├── User.ts               # Rich Domain Model (268 linhas)
│       ├── User.interface.ts     # UserI · PublicUserI · CreateUserDTO
│       └── User.validation.ts    # Schemas Zod para User
│
├── validations/                  # ✅ Validadores de Negócio (Level 1 — peers de types/)
│   ├── Cpf.validations.ts        # Validação matemática de dígitos
│   ├── Password.validations.ts   # 3 níveis: low · medium · strong
│   ├── DatabaseUsername.validation.ts  # Morfologia de usernames de DB
│   ├── DatabasePassword.validation.ts  # Força de senhas de DB
│   └── DatabaseInMemoryUri.validation.ts  # URI + Unix Socket para cache
│
└── utils/                        # 🛠️ Utilitários
    └── dateManager.util.ts       # ISO, fileSafe, display, validation
```

### Hierarquia de Dependências (Pirâmide — ADR 012)

O nível de um módulo é definido pelo **nível mais alto que ele importa + 1** ([ADR 012](./docs/Adrs.md#adr-012-hierarquia-de-dependências-baseada-em-imports-reais-pirâmide-de-níveis-v2)):

```
                           ┌─────────────┐
                           │  server.ts  │  Level 5 — Bootstrap
                           └──────┬──────┘
                                  │
                           ┌──────┴──────┐
                           │ resources/  │  Level 4 — Domínio
                           └──────┬──────┘
                                  │
                     ┌────────────┼────────────┐
                     │            │            │
               ┌─────┴──────┐ ┌───┴───┐ ┌──────┴──────┐
               │ identity/  │ │ auth/ │ │  databases/ │  Level 3 — Infraestrutura
               └─────┬──────┘ └───┬───┘ └──────┬──────┘
                     │            │            │
                     └────────────┼────────────┘
                                  │
                           ┌──────┴──────┐
                           │  configs/   │
                           │   env.ts    │  Level 2 — Agregador de Configuração
                           └──────┬──────┘
                                  │
              ┌────────────┬────────────┬────────────┐
              │            │            │            │
        ┌─────┴──────┐ ┌───┴────┐ ┌─────┴────┐ ┌─────┴──────┐
        │  schemas/  │ │ types/ │ │  masks/  │ │validations/│  Level 1 — Peers
        └─────┬──────┘ └───┬────┘ └─────┬────┘ └─────┬──────┘
              │            │            │            │
              └────────────┴────────────┴────────────┘
                                  │
                          ┌───────┴───────┐
                          │  constants/   │  Level 0 — Folhas Puras
                          │  logger.ts    │  (zero imports internos)
                          └───────────────┘
```

> **Invariante (ADR 012):** `types/` pode importar de `validations/`, mas `validations/` **nunca** importa de `types/`. Essa regra é enforced por ESLint (`no-restricted-imports`) para prevenir ciclos ESM.

### Padrão Contracts-First

Toda camada de infraestrutura segue a mesma receita:

```
Interface (contrato público)
    └── Abstract Class (lógica compartilhada + logging + error handling)
            ├── Provider A (implementação concreta)
            ├── Provider B (implementação concreta)
            └── Factory (resolve provider via env.VARIABLE)
```

**Resultado prático:** adicionar um novo hasher (ex: Scrypt) requer:
1. Criar `Scrypt.service.auth.ts` implementando `BaseHasher`
2. Adicionar `'scrypt'` no array `supportedHashProviders`
3. Registrar na Factory

Zero mudanças em código consumidor. Zero risco de regressão. TDD garante o contrato.

---

## 🔐 Segurança de Tipo — *Make Invalid States Unrepresentable*

O sistema de tipos deste boilerplate vai além do TypeScript convencional. Através de **Branded Types** (tipos nominais), criamos distinções que o compilador respeita:

```typescript
// ❌ TypeScript convencional — tudo é "string"
function findUser(id: string, hash: string, uri: string) { ... }
findUser(databaseUri, appId, passwordHash) // ← compila sem erro! 💀

// ✅ Este boilerplate — cada tipo tem identidade
function findUser(id: DatabaseID, hash: HashedString, uri: DatabaseURI) { ... }
findUser(databaseUri, appId, passwordHash) // ← ERRO DE COMPILAÇÃO 🛡️
```

### Branded Types do Sistema

| Tipo | O que protege | Guard Runtime |
|---|---|---|
| `AppID` | IDs públicos (URLs, frontend) | `isAppID()` — regex dinâmica |
| `DatabaseID` | IDs internos (BD, indexação) | `isDatabaseID()` — regex UUIDv7/v4 |
| `HashedString` | Senhas já criptografadas | `isHashedString()` — regex PHC/MCF |
| `DatabaseURI` | URIs de conexão com banco | `isDatabaseUri()` — URL parse + protocolo |
| `MemDatabaseURI` | URIs de cache (Redis/Valkey) | `isMemDatabaseUri()` — URL parse + protocolo |
| `StringWithLength<N>` | Strings com tamanho exato | `StringWithLengthGen()` — validação runtime |

Cada tipo tem um **Type Guard pareado** que valida em runtime aquilo que o TypeScript apaga na compilação. Estados inválidos se tornam **irrepresentáveis**.

---

## 🔒 Segurança Criptográfica

### Hashing de Senhas

O boilerplate inclui dois provedores de hash prontos para produção, selecionáveis via variável de ambiente:

| Provider | Algoritmo | Padrão | Configurável via `.env` |
|---|---|---|---|
| **Argon2** (padrão) | Argon2id | RFC 9106 / OWASP | Memory, Time Cost, Parallelism, Pepper, Salt |
| **Bcrypt** | Bcrypt 2b | Modular Crypt Format | Rounds, Pepper |

**Segurança em camadas:**
- 🌶️ **Pepper** — segredo estático (`HASHER_SECURITY_PEPPER`) validado com `passwordStrength('strong')` em produção
- 🧂 **Salt** — gerado dinamicamente por operação via `crypto.randomBytes()`
- 🔍 **Regex de validação** — cada hash é verificado contra formato PHC/MCF antes de ser aceito
- ☠️ **Kill switch** — pepper inseguro em produção → `process.exit(1)` imediato

### Geração de Identificadores

Três provedores de ID, todos com implementação **zero-dependências externas**:

| Provider | Uso recomendado | Algoritmo |
|---|---|---|
| **NanoID** | IDs públicos (URLs amigáveis) | `crypto.randomBytes` + bitmask sobre alfabeto customizável |
| **UUIDv7** | IDs de banco (indexação temporal, B-Tree friendly) | Timestamp 48-bit + random 74-bit (bitwise manual) |
| **UUIDv4** | Fallback universal | `crypto.randomUUID()` |

---

## 🧪 Testes

O boilerplate adota **TDD obrigatório** ([ADR 010](./docs/Adrs.md#adr-010-adoção-de-metodologia-tdd)) com Vitest:

```
tests/
├── helpers/
│   ├── env/loadTestEnv.ts        # Carregamento de .env.test em 3 camadas
│   └── mocks/test.fixtures.ts    # Fixtures centralizadas
├── unit/                         # Espelhamento de src/
│   ├── auth/hash/                # Argon2 · Bcrypt · Factory
│   ├── configs/schemas/          # Todos os 4 schemas Zod
│   ├── core/identity/            # NanoID · UUID · Factory
│   ├── resources/user/           # Entity · Validations
│   ├── shared/types/             # Identity · Primitives · Security
│   ├── utils/                    # DateManager
│   └── validations/              # Password
└── integration/
    └── databases/                # MongoDB URI formation
```

### Ambiente de Teste Isolado

O sistema de carregamento de variáveis de teste opera em **3 camadas**, garantindo que módulos ESM nunca falhem por falta de variáveis:

1. **`loadEnv()` no processo principal** — popula o CLI do Vitest
2. **`test.env` inline no config** — popula cada worker antes de qualquer import
3. **`setupFiles`** — `.env.test` com `override: true` como linha final de defesa

```bash
# Executar todos os testes
npm test

# Modo watch (re-executa ao salvar)
npm run test:watch

# Relatório de cobertura (text + JSON + HTML)
npm run test:coverage
```

---

## 🚀 Quick Start

### Pré-requisitos

- Node.js LTS (≥ 20)
- MongoDB rodando localmente (ou via Docker)

### Instalação

```bash
# Clone o repositório
git clone https://github.com/LucaFrioli/boilerplate_ts.git
cd boilerplate_ts

# Instale as dependências
npm install

# Configure o ambiente
cp .env.example .env
cp .env.test.example .env.test
# ⚠️ Ajuste as variáveis no .env conforme sua máquina
```

### Comandos

| Comando | Descrição |
|---|---|
| `npm run dev` | Servidor em modo desenvolvimento (hot-reload via tsx) |
| `npm run build` | Build de produção (lint + tsup com minificação) |
| `npm start` | Executa o build de produção |
| `npm test` | Executa todos os testes |
| `npm run test:watch` | Testes em modo watch |
| `npm run test:coverage` | Relatório de cobertura completo |
| `npm run lint` | Verifica formatação + ESLint |
| `npm run lint:fix` | Corrige formatação + ESLint automaticamente |

### Variáveis de Ambiente Essenciais

```env
# Aplicação
NODE_ENV=development
PORT=3000
APP_NAME=MeuApp

# Banco de Dados
DATABASE_TYPE=mongodb          # mongodb | postgres
DATABASE_HOST=localhost
DATABASE_PORT=27017
DATABASE_NAME=meu_banco

# Segurança (Hasher)
HASHER_PROVIDER=argon2         # argon2 | bcrypt
HASHER_SECURITY_PEPPER=MeuPepperSecreto@SHA256  # ⚠️ NUNCA perca este valor e o altere para um ssecreto só seu =:-)

# Identificadores
IDENTIFIER_PATTERN=nanoid      # nanoid | uuidv4 | uuidv7
DATABASE_ID_DEFAULT=uuidv7     # ID para chaves primárias do banco
```

> **📖 Documentação completa de cada variável:** veja [`.env.example`](./.env.example) e [`.env.test.example`](./.env.test.example)

---

## 📐 Decisões Arquiteturais (ADRs)

Cada decisão técnica é registrada formalmente em [docs/Adrs.md](./docs/Adrs.md):

| ADR | Decisão | Por quê |
|---|---|---|
| **001** | Linting Estrito + Coerção Explícita | Prepara para o rigor de Rust |
| **002** | Branded Types para Identidade | Segurança matemática em compile-time |
| **003** | Fail-Fast com `: never` | Processos zumbis são piores que crashes |
| **004** | `Pick<typeof env, keys>` | Segregação de interfaces — zero acoplamento |
| **005** | Aliases sobre caminhos relativos | Elegância > estabilidade do linter |
| **006** | URI Factory ≠ Connection Factory | SRP — cada fábrica faz uma coisa |
| **007** | Schemas em `configs/` | Zero-Config — `env.ts` é o painel de controle |
| ~~**008**~~ | ~~Constants como Level 0~~ | *Depreciada → substituída pela ADR 012* |
| **009** | Type Guards sobre `as` | Segurança de runtime alinhada com compile-time |
| **010** | TDD obrigatório | Contrato testado antes da implementação |
| **011** | Zero Side-Effects em Barrel Exports | Lazy Singleton para isolamento de testes |
| **012** | Pirâmide de Níveis v2 (por imports reais) | Corrige hierarquia + invariante unidirecional |

---

## 🤖 Integração com IA (MCP)

> **⚠️ 100% opcional** — não afeta build, testes ou execução.

O boilerplate inclui configuração para o [Model Context Protocol](https://modelcontextprotocol.io/), permitindo que assistentes de IA (Cursor, Cline, Claude Desktop) conectem diretamente à infraestrutura local:

| Servidor | Capacidade |
|---|---|
| 🧠 **memory** | Memória de longo prazo sobre regras de negócio |
| 🍃 **mongodb** | Inspeção direta do banco local |
| 🐘 **postgres** | Validação de migrações SQL |
| ⚡ **redis** | Inspeção de cache |
| 🐳 **docker** | Gerenciamento de containers |
| 📝 **typescript** | Análise de código em tempo real |
| 🔍 **eslint** | Validação de regras de qualidade |

Configuração em [`.mcp/mcp_config.local.json`](./.mcp/mcp_config.local.json). Dados nunca saem da máquina local.

---

## 🗺️ Roadmap

### ✅ Fase Atual — Fundação Enterprise

- [x] Sistema de Branded Types completo com Type Guards
- [x] Criptografia configurável (Argon2 + Bcrypt) via Factory
- [x] Geração de IDs (NanoID + UUIDv4 + UUIDv7) via Factory
- [x] Validação de ambiente centralizada com Zod
- [x] Logging estruturado com Pino (console + arquivo)
- [x] Entidade User como Root Aggregate (Rich Domain Model)
- [x] MongoDB: URI builder + Connection manager
- [x] Valkey/Redis: URI builder com suporte TCP/IP + Unix Domain Socket
- [x] Validadores dedicados (CPF, Password, DatabaseUsername, DatabasePassword, DatabaseInMemoryUri)
- [x] TDD com 25 suítes de teste e 267 testes (cobertura V8)
- [x] ESLint strictTypeChecked + Prettier + boundary enforcement (ADR 012)
- [x] 12 ADRs documentados
- [x] Documentação arquitetural completa ([ARCHITECTURE.md](./docs/ARCHITECTURE.md))
- [x] Ecossistema MCP integrado

### 🔄 Próxima Fase — Infraestrutura Completa

- [ ] Valkey/Redis: Connection manager (URI builder ✅ concluído)
- [ ] Sistema de Login/Autenticação (JWT / Sessions)
- [ ] Rotas HTTP com controllers e middlewares
- [ ] Repositórios (Repository Pattern) para User
- [ ] Validação de CPF via API da Receita Federal
- [ ] Branded Types para Email e CPF (`ValidatedEmail`, `ValidatedCPF`)
- [ ] Assert functions (`assertAppID`, `assertDatabaseID`)
- [ ] CI/CD pipeline com lint + testes como gate de merge

### 🔮 Visão de Longo Prazo

- [ ] PostgreSQL como provider de banco alternativo
- [ ] Sistema de Domain Events para comunicação entre aggregates
- [ ] Rate limiting e proteção contra DDoS
- [ ] Observabilidade completa (OpenTelemetry / Prometheus)
- [ ] CI/CD pipeline com GitHub Actions
- [ ] Docker Compose para ambiente de desenvolvimento completo
- [ ] Documentação de API com Swagger/OpenAPI
- *... E muito mais por vir*

---

## 📄 Licença

Este projeto está sob a licença ISC. Veja o arquivo [LICENSE](./license) para detalhes.

---

<div align="center">

*Feito com rigor arquitetural, segurança de tipo, e a convicção de que<br>um boilerplate enterprise não deveria entregar menos que o estado da arte.*

**[⬆ Voltar ao topo](#️-WildcardBoiler--enterprise-api-boilerplate)**

</div>

