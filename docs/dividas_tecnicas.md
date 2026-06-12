# 📋 Lista de Dívidas Técnicas — HabitosApp API

Este documento serve como o painel de bordo técnico do HabitosApp API. Ele lista, categoriza e prioriza as decisões de arquitetura, segurança e qualidade de código que foram postergadas em detrimento de prazos imediatos, servindo como o backlog técnico oficial da aplicação.

Os itens dentro de cada nível de prioridade estão ordenados **estritamente pelo grau de ameaça/urgência**, indicando a ordem cronológica perfeita de resolução que deve ser seguida.

---

## 🔴 PRIORIDADE 1: Severidade ALTA (Segurança e Vazamento de Dados)

Foco máximo. Itens nesta categoria constituem riscos à integridade criptográfica da aplicação, segurança de credenciais em repouso ou vazamentos diretos de dados pessoais (PII) em logs persistidos física ou logicamente.

1.  **[Descoberta: 2026-05-22] Vulnerabilidade de Truncamento a 72 Bytes no Bcrypt** (`Bcrypt.service.auth.ts`)
    *   *Ameaça:* O Bcrypt ignora silenciosamente todos os bytes que excedem o limite de 72 bytes. Ao fazer `password + pepper`, usuários com senhas longas empurram o pepper corporativo para fora do fatiamento limite, anulando o pepper de segurança por completo e tornando-o nulo.
    *   *Correção:* Aplicar um hash prévio do payload da senha (ex: SHA-256 codificado em Base64) antes do hashing do Bcrypt.
2.  **[Descoberta: 2026-05-09] Exposição de Senha em Texto Puro em Alterações de Conta** (`User.ts:196`)
    *   *Ameaça:* A variável `rawValue: newPassword` é gravada em texto limpo nos logs de erro de `User.changePassword()`. A nova senha do usuário vai para o arquivo físico `.log` porque a chave `rawValue` não está no filtro `redact` do Pino.
    *   *Correção:* Substituir a exposição por `'***REDACTED***'`.
3.  **[Descoberta: 2026-05-09] Exposição de Hash em Logs Fatais de Ataque** (`User.ts:209-210`)
    *   *Ameaça:* O valor bruto `rawValue: validatedNewPassword` é escrito em logs fatidos de detecção de hash pré-computado, revelando a senha/hash na íntegra no log persistido.
    *   *Correção:* Substituir a exposição por `'***HASH_REDACTED***'`.
4.  **[Descoberta: 2026-05-22] Bypass Lógico de Validação no Mongoose URI** (`mongodb.uri.ts`)
    *   *Ameaça:* O método `generateAuth` usa o operador lógico `&&` em vez de `||` para validar credenciais de produção. Se apenas um parâmetro crucial de autenticação estiver faltando, o validador passa direto pelo guard e crasha em pontos secundários em vez de ativar o Fail-Fast inicial.
    *   *Correção:* Substituir o operador por `||`.
5.  **[Descoberta: 2026-05-22] Vazamento de PII (E-mail) em Logs Sintáticos** (`Email.validations.ts`)
    *   *Ameaça:* O método `isValid` loga o email bruto digitado pelo usuário no objeto `error.rawValue` quando a validação RFC falha. Como a chave não está na lista de `redact` do logger corporativo, e-mails sensíveis são escritos em texto limpo nos arquivos físicos de logs.
    *   *Correção:* Anonimizar o email chamando `maskPII(value)` antes de despachar o erro ao Pino.
6.  **[Descoberta: 2026-05-09] Exposição de E-mail bruto em Alterações de Cadastro** (`User.ts:173`)
    *   *Ameaça:* `rawValue: newEmail` exposto no log de erro de `User.changeEmail()`. E-mail constitui PII não mascarado e sensível.
    *   *Correção:* Higienizar o log chamando a máscara `maskPII(newEmail)`.
7.  **[Descoberta: 2026-05-09] Exposição de Username bruto em Logs de Falha** (`User.ts:229`)
    *   *Ameaça:* `rawValue: newUsername` é exposto no log de erro de `User.changeUsername()`.
    *   *Correção:* Substituir a exposição direta por `'***REDACTED***'`.
8.  **[Descoberta: 2026-05-09] Exposição de Parâmetros Brutos em Verificadores de Hash** (`security.types.ts:30`)
    *   *Ameaça:* `rawValueEntry: rawValue` no método `isHashedString()` escreve o valor bruto no log de `warning`. Se o método for alimentado por engano com texto puro (ex: senhas não hasheadas), a credencial aparece nos logs.
    *   *Correção:* Logar estritamente o tipo de dado `typeof rawValue`.

---

## 🟡 PRIORIDADE 2: Severidade MÉDIA (Arquitetura, Isolamento e Robustez)

