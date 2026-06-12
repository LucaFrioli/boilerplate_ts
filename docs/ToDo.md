# 📋 Roadmap de Desenvolvimento — WildcardBoiler Enterprise API Boilerplate

> **Objetivo:** Organizar o escopo de forma clara, priorizando o que é **essencial** para uma versão 1.0.0
> funcional, demonstrável em portfólio, enterprise-ready e pronta para escalar.

---

## 🎯 Visão para a V1.0.0

**O que a V1.0.0 deve demonstrar:**
Um boilerplate enterprise completo que um desenvolvedor possa clonar, configurar via `.env`, e ter:
uma API REST funcional com **autenticação**, **CRUD de usuário**, **perfil de usuário**, segurança real
(hash, sessão, Branded Types), persistência em MongoDB, cache em Valkey/Redis, e uma arquitetura
extensível via contratos abstratos — tudo com TDD.

**Contexto internacional:** O boilerplate opera em cenário 🇧🇷 Brasil + 🇮🇹 Itália. Por isso, o sistema
de documentos (CPF, CNPJ, Codice Fiscale, Partita IVA) é **escopo V1** — não é feature de domínio,
é **infraestrutura de identificação** que o boilerplate precisa cobrir para ser funcional em projetos reais.

**O que a V1.0.0 NÃO precisa ter:**
Pagamentos (Stripe, Adyen, cripto), consumo de APIs externas (Receita Federal, Agenzia delle Entrate),
analytics avançados, ou profilamento de pessoa/empresa. Isso é camada de domínio que escala a
partir da arquitetura, mas não a define.

---

## Convenções

- `[x]` — Concluído
- `[/]` — Em progresso
- `[ ]` — Pendente (escopo V1.0.0)
- `[🔮]` — Adiado para V2+ (fora do escopo V1)

---

## Fase 0 — Fundação ✅ (Concluído)

> *Tudo que já foi construído e testado. Marcado para rastreabilidade.*

### Configuração & Ambiente
- [x] Sistema de validação de env centralizado via Zod (`configs/env.ts`)
- [x] Schemas separados por domínio (`dbEnv`, `hasherEnv`, `idEnv`, `memDbEnv`)
- [x] Constantes Level 0 sem dependências circulares (`configs/constants/`)
- [x] Logger estruturado Pino com dual-target (console + arquivo)
- [x] EditorConfig + Prettier + ESLint `strictTypeChecked`

### Sistema de Tipos
- [x] `Brand<T, B>` — fundação de tipos nominais
- [x] `AppID` / `DatabaseID` com Type Guards + regex dinâmica
- [x] `HashedString` com guard baseado em provider da env
- [x] `DatabaseURI` / `MemDatabaseURI` / `Uri` com guards
- [x] `StringWithLength<N>` com validação runtime
- [x] `DeepReadonly<T>` para imutabilidade de DTOs
- [x] Barrel export em `shared/types/index.ts`

### Identidade (ID Generation)
- [x] Contrato `IIdentityProvider` + `BaseIdentityGenerator`
- [x] Provider NanoID (implementação zero-deps via `crypto.randomBytes`)
- [x] Provider UUIDv4 (wrapper `crypto.randomUUID`)
- [x] Provider UUIDv7 (implementação manual com timestamp bitwise)
- [x] `IdentityFactory` com lazy singleton + exportações `Id` / `DBid`
- [x] Testes unitários para todos os providers + factory

### Hashing Criptográfico
- [x] Contrato `IHasherProvider` + `BaseHasher` com Fail-Fast
- [x] Provider Argon2 (argon2id, pepper, salt dinâmico, configs da env)
- [x] Provider Bcrypt (pepper concatenado, rounds da env)
- [x] `HasherFactory` com singleton + exportação `Hasher`
- [x] Kill switch: pepper inseguro em produção → `process.exit(1)`
- [x] Testes unitários para Argon2, Bcrypt e Factory

### Banco de Dados — MongoDB
- [x] Contrato `BaseUri` com validação de env em 2 camadas
- [x] `MongoConnectionString` — dev, SRV, multi-host, single-host
- [x] Contrato `BaseConnectDb`
- [x] `MongodbConnect` com Fail-Fast
- [x] Teste de integração para formação de URI

### Entidade User (Root Aggregate)
- [x] Contrato `BaseEntity<T, Tout>` com `toDatabaseDTO` / `toPublicDTO`
- [x] `UserI` / `PublicUserI` / `CreateUserExpectedData` interfaces
- [x] `User.ts` — Rich Domain Model com métodos de negócio
- [x] `User.validation.ts` — schemas Zod com Branded Types
- [x] Factory method `User.create()` (hash + IDs + validação)
- [x] Testes unitários Entity + Validations

