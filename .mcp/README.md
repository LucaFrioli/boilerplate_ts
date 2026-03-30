# 🧠 Model Context Protocol (MCP)

Bem-vindo ao diretório de integrações **MCP** do nosso Boilerplate!

> **⚠️ AVISO PARA DEVS JUNIORES E RECÉM-CHEGADOS:**
> Não se assuste com esta pasta! **O uso do MCP é 100% opcional.** Você não precisa entender ou configurar nada aqui para rodar a aplicação, criar suas rotas ou rodar seus testes. Se quiser focar apenas no código TypeScript por enquanto, sinta-se livre para ignorar este diretório!

---

## O que é o MCP?

O **M**odel **C**ontext **P**rotocol é um padrão aberto que conecta assistentes de Inteligência Artificial (como o Cursor, Cline, RooCode ou Claude Desktop) diretamente às suas ferramentas locais de forma segura.

Em vez de você ter que copiar e colar logs de erro, esquemas de banco de dados ou tickets do Jira para a IA, os Servidores MCP permitem que a IA busque (apenas o que você autorizar) diretamente na sua máquina, em tempo real. Isso cria uma experiência de **Pair Programming de Alto Contexto**.

## Por que incluímos isso no Boilerplate?

Como este boilerplate visa ser uma arquitetura de referência (com testes extensivos, DDD, etc.), incluímos um ecossistema de MCPs para desenvolvedores Pleno/Sênior que desejam que a IA os ajude a:
- Conectar diretamente no banco local (`mcp-server-postgres`) para validar migrações.
- Manter uma "memória" de longo prazo sobre regras de negócio e arquitetura (`mcp-server-memory`).
- Inspecionar containers Docker locais.

Tudo isso roda **localmente na sua máquina**, sem enviar dados confidenciais para a nuvem de terceiros (o processamento da LLM ocorre com a IA, mas as ferramentas rodam no seu localhost).

## Como usar?

1. Adicionamos um arquivo de exemplo chamado `config.example.json`.
2. Dependendo da sua IDE ou ferramenta de IA, existe uma configuração (geralmente chamada `mcp.json` ou nas configurações gráficas da UI) onde você mapeia Servidores MCP.
3. Copie as configurações relevantes do nosso `config.example.json` para a sua IDE.
4. Ajuste variáveis locais (como a Connection String do banco de dados).
5. Pronto! Sua IA agora tem "pernas" para acessar recursos avançados do boilerplate localmente.
