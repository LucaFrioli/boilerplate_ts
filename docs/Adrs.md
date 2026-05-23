# Architectural Decision Records (ADR)

Este documento registra as decisões técnicas fundamentais tomadas durante a construção do HabitosApp API, detalhando o contexto, as opções consideradas e as

**justificativa**s. Serve como objeto de estudo para a transição para linguagens de baixo nível (Rust) e infraestrutura.

## ADR 001: Linting Estrito e Coerção Explícita de Tipos
**Data: 2026-03-10** *Contexto*: O projeto visa escalabilidade e segurança de nível enterprise. O JavaScript/TypeScript permite coerções implícitas que podem mascarar erros de lógica.

**Decisão**: Ativar `strictTypeChecked` e a regra `restrict-template-expressions`.

**Justificativa**: Forçar o uso de `String(value)` ou `.toString()` cria um código autodocumentado e prepara o desenvolvedor para o rigor de linguagens como Rust, onde a coerção implícita não existe.

---

## ADR 002: Branded Types para Identidade e Segurança
**Data: 2026-03-12** *Contexto*: Evitar o vazamento de tipos primitivos (string) entre diferentes contextos de domínio (ex: passar um AppID onde se espera um DatabaseID).

**Decisão**: Implementar `Brand<T, B>` para todos os identificadores e dados sensíveis (`HashedString`, `DatabaseURI`).

**Justificativa**: Garante segurança matemática em tempo de compilação sem custo de runtime.

---

## ADR 003: Contratos de Conexão com Fail-Fast (Never Return)
**Data: 2026-03-12** *Contexto*: Falhas em serviços críticos (BD) podem causar processos zumbis e exaustão de recursos (Self-DDoS).

**Decisão**: O método `handlerErrors`  em contratos de infraestrutura retorna `: never` e lança erros fatais.

 **Justificativa**: Em sistemas orquestrados, é melhor o processo morrer e ser reiniciado (Fail-Fast) do que permanecer em estado inválido.

 ---

## ADR 004: Mapeamento Estrito de Env via 'Pick'
**Data: 2026-03-13** *Contexto*: Contratos de URI não devem ter acesso a toda a configuração global da aplicação para evitar acoplamento oculto.

**Decisão**: Usar `type EnvDataForUri = Pick<typeof env, keys>` nos contratos por exemplo.

**Justificativa**: Segregação de Interfaces. O contrato declara exatamente quais chaves ele consome, facilitando testes e futuras substituições de provedores.

---

## ADR 005: Pragmatismo em Sincronização de Tooling
**Data: 2026-03-13** *Contexto*: O uso intensivo de Branded Types e Aliases complexos em um ambiente ESM pode causar dessincronização entre o ESLint e o TS Server (falsos positivos de 'Error Type').

**Decisão**: Priorizar a elegância da arquitetura (Aliases/@Types) sobre a estabilidade do linter. Erros de sincronização devem ser resolvidos via **'Restart Server'** em vez de refatorar o código para caminhos relativos.

**Justificativa**: Mantém o projeto limpo e ensina o desenvolvedor a dominar suas ferramentas de produtividade.

---

## ADR 006: Segregação de Fábricas de Configuração (URI) e Instanciação (Conexão)
**Data: 2026-03-13** *Contexto*: Preparação para cenários complexos de infraestrutura como Multi-banco e Master/Slave sem gerar código espaguete ou acoplamento circular.

**Decisão**: Separar a lógica de construção da string de conexão (`UriFactory`) da lógica de gerenciamento do driver e socket (`ConnectionFactory`).

**Justificativa**: Aplicação do Princípio de Responsabilidade Única (**SRP**) e Segregação de Interfaces. Permite que a infraestrutura de conexão seja agnóstica à origem da configuração, facilitando escalabilidade e testes.

---

## ADR 007: Centralização de Schemas em 'configs/' para Arquitetura Zero-Config
**Data: 2026-03-14** *Contexto*: O boilerplate visa ser um framework "Plug-and-Play", onde a infraestrutura se auto-constrói a partir do `.env.ts`