### Validadores de Negócio
- [x] `CpfValidator.validateAndSanitize()` — validação matemática
- [x] `passwordStrength()` — 3 níveis (low / medium / strong) + personalização
- [x] `DateManager` — toIsoString, toFileSafe, toDisplay, isDate
- [x] Teste unitário para Password + DateManager

### Infraestrutura de Testes
- [x] Vitest com env em 3 camadas (process.env → test.env inline → setupFiles)
- [x] `loadTestEnv.ts` — carregador com override e mensagem de erro clara
- [x] `test.fixtures.ts` — dados fictícios centralizados
- [x] Coverage V8 (text + JSON + HTML)

---

## Fase 1 — Dívidas Técnicas & Refinamentos 🔧

> *Corrigir inconsistências e gaps identificados na codebase existente antes de avançar.*
> *Isso garante que as fases seguintes construam sobre uma base sólida.*

### Correções de Bugs
- [x] Corrigir `changeEmail()` no `User.ts` — passa `string` onde `z.object` espera `object`
- [x] Corrigir `validateSpecificEnvValues()` em `mongodb.uri.ts` — lança `throw new Error('Method not implemented.')` (dead-code ou implementar de fato)

### Refinamento de Tipos (Branded Types faltantes)
- [x] Criar `ValidatedCPF = Brand<string, 'ValidatedCPF'>` + guard + atualizar `UserI.cpf`
- [x] Criar `ValidatedEmail = Brand<string, 'ValidatedEmail'>` + guard + atualizar `UserI.email`
- [x] Avaliar `ValidatedUsername` (menor prioridade — apenas por consistência) *construida integração com User.entity e types + type guard e type asserts*

### Refinamento de Utilitários de Tipo
- [ ] Ampliar `DeepReadonly<T>` para cobrir `Date`, `Map`, `Set`, `Array` corretamente
- [ ] Criar assert functions: `assertAppID()`, `assertDatabaseID()`, `assertHashedString()`

### Testes faltantes
- [x] Criar teste unitário dedicado para `CpfValidator`
- [x] Criar testes para `isMemDatabaseUri()` (protocolos redis, rediss, valkey, valkeys)
- [ ] Avaliar criar `isAnyValidHash()` para cenários de migração de hasher provider

### Dívidas Técnicas já registradas
- [x] Guard de inicialização para `MEM_DB_INDEX_OR_PATH` em `memDbEnv.schema.ts`
- [ ] Ponderar e adicionar logs informativos em métodos de `UserMethods` na entidade `User`
- [/] Refatorar Hasher, Identity e verificar se refatoração quebrou algo
- [ ] Adicionar lógica no logger para que nada seja logado no console em ambientes diferentes de dev e test
- [ ] ~~Revisar mascaras de dados espalhadas por toda a aplicação e centraliza-las em `masks.util.ts`~~ **_depreciado por conta da decisão arquitetural de criar uma pasta compartilhada de máscaras_**
- [/] Revisar máscaras de dados espalhadas por toda a aplicação e popular a pasta de máscaras + testes automatizados


### Correção de Typos em nomes de arquivo/tipo
- [ ] `StringWithLegth` → `StringWithLength` (arquivo + tipo + função)
- [ ] `IIdentyti.contract.ts` → `IIdentity.contract.ts`
- [ ] Revisar typos em comentários (`recivedTypo`, `recivedLegth`, etc.)

---

## Fase 2 — Banco de Dados em Memória (Valkey/Redis) 🗄️

> *Completa a infraestrutura de cache/sessão. Necessária antes de implementar autenticação.*

### URI Builder
- [x] Implementar `BaseMemUri.init()` com lógica de validação (hoje está vazio)
- [x] Criar `valkey.uri.ts` implementando `BaseMemUri` (construção de URI Valkey/Redis)
- [x] Adicionar validações específicas de parâmetros (protocolo, porta, senha em prod)
- [x] Guard de `MEM_DB_INDEX_OR_PATH` — validar se é inteiro (index) ou caminho Unix (.sock)
- [x] Testes unitários + integração para formação de URI Valkey

### Conexão
- [ ] Criar `valkey.database.ts` implementando `BaseConnectDb` (ou contrato dedicado para mem-DB)
- [ ] Métodos: `connect()`, `disconnect()`, `isConnected()` com Fail-Fast
- [ ] Testes de integração para conexão/desconexão

