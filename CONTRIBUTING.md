# Guia de Contribuição para o Repositório MULT-CHAT-HUB

Bem-vindo(a) ao repositório **MULT-CHAT-HUB**! Este documento contém o passo a passo e as melhores práticas para contribuir com o projeto.

## Fluxo de Desenvolvimento

### 1. Clonar o repositório

Primeiro, faça o clone do projeto em sua máquina local, utilizando o comando abaixo:
```bash
git clone https://github.com/avila2026/MULT-CHAT-HUB.git
cd MULT-CHAT-HUB
```

### 2. Sempre trabalhe a partir do ramo principal

Nosso ramo principal é chamado `main`. Antes de realizar quaisquer alterações, certifique-se de que você está atualizado com o `main`:
```bash
git checkout main
git pull origin main
```

### 3. Criar novos ramos para sua contribuição

Crie um novo ramo baseado no `main`. Utilize a seguinte convenção para nomes de branch:
- `feature/nome-funcionalidade` para novas funcionalidades.
- `bugfix/correção-x` para correções de bug.
- `hotfix/ajuste-emergencial` para ajustes emergenciais.
- `docs/nome-documentacao` para atualizações de documentação.

Exemplo:
```bash
git checkout -b feature/nova-interacao-chat
```

### 4. Mantenha seu branch atualizado

Sempre sincronize seu branch com o `main` para evitar conflitos durante o merge:
```bash
git checkout main
git pull origin main
git checkout feature/nova-interacao-chat
git rebase main
```

### 5. Commits

Escreva mensagens de commit claras e em português (ou inglês, mantendo consistência com o histórico):
- Use o imperativo ("Adiciona...", "Corrige...", "Remove...").
- Inclua o contexto do que foi alterado.
- Se houver issue relacionada, referencie-a: `Corrige bug de rolagem (#42)`.

### 6. Pull Requests

Antes de abrir um PR:
- Certifique-se de que seu branch está atualizado com o `main`.
- Execute os comandos de lint e type-check localmente:
  ```bash
  pnpm lint
  pnpm --filter @mch/lite lint
  pnpm --filter @mch/cloud typecheck
  ```
- Verifique se o build passa:
  ```bash
  pnpm build
  ```

No PR, inclua:
- Descrição clara do que foi alterado e por quê.
- Passos para testar.
- Screenshots ou GIFs, se houver mudanças visuais.

### 7. Revisão de Código

- Todo PR deve ser revisado por pelo menos um colaborador antes do merge.
- Aprovações devem ser obtidas antes de clicar em "Merge".
- Resolva os comentários antes de prosseguir.
- Utilize squash merge ou merge commit conforme a natureza da alteração.

## Estrutura do Projeto

Este é um monorepo `pnpm` + `Turbo`. As mudanças devem ser feitas no app ou pacote correto:

- `apps/lite` — Aplicação desktop (Electron + Vite + Express)
- `apps/cloud` — Aplicação web (Next.js)
- `packages/@mch/*` — Pacotes internos compartilhados

Sempre execute `pnpm install` na raiz após alterar dependências.

## Variáveis de Ambiente

Nunca commite valores reais de segredos. Copie `.env.example` para `.env.local` e preencha localmente.

## Dúvidas?

Abra uma issue ou discuta no PR. Obrigado por contribuir!