**Decisão**: Centralizar todos os schemas Zod em `src/configs/schemas/`. O arquivo `env.ts` global atua como um "Painel de Controle" que agrega e valida toda a inteligência de inicialização.

 **Justificativa**: Prioriza a *Experiência do Desenvolvedor (DX)* e a facilidade de deploy. Garante que a configuração seja um **"Módulo Exclusivo de Entrada"**, evitando que a lógica de infraestrutura precise "caçar" variáveis em locais descentralizados. Impõe uma hierarquia onde `configs/`  consome `.validations` puras, mas nunca depende de módulos internos.

 ---

## ADR 008: Segregação de Constantes e Metadados (Level 0) —  DEPRECIADA
**Data: 2026-03-16** | **Depreciada em: 2026-05-15** — Substituída pela **[ADR 012](#adr-012-hierarquia-de-dependências-baseada-em-imports-reais-pirâmide-de-níveis-v2)** que formaliza e corrige o sistema de níveis com base em análise de imports reais.

*Contexto*: O crescimento da aplicação e a separação de schemas geraram dependências circulares (`env -> schema -> env`). Isso impedia a inferência correta de tipos via `Pick` em contratos de infraestrutura.

**Decisão**: Extrair arrays de suporte e constantes estáticas (*`dbProtocols`, `identityTypeSupported`, etc.*) para arquivos exclusivos em `src/configs/constants/`.

**Justificativa**: Cria uma "Base de Pirâmide" (Level 0) que não depende de ninguém. Permite que *Tipos*, *TypeGuards* e *Schemas* consumam a mesma verdade absoluta sem gerar ciclos, mantendo a inferência de tipo do TypeScript íntegra e robusta para o "Estado da Arte".

> **Nota de depreciação:** Esta ADR definiu corretamente o Level 0 e a motivação por trás da segregação de constantes. Porém, a hierarquia de níveis atribuída aos módulos superiores (Level 1–3) foi baseada em **localização de diretório** e não em **dependências reais de import**. A ADR 012 corrige essa imprecisão, reclassificando módulos como `validations/` que estavam em Level 3 mas cujos imports reais são exclusivamente Level 0 — tornando-os Level 1 efetivo.

---

## ADR 009: Type Guards e Type Narrowing como Fronteiras de Segurança (Cybersecurity)
**Data: 2026-03-18** *Contexto*: O cast de tipos clássico (`as Type`) no TypeScript mascara erros em tempo de execução, permitindo que o estado da memória desvie do contrato estático do compilador (Undefined Behaviors). Em sistemas críticos, assumir a tipagem sem validação de memória gera vulnerabilidades exploráveis.

**Decisão**: Banir o uso de Asserções de Tipo (`as`) em fluxos críticos de infraestrutura. Utilizar Custom Type Guards (`function isType(val): val is Type`) atrelados a blocos de controle de fluxo de Fail-Fast (lançando erros mapeados caso o fluxo seja quebrado).

**Justificativa**:
- Segurança (Defense in Depth): Alinha a verificação de memória (*Runtime*) com a verificação estática (*Compile-time*). Inputs maliciosos são interceptados na fronteira da função antes mesmo de entrarem na lógica de domínio.

- Inspiração no Rust: Prepara a arquitetura para o uso de match e extração segura de Result/Option no Rust. A coerção explícita suportada por Type Guards estreita o tipo, criando uma aplicação matematicamente rastreável onde estados inválidos são "`unrepresentable`" (impossíveis de representar no código válido).

---

## ADR 010: adoção de metodologia TDD
**Data 2026-03-25** *Contexto*: Como o projeto está crescendo e visa ainda implementar uma gama de utilidades, e módulos com diversas tecnologias emergentes, adotar o desenvovimento orientado a testes(**TDD**) neste momento se demonstra de extrema importância, elevando o boilerplate a um estado, realmente Enterprrise, e permitindo que nenhum módulo quebre com implementações de negócios que irão ser implementadas sobre ele, bem como permitir que a evolução seja mais suave.

**Decisão**: Adotar TDD como padrão obrigatório para qualquer novo **`provider`**, **`usecase`**, **`factory`** ou **`entity`** a partir desta fase.

**Justificativa**: Com o sistema de contratos abstratos (`BaseHasher`, `ITokenProvider`, e outros futuros), o teste do contrato precede a implementação. Isso garante que qualquer novo provider seja drop-in sem risco de regressão.

---

## ADR 011: Proibição de Side-Effects em Avaliação de Módulos Barrel-Exported (Lazy Initialization)
**Data: 2026-04-12** *Contexto*: A estratégia de **Barrel Exports** (`shared/types/index.ts`) centraliza todas as exportações de tipos, guards e utilitários em um único ponto de importação (`@Types`). No entanto, no modelo ESM nativo do Node, `import { X } from '@Types'` dispara a **avaliação de todos os módulos re-exportados**, mesmo que o consumidor precise apenas de `X`. Se qualquer módulo do barrel executar lógica dependente de runtime (como ler `env`) no nível superior (top-level), todos os consumidores transitivos herdam essa dependência oculta. Isso gera falhas em testes onde `env` é mockada parcialmente: ao importar qualquer tipo de `@Types`, o runtime avalia `identity.type.ts` que lê `env.IDENTIFIER_NANOID_ALPHABET` no top-level, e o mock do teste de hashing não define essa variável, pois não tem relação com identidade.

**Decisão**: Proibir `export const` com dependências de runtime (`env`, I/O, `crypto`) no nível superior de qualquer módulo pertencente a um **barrel export** (`shared/types/`, ou futuros barrels). Valores que dependem de `env` devem ser encapsulados em padrão **Lazy Singleton**, uma função que computa e cacheia o valor na primeira invocação *Vide o [NanoIDRegex](../src/shared/types/identity.type.ts)*

**Justificativa**:
- **Isolamento de testes**: Cada suite de testes deve poder mockar apenas as dependências que seu módulo consome diretamente, sem ser afetada por dependências transitivas de outros módulos do barrel. O lazy singleton garante que a leitura de `env` só acontece quando o guard/regex é efetivamente **chamado**, não quando o módulo é **importado**.

- **Segurança da Barrel Strategy**: O padrão barrel (`export * from`) é valioso para DX — permite importações limpas (`from '@Types'`) em vez de caminhos granulares. Esta ADR protege essa estratégia eliminando o único vetor de falha: side-effects na avaliação.

- **Coerência com o Lazy Singleton já praticado**: `HasherFactory` e `IdentityFactory` já usam este exato padrão (instância cacheada, criada na primeira chamada). Esta ADR apenas estende a mesma disciplina para a camada de tipos.

- **Inspiração no Rust** — `lazy_static!`: Em Rust, constantes computadas em runtime não existem. Valores que dependem de estado externo usam `lazy_static!` ou `OnceLock` — inicializados na primeira leitura, imutáveis depois. O padrão Lazy Singleton é o equivalente TypeScript direto, mantendo a filosofia de preparação para migração.

---

## ADR 012: Hierarquia de Dependências Baseada em Imports Reais (Pirâmide de Níveis v2)
**Data: 2026-05-15** — Substitui a **[ADR 008](#adr-008-segregação-de-constantes-e-metadados-level-0--️-depreciada)** que estava parcialmente incorreta.

*Contexto*: A ADR 008 estabeleceu o conceito fundamental de Level 0 (constantes puras sem dependências internas) e a motivação para segregá-las. Porém, a hierarquia de níveis superiores (Level 1–3) foi definida por **localização de diretório** (`validations/` = Level 3, `shared/types/` = Level 1) em vez de **dependências reais de import**. Durante auditoria técnica em 2026-05-15, identificou-se que todos os módulos em `validations/` importam **exclusivamente** de Level 0 (`env.constants.ts`, `logger.ts`) e de peers dentro do mesmo diretório — nunca de `env.ts` (Level 2) nem de `shared/types/` (Level 1). Isso torna os validadores **Level 1 efetivo**, não Level 3 como documentado. A classificação por diretório mascarava a realidade do grafo de dependências e poderia levar a decisões arquiteturais equivocadas.

**Decisão**: O nível de um módulo é determinado pelo **nível mais alto que ele importa + 1**, não pela sua localização no filesystem. A pirâmide corrigida fica:

```
Level 0 — Folhas Puras (zero imports internos)
├── configs/constants/env.constants.ts    → constantes, regex, listas
└── configs/logger.ts                     → pino + process.env direto (sem env.ts)

Level 1 — Consumidores de Level 0 (peers entre si)
├── shared/types/*                        → Brand types, Type Guards, utility types
├── configs/schemas/*.schema.ts           → Zod schemas de validação de env
└── validations/*                         → Classes validadoras (CPF, Password, Username, URI)
    ┌──────────────────────────────────────────────────────────────────────────┐
    │ Types, Schemas e Validators são PEERS.                                   │
    │ Todos importam apenas de Level 0 e podem referenciar-se mutuamente,      │
    │ RESPEITANDO a regra de fluxo unidirecional (ver abaixo).                 │
    └──────────────────────────────────────────────────────────────────────────┘

Level 2 — Agregador de Configuração
└── configs/env.ts                        → agrega e valida todos os schemas

Level 3 — Infraestrutura de Serviço (importam env.ts / Level 2)
├── core/identity/                        → IdentityFactory, providers (NanoID, UUID)
├── auth/hash/                            → HasherFactory, providers (Argon2, Bcrypt)
└── databases/uri/                        → URI factories (MongoDB, Valkey)

Level 4 — Domínio
└── resources/                            → Entidades (User), usa Level 3 + Level 2

Level 5 — Bootstrap
└── server.ts                             → ponto de entrada da aplicação
```

**Justificativa**:

- **Correção factual**: A análise de imports reais demonstrou que nenhum módulo em `validations/` importa de `env.ts` (Level 2) nem de `shared/types/` (Level 1). Classificá-los como Level 3 era impreciso e induzia a conclusões erradas em auditorias (ex: "types importando validators viola a pirâmide" — quando na verdade são peers).

- **Precedente já consolidado**: O padrão `types → validators` já existia no codebase antes desta formalização. `pii.types.ts` importa `CpfValidator`, `dbEnv.schema.ts` importa `passwordStrength`, `security.types.ts` importa `DatabaseUsernameValidator`. Não é exceção — é regra.

- **Regra de Ouro — Fluxo Unidirecional**: Para que types e validators coexistam como peers sem risco de ciclo, um invariante **DEVE** ser respeitado:

```
 ┌──────────────────────────────────────────────────────────────┐
 │  INVARIANTE OBRIGATÓRIO:                                     │
 │                                                              │
 │  shared/types/*  ──────→  validations/*     ✅ PERMITIDO     │
 │  validations/*   ──╳───→  shared/types/*    ❌ PROIBIDO      │
 │                                                              │
 │  A dependência é UNIDIRECIONAL:                              │
 │  types podem importar validators,                            │
 │  mas validators NUNCA devem importar de @Types.              │
 └──────────────────────────────────────────────────────────────┘
```

- **Por que esse invariante é crítico**: No ESM nativo do Node, imports circulares não causam crash — são resolvidos com **bindings parciais**. Se `security.types.ts` importa `DatabaseMemoryUriValidation` e este importa `isValidUri` de `security.types.ts`, durante a resolução do módulo o ESM entrega `isValidUri` como `undefined` (o módulo ainda não terminou de avaliar). O resultado: Type Guards retornam `undefined` em vez de `boolean`, fronteiras de segurança são **bypassadas silenciosamente**, e URIs não-validadas escapam para a infraestrutura. Nenhum erro é lançado — o sistema continua operando em estado corrompido. Isso é fundamentalmente incompatível com a filosofia Fail-Fast da aplicação.

---

## ADR 013: Segregação Físico-Semântica de URIs (Persistence vs Cache) e Lazy Initialization para Evitar Acoplamento de Boot
**Data: 2026-05-20** *Contexto*: A infraestrutura de conexões de banco de dados (`databases/`) misturava todas as estratégias de URI na mesma raiz (`src/databases/uri/`). Além disso, a importação estática de `mongoURI` em tempo de avaliação de módulo carregava imediatamente o construtor `new MongoConnectionString()`, gerando um crash fatal de boot se o `DATABASE_TYPE` ativo no ambiente não fosse `mongodb` ou se as credenciais estivessem ausentes - um sério gap de acoplamento de boot ocultado por mocks agressivos em testes unitários.

**Decisão**:
1. **Segregação Física e Semântica**: Dividir a raiz de URIs em dois subdiretórios distintos: `persistence/` (para armazenamento persistente estruturado/não-estruturado como MongoDB) e `cache/` (para armazenamento temporário em memória de alta performance como Valkey/Redis).
2. **Criação de Aliases no TSConfig**: Mapear os caminhos `@DbUri/persistence/*` e `@DbUri/cache/*` para isolar a arquitetura e manter um autocomplete polido no DX.
3. **Migração para Lazy Initialization**: Adotar a estratégia de inicialização sob demanda (Lazy Getters ou Dynamic Factories) para que as conexões resolvam suas strings de conexão apenas em tempo de execução (`runtime`) quando `.connect()` for invocado, e nunca na inicialização do arquivo (`import-time`).

**Justificativa**:
- **Zero Efeitos Colaterais no Boot**: Importar um módulo de conexão deixa de disparar validações prematuras de variáveis de ambiente de bancos inativos, garantindo boots resilientes do monolito modular e permitindo a inicialização dinâmica de conexões.
- **Coesão e Organização Visual**: A distinção semântica limpa reflete as fronteiras conceituais clássicas da engenharia de software (Banco de Dados Primário vs Camada de Cache Volátil).
- **Facilidade de Mocking e Testes**: Testes de adapters específicos não precisam mais mockar arquivos de URI alheios, pois seus imports dinâmicos ou construtores tardios não são avaliados se não forem explicitamente executados.

---

## ADR 014: Centralização de Sanitização de PII e Isolamento de Dependências de Configuração via Módulo de Máscaras (`@Masks`)
**Data: 2026-05-23** *Contexto*: A função `maskPII` de Nível 1 residia anteriormente no arquivo `pii.types.ts` e importava a variável global `env` (Nível 2) exclusivamente para exibir o e-mail de suporte (`env.EMAIL_TO_CONTACT`) em tratamentos de erro de strings. Isso violava a Pirâmide de Dependências (ADR 012) pois causava um acoplamento ascendente de Level 1 para Level 2, induzindo dependências circulares ocultas e inicializações prematuras em testes unitários. Além disso, o mascaramento ingênuo de e-mails para caixas de correio de tamanho ultra-curto (ex: `"x@gmail.com"`) causava vazamento do comprimento original do dado ou levava a crashes fatais de `RangeError` no método `.repeat()`.

**Decisão**:
1. **Isolamento de Máscaras e Validações**: Extrair todas as funções de higienização, mascaramento e anonimização de PII do arquivo de tipos e centralizá-las em um novo módulo de Level 1 dedicado em `src/shared/masks/` com o alias `@Masks` e entrypoint `index.ts`.
2. **Decoupling de Tipos Folha**: Limpar o `pii.types.ts` removendo o import de `env.ts`. O módulo `@Masks` passa a receber instâncias de logger por parâmetro (`maskPII(rawValue, logger)`) e gerencia a injeção pontual de variáveis de ambiente.
3. **Blindagem do Algoritmo de Mascaramento**: Adotar salvaguardas de `Math.max(0, length)` para imunizar a aplicação contra crashes de `RangeError` causados por strings curtas. Impor um limite de preenchimento mínimo de 3 asteriscos para e-mails (`repeatCountVerification <= 3 ? 3 : ...`) para impossibilitar ataques de canal lateral baseados no comprimento do dado pessoal.

**Justificativa**:
- **Segurança Pró-Ativa (Privacy by Design)**: O mascaramento de pii com limite mínimo atende perfeitamente os requisitos mais estritos da GDPR e LGPD sobre pseudonimização, ocultando o metadado de comprimento do dado do usuário.
- **Aderência Estrita à Pirâmide (ADR 012)**: Preserva a integridade e o isolamento de folhas de tipos no Level 1, prevenindo dependências circulares e permitindo imports de tipos rápidos e sem efeitos colaterais.
- **Zero Crashes em Runtime**: Garante resiliência absoluta em produção sob inputs malformados ou corrompidos.

