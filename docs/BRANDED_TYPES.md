# Guia de Branded Types (Tipagem Nominal) no WildcardBoiler

Este documento serve como referência de onboarding e "cheat sheet" sobre o ecossistema de **Branded Types** (tipagem nominal) utilizado na API do WildcardBoiler.

---

## 1. O que são Branded Types?

Por padrão, o TypeScript utiliza um sistema de tipagem **estrutural** (duck typing). Se duas interfaces possuem o mesmo formato, o TypeScript assume que são equivalentes.

```typescript
type Email = string;
type CPF = string;

function enviarEmail(destinatario: Email) { ... }

const meuCpf: CPF = "123.456.789-00";
enviarEmail(meuCpf); // ✅ Compila sem erros no TS estrutural! (Ambos são 'string')
```

Para evitar essa mistura perigosa em sistemas críticos de segurança e criptografia, utilizamos **Branded Types** (tipagem nominal). Adicionamos uma "marca" (brand) no plano de compilação do TypeScript que torna um tipo estruturalmente incompatível com o tipo primitivo bruto, forçando a validação ativa em runtime antes da atribuição de tipo.

O tipo base de utilidade `Brand` está definido em [brand.type.ts](../src/shared/types/brand.type.ts).

---

## 2. Filosofia: "Parse, Don't Validate"

Em vez de validar dados repetidamente em múltiplos locais e cruzar variáveis brutas, aplicamos o padrão **Parse, Don't Validate**.

Qualquer dado externo ou bruto (como strings do `.env` ou payloads HTTP) deve passar por um **Type Guard** ou **Assertion Function**. Uma vez validado, ele recebe a marca nominal (ex: `ValidCPF` ou `DatabaseURI`) e pode trafegar pelo domínio de forma segura, garantindo que qualquer função receptora tenha certeza de que o dado está higienizado e correto.

---

## 3. Catálogo dos Branded Types do Boilerplate

### Identificadores (Identity)
Definidos em [identity.type.ts](../src/shared/types/identity.type.ts).

*   **`AppID`** (`Brand<string, 'AppID'>`)
    *   *Propósito*: IDs expostos para o exterior (APIs públicas, URLs). Geralmente configurado como NanoID.
    *   *Validação*: `isAppID(rawId)`. Checa dinamicamente contra a regex do padrão de tamanho/alfabeto configurados no ambiente.
*   **`DatabaseID`** (`Brand<string, 'DatabaseID'>`)
    *   *Propósito*: Identificadores primários e de indexação internos do banco de dados (geralmente UUIDv7 para ordenação natural por timestamp).
    *   *Validação*: `isDatabaseID(rawId)`. Checa dinamicamente contra a regex de formato ativo de IDs do banco.

### Informações Pessoais (PII - Personally Identifiable Information)
Definidos em [pii.types.ts](../src/shared/types/pii.types.ts).

*   **`ValidCPF`** (`Brand<string, 'ValidCPF'>`)
    *   *Propósito*: Representar CPFs matematicamente válidos e higienizados (exclusivamente 11 caracteres numéricos).
    *   *Validação*: `isValidCPF(rawValue)`. Executa verificação matemática dos dígitos verificadores por Módulo 11.
    *   *Segurança*: Caso a validação falhe, gera logs mascarados via `maskPII` para conformidade com a LGPD/GDPR.
*   **`ValidEmail`** (`Brand<string, 'ValidEmail'>`)
    *   *Propósito*: E-mail sintaticamente válido.
    *   *Validação*: `isValidEmail(rawValue)` / `assertValidEmail(rawValue)`. Valida regras da RFC 5322 e executa classificação de Hosts DNS.
*   **`ValidUsernamePii`** (`Brand<string, 'ValidUsernamePii'>`)
    *   *Propósito*: Nome de usuário de usuário final, seguro contra ReDoS e ataques de injeção sintática.
    *   *Validação*: `isValidUsernamePii(rawValue)` / `assertValidUsernamePii(rawValue)`. Exige tamanho de 3 a 30 caracteres, sem caracteres especiais consecutivos, acentos ou símbolos não-ASCII.

### Criptografia e Segurança
Definidos em [security.types.ts](../src/shared/types/security.types.ts).

*   **`ValidCryptoKey`** (`Brand<string, 'ValidCryptoKey'>`)
    *   *Propósito*: Chaves de alta entropia (mínimo de 256 bits) para Peppers, chaves AES ou sementes HMAC.
    *   *Validação*: `isValidCryptoKey(rawValue)` / `assertsValidCryptoKey(rawValue)`.