### Fábricas de Conexão
- [ ] `DatabaseConnectionFactory` — resolve provider de banco principal via `env.DATABASE_TYPE`
- [ ] `MemDatabaseConnectionFactory` — resolve provider de cache via `env.MEM_DB_TYPE`
- [ ] Refatorar `server.ts` para usar as fábricas em vez de instanciar `MongodbConnect` diretamente
- [ ] Adicionar env flag `MEM_DB_ENABLED` (**opt-in**) para controlar se a conexão de cache sobe ou não

---

## Fase 3 — Camada HTTP (Rotas, Controllers, Middlewares) 🌐

> *Dá vida à API — torna o boilerplate funcional como uma REST API real.*

### Infraestrutura de Rotas
- [ ] Definir contrato `BaseController` para padronizar controllers
- [ ] Definir contrato `BaseMiddleware` para middlewares reutilizáveis
- [ ] Criar middleware de error handling global (catch-all Express com logging Pino)
- [ ] Criar middleware de validação de request body via Zod schema genérico
- [ ] Implementar `app.ts` routes com versionamento (`/api/v1/...`)

### Rotas de User
- [ ] `POST /api/v1/users` — criação de usuário (consome `User.create()`)
- [ ] `GET /api/v1/users/:id` — buscar usuário por publicId (retorna `PublicUserI`)
- [ ] `PATCH /api/v1/users/:id` — atualizar username/email
- [ ] `DELETE /api/v1/users/:id` — soft delete (`deleteUser()`)
- [ ] Testes de integração para cada rota

### Repositório (Repository Pattern)
- [ ] Definir contrato `IUserRepository` (CRUD abstrato, agnóstico ao banco)
- [ ] Implementar `MongoUserRepository` com Mongoose
- [ ] Testes unitários com mock do repositório

---

## Fase 4 — Autenticação & Sessão 🔑 - Quando concluida transferir para main branch como v 0.1.0

> *Sistema de login/logout stateless (JWT) com suporte a refresh e blacklist.*

### Token Provider
- [ ] Definir contrato `ITokenProvider` com `sign()`, `verify()`, `decode()`
- [ ] Implementar `JwtProvider` usando jose ou jsonwebtoken
- [ ] `TokenFactory` — resolve provider via env
- [ ] Variáveis de env: `TOKEN_PROVIDER`, `TOKEN_SECRET`, `TOKEN_EXPIRATION`, `REFRESH_TOKEN_EXPIRATION`
- [ ] Schema Zod para validação das envs de token
- [ ] Testes unitários para geração, verificação e expiração

### Fluxo de Autenticação
- [ ] Definir contrato `IAuthService` (login, logout, refreshToken, validateSession)
- [ ] Implementar `AuthService` orquestrando User + Hasher + TokenProvider
- [ ] Middleware de autenticação (`requireAuth`) que valida token no header
- [ ] Middleware de autorização (futuro — placeholder de interface)

### Rotas de Auth
- [ ] `POST /api/v1/auth/login` — retorna access + refresh token
- [ ] `POST /api/v1/auth/logout` — invalida sessão
- [ ] `POST /api/v1/auth/refresh` — renova access token com refresh token
- [ ] Testes de integração para fluxo login → refresh → logout

### Blacklist/Whitelist de Tokens
- [ ] Armazenar tokens revogados em Valkey/Redis com TTL auto-expirável
- [ ] Guard no middleware de auth para checar blacklist antes de validar
- [ ] Testes unitários para blacklist

---

## Fase 5 — Documentos de Identificação (Internacional) 📄

> *Sistema de validação de documentos fiscais e de identidade para contexto 🇧🇷 + 🇮🇹.*
> *Segue o padrão Contracts-First: contrato base → validadores concretos → Value Object → Factory.*
> *Isso transforma o boilerplate em ferramenta real para projetos internacionais.*

### Contrato Base
- [ ] Definir contrato `IDocumentValidator` — interface genérica para qualquer documento
  - Métodos: `validate(raw: string): boolean`, `sanitize(raw: string): string`, `format(sanitized: string): string`
  - Deve ser agnóstico ao país — cada validator concreto resolve seu algoritmo
- [ ] Criar classe abstrata `BaseDocumentValidator` implementando `IDocumentValidator`
  - Logging estruturado (child logger com `fileType: 'validation'`, `service: 'document'`)
  - Fail-Fast pattern (`: never`) em validações críticas
  - `abstract get documentName(): string` para identificação nos logs

