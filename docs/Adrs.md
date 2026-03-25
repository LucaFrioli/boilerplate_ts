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

## ADR 008: Segregação de Constantes e Metadados (Level 0)
**Data: 2026-03-16** *Contexto*: O crescimento da aplicação e a separação de schemas geraram dependências circulares (`env -> schema -> env`). Isso impedia a inferência correta de tipos via `Pick` em contratos de infraestrutura.

**Decisão**: Extrair arrays de suporte e constantes estáticas (*`dbProtocols`, `identityTypeSupported`, etc.*) para arquivos exclusivos em `src/configs/constants/`.

**Justificativa**: Cria uma "Base de Pirâmide" (Level 0) que não depende de ninguém. Permite que *Tipos*, *TypeGuards* e *Schemas* consumam a mesma verdade absoluta sem gerar ciclos, mantendo a inferência de tipo do TypeScript íntegra e robusta para o "Estado da Arte".

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