*   **`HashedString`** (`Brand<string, 'HashedString'>`)
    *   *Propósito*: String contendo senhas que já foram processadas por algoritmos de hashing (Argon2 ou Bcrypt).
    *   *Validação*: `isHashedString(rawValue, provider)`. Valida se o formato obedece à expressão regular do respectivo hasher ativo.
*   **`DerivedKey<N>`** (`Brand<string, { bytes: N; isDerived: true }>`)
    *   *Propósito*: Chave criptográfica derivada hexadecimal de exatos `N` bytes (usada em KDF/HKDF).
    *   *Validação*: `isDerivedKey(value, bytes)` / `assertsDerivedKey(value, bytes)`. Garante exatos `N * 2` caracteres e morfologia estritamente hexadecimal.
*   **`DatabaseUsername`** (`Brand<string, 'DatabaseUsername'>`)
    *   *Propósito*: Nome de usuário para conexões com bancos de dados.
    *   *Validação*: `isDatabaseUsername(dbUname, dbName)` / `assertsDatabaseUsername(dbUname, dbName)`. Exige conformidade com a morfologia corporativa estrita (`ambiente_servico_permissao_id_entropia`).

### Endereçamento e Conexão (URIs)
Definidos em [security.types.ts](../src/shared/types/security.types.ts).

*   **`Uri`** (`Brand<string, 'Uri'>`)
    *   *Propósito*: Qualquer URI sintaticamente aceita.
    *   *Validação*: `isValidUri(uri)`. Utiliza o construtor `new URL(uri)` interno.
*   **`DatabaseURI`** (`Brand<string, 'DatabaseURI'>`)
    *   *Propósito*: String de conexão validada para bancos de dados persistentes da aplicação (ex: MongoDB).
    *   *Validação*: `isDatabaseUri(uri)`. Checa se o protocolo de conexão pertence a `dbProtocols`.
*   **`MemDatabaseURI`** (`Brand<string, 'MemDatabaseURI'>`)
    *   *Propósito*: String de conexão para bancos de cache/memória (Valkey/Redis).
    *   *Validação*: `isMemDatabaseUri(uri, dbName)` / `assertsMemDatabaseURI(uri, dbName)`. Executa varredura profunda de redes TCP, TLS, Unix Domain Sockets e Sentinels.

---

## 4. Guia de Implementação Prática

### A. Validação Condicional (Type Guards)
Retornam `value is BrandType`. São usados para bifurcar o fluxo lógico do negócio:

```typescript
import { isValidCPF, type ValidCPF } from '@Types';

function processInput(cpfInput: unknown) {
    if (isValidCPF(cpfInput)) {
        // cpfInput é estreitado automaticamente para ValidCPF
        saveCpf(cpfInput);
    } else {
        // cpfInput continua sendo unknown
        logError("Formato de CPF inválido.");
    }
}
```

### B. Falha Rápida (Assertion Functions)
Utilizam a assinatura `asserts value is BrandType`. São usados para interromper imediatamente o runtime em caso de falha física (portão de Fail-Fast):

```typescript
import { assertValidEmail } from '@Types';

function executeTransaction(emailInput: unknown) {
    assertValidEmail(emailInput);
    // A partir deste ponto, o TypeScript garante que emailInput é ValidEmail.
    // Se a validação falhar, uma exceção é lançada e o fluxo é abortado.
    mailer.send(emailInput);
}
```

---

## 5. Regras de Ouro e Anti-Patterns

Para manter a segurança e a integridade da tipagem, siga estas orientações:

1.  **NUNCA utilize coerção de tipo direta (`as`) no domínio**:
    *   ❌ *Incorreto*: `const cpf = payload.cpf as ValidCPF;`
    *   ✅ *Correto*: `if (!isValidCPF(payload.cpf)) throw new Error();`
2.  **Use coerção (`as`) apenas nas fronteiras de validação física**:
    *   O uso de `as` é exclusivo e interno de dentro das funções `isValidX` ou `StringWithLegthGen` após a validação física dos dados em runtime.
3.  **Nunca silencie o Logger**:
    *   Os type guards do boilerplate são acoplados a loggers estruturados. Não remova esses logs, pois eles rastreiam tentativas de injeção ou falhas de configuração.