### Branded Types para Documentos
- [ ] `ValidatedCPF = Brand<string, 'ValidatedCPF'>` + guard `isValidatedCPF()`
- [ ] `ValidatedCNPJ = Brand<string, 'ValidatedCNPJ'>` + guard `isValidatedCNPJ()`
- [ ] `ValidatedCodiceFiscale = Brand<string, 'ValidatedCodiceFiscale'>` + guard
- [ ] `ValidatedPartitaIVA = Brand<string, 'ValidatedPartitaIVA'>` + guard
- [ ] Type union: `type PersonDocument = ValidatedCPF | ValidatedCodiceFiscale`
- [ ] Type union: `type BusinessDocument = ValidatedCNPJ | ValidatedPartitaIVA`

### Validadores Concretos (Providers)

#### 🇧🇷 CPF
- [ ] Refatorar `CpfValidator` existente para estender `BaseDocumentValidator`
- [ ] Retornar `ValidatedCPF` (Branded) em vez de `string`
- [ ] Manter validação matemática dos dígitos verificadores existente
- [ ] Adicionar formatação: `12345678909` → `123.456.789-09`
- [ ] Testes unitários (migrar + ampliar os existentes)

#### 🇧🇷 CNPJ
- [ ] Criar `CnpjValidator` estendendo `BaseDocumentValidator`
- [ ] Validação matemática dos 2 dígitos verificadores (mod 11, pesos 2-9)
- [ ] Rejeitar CNPJs de dígitos repetidos
- [ ] Sanitização: remover máscara (`XX.XXX.XXX/XXXX-XX` → `14 dígitos`)
- [ ] Formatação: `14 dígitos` → `XX.XXX.XXX/XXXX-XX`
- [ ] Testes unitários (válidos, inválidos, repetidos, edge cases)

#### 🇮🇹 Codice Fiscale
- [ ] Criar `CodiceFiscaleValidator` estendendo `BaseDocumentValidator`
- [ ] Validação do caractere de controle (check character — algoritmo par/ímpar)
- [ ] Validação de formato: 16 caracteres alfanuméricos (`^[A-Z]{6}\d{2}[A-Z]\d{2}[A-Z]\d{3}[A-Z]$`)
- [ ] Sanitização: uppercase + remover espaços
- [ ] Testes unitários (códigos reais fictícios com dígito válido, inválidos, mal formatados)

#### 🇮🇹 Partita IVA
- [ ] Criar `PartitaIvaValidator` estendendo `BaseDocumentValidator`
- [ ] Validação pelo algoritmo de Luhn (check digit — último dígito)
- [ ] Validação de formato: exatamente 11 dígitos numéricos
- [ ] Sanitização: remover espaços, prefixo `IT` se presente
- [ ] Testes unitários (válidos, inválidos, edge cases)

### Value Object `Document`
- [ ] Criar VO `Document` que encapsula tipo + valor validado
  - Discriminated Union: `{ type: 'cpf', value: ValidatedCPF } | { type: 'cnpj', value: ValidatedCNPJ } | ...`
  - Factory method `Document.from(type, raw)` que resolve o validador correto
- [ ] Integrar com `UserI` — avaliar se `cpf: string` migra para `document: Document`
  - Considerar que V1 foca em **person** (CPF/CodiceFiscale), business docs ficam opcionais
- [ ] Testes unitários para VO + integração com User

### Configuração via Env
- [ ] `APP_COUNTRY` ou `APP_DOCUMENT_STANDARD` — controla quais validadores estão ativos (`br`, `it`, `both`)
- [ ] Schema Zod para validação da env de documentos
- [ ] Documentar no `.env.example`

---

## Fase 6 — UserProfile & Relação 1:1 👤

> *Completa a entidade User com perfil público, demonstrando relação entre aggregates.*

### Entidade UserProfile
- [ ] Definir `UserProfileI` / `PublicUserProfileI` interfaces
- [ ] Criar `UserProfile.ts` estendendo `BaseEntity`
- [ ] Campos iniciais: `displayName`, `bio`, `avatarUrl`, `locale`, `timezone`
- [ ] `UserProfile.validation.ts` com schemas Zod
- [ ] Factory method `UserProfile.create()` — gerado automaticamente ao criar User
- [ ] Testes unitários para Entity + Validations

### Rotas de UserProfile
- [ ] `GET /api/v1/users/:id/profile` — perfil público
- [ ] `PATCH /api/v1/users/:id/profile` — atualizar perfil (autenticado)
- [ ] Repositório `IUserProfileRepository` + `MongoUserProfileRepository`
- [ ] Testes de integração