Itens que impactam a corretude de fluxos, a conformidade de regras de dependência (como a pirâmide de import da ADR 012) ou geram poluição e falsos-positivos nos testes unitários.

1.  **[Descoberta: 2026-05-22] Quebra de Hierarquia da ADR 012 em `pii.types.ts`** (`pii.types.ts`)
    *   *Impacto:* O arquivo de Level 1 (`pii.types.ts`) importa `env` (`env.ts`), que é um agregador de Level 2. Isso aciona inicializações e validações precoces do Zod em imports de tipos básicos do sistema, violando o isolamento da pirâmide estrutural.
    *   *Status atual:* A lógica de mascaramento já foi desacoplada na última refatoração. **Falta apenas excluir fisicamente a linha 7 de `pii.types.ts` (import sem uso)** para arquivar esta pendência definitivamente.
2.  **[Descoberta: 2026-05-09] Spread Completo de Dados no Debug do Validador** (`User.ts:91-93`)
    *   *Impacto:* O spread de `...user.data` no logger `logInfo('debug', ...)` de `User.validate()` injeta hashes de senhas, CPFs e dados sem o controle rígido do redact do Pino.
    *   *Correção:* Logar estritamente identificadores de contexto seguros (ex: `publicId` e `username`).
3.  **[Descoberta: 2026-05-22] Perda de Monotonicidade no UUIDv7** (`UuidV7.service.identity.ts`)
    *   *Impacto:* Sem a implementação de um contador monotônico sub-milissegundo, a geração concorrente e de altíssima velocidade de múltiplos UUIDs no mesmo milissegundo causa desordenação temporal randômica. A suíte de testes contorna isso com um atraso forçado de `2ms`.
    *   *Correção:* Implementar a sub-milissegundo monotônica incremental prevista na especificação da RFC 9562.
4.  **[Descoberta: 2026-05-09] Validação Exclusiva de Hasher Ativo no security.types.ts** (`security.types.ts:37-44`)
    *   *Impacto:* `isHashedString()` aceita estritamente o formato de hash gerado pelo `HASHER_PROVIDER` atualmente ativo. Isso rejeita formatos antigos gerados por outros motores no banco, inviabilizando migrações transparentes (ex: Bcrypt ➔ Argon2).
    *   *Correção:* Criar o método `isAnyValidHash()` para contemplar todos os algoritmos suportados.
5.  **[Descoberta: 2026-05-22] Omissão Silenciosa de Usuário no Valkey Sentinel** (`valkey.uri.ts`)
    *   *Impacto:* Se a infraestrutura contiver apenas username sem password, os dados de autenticação são descartados silenciosamente na geração de string de conexão sem avisos nos logs, causando falha confusa de depuração.
    *   *Correção:* Permitir a configuração de credenciais parciais ou emitir alertas claros.
6.  **[Descoberta: 2026-05-09] Quebra de Nível 0 por Dependência no Constants** (`env.constants.ts:L1`)
    *   *Impacto:* O arquivo de Level 0 (`env.constants.ts`) importa `createChildLogger` de `logger.ts` (Level 1), gerando imports acoplados e potenciais ciclos.
    *   *Correção:* Usar lazy initialization ou extrair um módulo isolado para `envLogger`.
7.  **[Descoberta: 2026-05-09] Vazamento de Credenciais em Falhas de Conexão de Logs**
    *   *Impacto:* A exceção gerada no logger por `isValidURI` pode expor a senha de conexão em texto limpo no atributo `e.input`.
    *   *Correção:* Capturar a falha e aplicar máscaras de sanitização sobre o input no log de erro.
8.  **[Descoberta: 2026-05-09] Inconsistência de Nomenclatura em Error Handlers**
    *   *Impacto:* Métodos de captura de falhas possuem termos distintos (`handleFatalErrors`, `handlerErrors` e `handlingError`) nos contratos de Hasher, URI, Connection e Entity, confundindo o desenvolvedor.
    *   *Correção:* Padronizar sob a assinatura única `handlerErrors`.
9.  **[Descoberta: 2026-05-09] Inibição de Logs de Console fora de Ambientes Locais**
    *   *Impacto:* O logger padrão não inibe escritas no stdout do console em testes ou homologação.
    *   *Correção:* Bloquear escritas de console pelo logger padrão se o ambiente atual for diferente de `development`.
10. **[Descoberta: 2026-05-09] Inconsistência Ortográfica em Nomes de Arquivos**
    *   *Impacto:* Erros ortográficos como `StringWithLegth` (em vez de `StringWithLength`) e `IIdentyti` (em vez de `IIdentity`) criam confusão e quebras na legibilidade da API.
    *   *Correção:* Refatorar os nomes e atualizar todas as referências associadas.
