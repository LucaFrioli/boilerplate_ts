// commitlint.config.mjs
export default {
  extends: ['@commitlint/config-conventional'],
  rules: {
    // Tipos aceitos no projeto
    'type-enum': [
      2,
      'always',
      [
        'feat',     // Nova funcionalidade
        'fix',      // Correção de bug
        'refactor', // Refatoração de código
        'refact',   // Alias para refatoração (já usado no projeto)
        'test',     // Adição ou ajuste de testes
        'docs',     // Documentação e ADRs
        'perf',     // Melhoria de performance
        'chore',    // Tarefas de build, configs ou tooling
        'ci',       // Ajustes de CI/CD e hooks
        'revert'    // Reversão de commits
      ],
    ],
    // Forçar letras minúsculas no tipo
    'type-case': [2, 'always', 'lower-case'],
    // Impedir mensagens vazias
    'subject-empty': [2, 'never'],
    // Impedir ponto final no título
    'subject-full-stop': [2, 'never', '.'],
  },
};