### Relação User ↔ UserProfile
- [ ] Garantir que `User.create()` gera `profileId` e dispara criação de `UserProfile`
- [ ] Testar fluxo completo: criar User → profile existe automaticamente

---

## Fase 7 — Polish & Entrega V1.0.0 ✨

> *Últimos refinamentos antes de marcar a tag v1.0.0.*

### Documentação
- [ ] Documentar todas as rotas da API (Swagger/OpenAPI ou README detalhado)
- [ ] Atualizar README com exemplos de request/response reais
- [ ] Garantir que `.env.example` e `.env.test.example` reflitam todas as variáveis novas
- [ ] Atualizar ADRs com decisões tomadas nas fases 1–6

### DevOps Mínimo
- [ ] Docker Compose para desenvolvimento (MongoDB + Valkey + API)
- [ ] Script de seed/reset do banco para desenvolvimento
- [ ] Garantir que `npm run build` + `npm start` funciona end-to-end

### Qualidade Final
- [ ] Rodar `npm run test:coverage` e garantir cobertura ≥ 80% nos módulos core
- [ ] Rodar `npm run lint` limpo (zero warnings, zero errors)
- [ ] Revisar todos os typos e inconsistências de nomenclatura
- [ ] Tag `v1.0.0` no Git

---

## 🔮 Adiado para V2+ (Fora do Escopo V1)

> *Ideias valiosas que escalam a partir da arquitetura V1, mas não a definem.*

### Consumo de APIs Externas (V2)
- [🔮] Interface/abstração para consumir APIs externas de forma segura
- [🔮] Validação de CPF via API da Receita Federal (controlada por env)
- [🔮] Validação de Codice Fiscale via Agenzia delle Entrate
- [🔮] Integração com APIs de agências de entregas

### Pagamentos (V3)
- [🔮] Contrato base para provedores de pagamento
- [🔮] Provider Stripe
- [🔮] Provider Adyen
- [🔮] Factory para webhooks, carteira e comprovantes
- [🔮] Agregação de carteira ao criar User
- [🔮] Criptografia e2e sobre dados financeiros

### Infraestrutura Avançada (V2–V3)
- [🔮] PostgreSQL como provider alternativo de banco
- [🔮] Domain Events para comunicação entre aggregates
- [🔮] Rate limiting e proteção DDoS
- [🔮] Observabilidade (OpenTelemetry / Prometheus)
- [🔮] CI/CD pipeline (GitHub Actions)
- [🔮] Sessões stateful (Cookie-based) como alternativa ao JWT
- [🔮] Analytics e profilamento de pessoa/empresa baseado em documentos
- [🔮] Cripto como forma de pagamento (V4)

---

## 📊 Resumo de Esforço por Fase

| Fase | Foco | Dependência | Complexidade |
|---|---|---|---|
| **1** | Dívidas técnicas + refinamentos | Nenhuma | 🟢 Baixa |
| **2** | Valkey/Redis | Fase 1 | 🟡 Média |
| **3** | Rotas HTTP + Repository | Fase 1 | 🟡 Média |
| **4** | Autenticação + JWT | Fase 2 + 3 | 🔴 Alta |
| **5** | Documentos Internacionais (🇧🇷+🇮🇹) | Fase 1 | 🟡 Média–Alta |
| **6** | UserProfile + relação 1:1 | Fase 3 + 4 + 5 | 🟡 Média |
| **7** | Polish + entrega V1.0.0 | Todas | 🟢 Baixa |

```
                  ┌──→ Fase 3 (Rotas HTTP) ───┐
Fase 1 ───────────┤                           ├──→ Fase 4 (Auth) ──┐
                  ├──→ Fase 2 (Valkey) ───────┘                     │
                  │                                                 ├──→ Fase 6 (Profile) ──→ Fase 7 (v1.0.0)
                  └──→ Fase 5 (Documents 🇧🇷🇮🇹) ────────────────────┘
```

> **Nota:** A Fase 5 (Documents) pode rodar **em paralelo** com as Fases 2–4, pois não depende
> de HTTP nem de banco em memória — é puramente lógica de validação + Branded Types.
> Isso permite que, enquanto a infraestrutura HTTP e Auth estão sendo construídas,
> o sistema de documentos evolua de forma independente.

> **Estimativa macro:** 7 fases iterativas. Cada fase é auto-contida e entrega valor incremental.
> Ao final da Fase 4, o boilerplate já é "demonstrável". Na Fase 7, é "shippable".