11. **[Descoberta: 2026-05-09] Ausência de Logs de Rastreabilidade em Entidades** (`User.ts`)
    *   *Impacto:* Métodos expostos na interface `UserMethods` possuem pouca ou nenhuma rastreabilidade de logs informativos saudáveis.
    *   *Correção:* Ponderar e incluir logs não-invasivos e seguros nos fluxos internos.

---

## 🟢 PRIORIDADE 3: Severidade BAIXA (Testes, Tipos e Refatorações Secundárias)

Melhorias cosméticas, acertos de tipos estáticos e testes unitários de menor impacto estrutural.

1.  **[Descoberta: 2026-05-09] Insegurança do CPF Validator com Não-Numéricos** (`Cpf.validations.ts`)
    *   *Impacto:* O método privado `generateDigit` intercepta dados não-numéricos mas prossegue no processamento matemático, devolvendo a string `"NaN"` sem falhar de imediato. Como o método público já faz filtragem antecipada, essa branch de runtime perigosa permanece como código morto.
    *   *Correção:* Aplicar um `throw` imediato de segurança se o conversor de dígitos encontrar valores incompatíveis.
2.  **[Descoberta: 2026-05-09] Limitação de Tipos no Utilitário DeepReadonly** (`static.types.ts`)
    *   *Impacto:* O tipo estático utilitário `DeepReadonly<T>` não protege instâncias de `Date`, `Map` ou `Set`, permitindo que seus métodos de mutação (ex: `setTime()`) permaneçam expostos em DTOs "congelados".
    *   *Correção:* Substituir por um conditional type recursivo com ramos específicos para congelamento desses tipos primitivos nativos.
3.  **[Descoberta: 2026-05-09] Lacuna de Cobertura Unitária no DatabaseUsernameValidator**
    *   *Impacto:* Ausência de testes dedicados cobrindo isoladamente as branches lógicas da validação estrutural do DatabaseUsername.
    *   *Correção:* Estruturar e acionar a suíte unitária focada no validador.
4.  **[Descoberta: 2026-06-12] Validação Simplificada de DerivedKey por Otimização de Performance** (`security.types.ts`)
    *   *Impacto:* Os guards `isDerivedKey` e `assertsDerivedKey` validam o tamanho da chave calculando o comprimento da string em vez de decodificá-la para bytes através do `toBytes`. Embora ideal por evitar alocações e pressão de Garbage Collector em caminhos de execução quentes (uma vez que as chaves no momento são estritamente Hex), a verificação falhará se a aplicação adotar múltiplos encodings textuais para chaves binárias.
    *   *Correção:* Caso a aplicação passe a trafegar chaves derivadas em formatos agnósticos (Hex, Base64, etc.) simultaneamente, migrar a validação interna para usar `toBytes(value).length === bytes`.

---

## HISTÓRICO DE CONQUISTAS (Dívidas Concluídas)

Registro cronológico das refatorações, blindagens de segurança e melhorias de testes que foram consolidadas com absoluto sucesso no repositório.

*   **[Resolvido: 2026-05-25] Centralização e Desacoplamento Arquitetural de Máscaras (D29)**
    *   *Ação:* Transicionados todos os métodos de mascaramento dispersos para o arquivo central unificado `src/shared/masks/anonimization.masks.ts` e exportados via `@Masks`.
*   **[Resolvido: 2026-05-25] Testes de 100% de Cobertura no maskLogDatabaseUsername (D21)**
    *   *Ação:* Criada a suíte `anonimization.masks.test.ts` cobrindo rigorosamente todas as branches e tratamentos de erro no mascaramento com injeção de logs de testes.
*   **[Resolvido: 2026-05-25] Revisão Global de Máscaras Dispersas**
    *   *Ação:* Eliminamos funções soltas pela aplicação e readequamos os tipos de Level 1 para consumirem estritamente as assinaturas centrais da folha `anonimization.masks.ts`.
*   **[Resolvido: 2026-05-22] Testes unitários para ValkeyConnectionString (D19)**
    *   *Ação:* Cobertura de testes unitários elevados a 100% no Valkey Connection.
*   **[Resolvido: 2026-05-22] Limpeza de Métodos Mortos em URI de Contrato (D17)**
    *   *Ação:* Removida a implementação morta de `validateSpecificEnvValues()` de dentro de `BaseUri.contract.ts`.
*   **[Resolvido: 2026-05-18] Implementação da Geração de URI do Valkey (D15)**
    *   *Ação:* Finalizada a lógica de suporte e geração de conexões para Valkey Sentinel e TCP nos ambientes do gerador.
*   **[Resolvido: 2026-05-18] Guarda de Inicialização de Variáveis de Memória (D0)**
    *   *Ação:* Implementada a inicialização segura de variáveis de ambiente com validação Zod no `memDbEnv.schema.ts`.
