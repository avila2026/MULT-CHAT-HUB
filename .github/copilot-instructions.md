# Instruções do Copilot — MULT-CHAT-HUB

## Comandos de Build, Teste e Lint

**Instalar dependências**
```bash
pnpm install
```
> Use `pnpm` exclusivamente. `packageManager` está fixado em `pnpm@9.12.0`.

**Desenvolvimento**
```bash
# Lite (Electron + Vite frontend :3001 + Express backend :3000)
pnpm dev:lite                 # turbo run dev --filter=@mch/lite
pnpm --filter @mch/lite dev:all      # concurrently: vite + express
pnpm --filter @mch/lite server         # apenas backend express (tsx server/index.ts)
pnpm --filter @mch/lite electron:dev # dev + abre janela Electron

# Cloud (Next.js :3002)
pnpm dev:cloud                # turbo run dev --filter=@mch/cloud
```

**Builds de produção**
```bash
pnpm build                    # build de todos os apps/pacotes via turbo
pnpm build:lite               # build electron (frontend + servidor + electron-builder)
pnpm build:lite:web           # build vite apenas (para Vercel)
pnpm build:cloud              # next build para o app cloud
pnpm clean                    # turbo run clean + rm -rf node_modules
```

**Lint / Verificação de tipos**
```bash
pnpm lint                     # turbo run lint (next lint para cloud; tsc --noEmit para lite)
pnpm --filter @mch/cloud typecheck     # tsc --noEmit
pnpm --filter @mch/lite lint          # tsc --noEmit
```

**Testes**
```bash
pnpm test                     # turbo run test em todo o workspace
# Quando existirem arquivos de teste em um pacote:
# pnpm --filter @mch/lite test
# pnpm --filter @mch/cloud test
```
> Atualmente não existem arquivos `.test.`; o pipeline turbo está configurado e pronto.


## Arquitetura de Alto Nível

Este é um **monorepo pnpm + Turbo** com dois apps distintos e pacotes internos compartilhados sob `packages/@mch/*`.

### Apps

- **`apps/lite`** — Aplicação desktop (Electron + Vite + Express)
  - **Frontend**: SPA Vite/React 19 servido em `:3001` (dev) ou carregado de `dist/index.html` (produção Electron).
  - **Backend**: Express em `:3000` com proxy Ollama (`/api/chat`), execução de ferramentas (`/api/tools/execute`) e endpoint de health. Logging JSON estruturado em toda requisição.
  - **Electron**: `electron/main.cjs` inicia o backend Express compilado (`server-dist/index.js`) em produção e carrega a UI compilada pelo Vite. Logs do backend em `%APPDATA%/MULT CHAT HUB/logs/`.
  - **Motor Analítico**: Implementação pura em TypeScript em `src/lib/analyticalEngine.ts` — 5 tipos de análise (`descritiva`, `preditiva`, `anomalias`, `otimizacao`, `software`). Não requer Python.
  - **Deploy Vercel**: `vercel.json` faz build apenas do frontend de `apps/lite` (`outputDirectory: apps/lite/dist`). Recursos de backend não estão disponíveis no Vercel.
  - **Limite de compilação do servidor**: `server/` compila para `server-dist/` via `tsconfig.server.json` usando resolução de módulo `NodeNext`. Apenas `src/lib/analyticalEngine.ts` e `src/lib/providerAdapters.ts` são importações permitidas de `src/`.

- **`apps/cloud`** — Aplicação web (Next.js 15, porta `:3002`)
  - Atualmente uma página stub. `next.config.mjs` define `MCH_TARGET: 'cloud'`.
  - Dependências do cliente Supabase (`@supabase/supabase-js`, `@supabase/ssr`) estão no `package.json`, mas ainda não existem arquivos de configuração do cliente.

### Pacotes (`packages/@mch/*`)

Todos os pacotes atualmente têm scripts de build/teste stub. São bibliotecas internas compartilhadas:

| Pacote | Propósito |
|--------|-----------|
| `@mch/ui` | Componentes React compartilhados |
| `@mch/schema` | Schemas Drizzle ORM (SQLite para lite, Postgres para cloud) |
| `@mch/agent-runtime` | ReAct loop + despachante de ferramentas + injeção de memória |
| `@mch/provider-adapters` | Adaptadores unificados de LLM (Ollama, OpenAI, Anthropic, Gemini, OpenRouter) |
| `@mch/governance` | Orçamentos, log de auditoria, kill switch (apenas cloud) |
| `@mch/tools-registry` | Registro de ferramentas embutidas + manifests |
| `@mch/tokens` | Tokens de design compartilhados (CSS vars + exports JS) |
| `@mch/sandbox` | Wrapper sandbox (Docker no cloud, isolated-vm no lite) |

## Convenções Principais

- **UI em Português**: Todo texto visível ao usuário no app lite está em português brasileiro (`pt-BR`).
- **Variáveis de ambiente**: Copie `.env.example` para `.env.local` (raiz e/ou `apps/lite/.env.local`).
  - `APP_ACTIVATION_SECRET` é **obrigatória** — o servidor Express encerra imediatamente se não estiver definida. Nunca commite o valor real.
  - `OLLAMA_HOST` / `OLLAMA_MODEL` padrões: `http://localhost:11434` e `fazendaavila2026/avila:latest`.
  - `GITHUB_TOKEN` é opcional para as ferramentas `github_list_repos` / `github_create_issue`.
- **Aliases de caminho**: Ambos os apps usam `@/` mapeado para a raiz do pacote (paths do Vite/Next.js tsconfig).
- **CORS no Electron**: O handler CORS do Express permite explicitamente `origin: null` para suportar o protocolo `file://` do Electron.
- **Build do servidor**: O código do servidor lite fica em `apps/lite/server/` e compila para `server-dist/` via `tsconfig.server.json` (resolução de módulo NodeNext). Desenvolvimento usa `tsx server/index.ts`; produção usa `tsc -p tsconfig.server.json`. Não importe de `src/` no código do servidor, exceto pelos arquivos explicitamente incluídos `src/lib/analyticalEngine.ts` e `src/lib/providerAdapters.ts`.
- **Chunks do Vite**: `vite.config.ts` separa as libs `recharts` e `analysis-engine` em chunks manuais distintos para reduzir o carregamento inicial.
- **Tratamento de base URL**: `vite.config.ts` usa `base: './'` para builds Electron (`file://`) e `base: '/'` para web/Vercel. Use `import.meta.env.BASE_URL` para caminhos de assets.
- **Chaves do localStorage**: Todas as chaves usam o prefixo `mch:` (ex: `mch:theme`, `mch:chat_history`).
- **Logging estruturado**: O servidor Express loga toda requisição como JSON estruturado com campos `ts`, `level`, `reqId`, `method`, `path`, `status`, `durationMs`.
- **Workflow de release**: `.github/workflows/release.yml` faz build do instalador Windows NSIS em tags `v*` usando `npm run electron:build`.
- **Workflow de contribuição**: Convenções de nome de branch são `feature/*`, `bugfix/*`, `hotfix/*`, `docs/*` (veja `CONTRIBUTING.md`). Antes de abrir um PR, execute `pnpm lint`, `pnpm --filter @mch/lite lint`, `pnpm --filter @mch/cloud typecheck` e `pnpm build`. Todo PR precisa de pelo menos uma revisão antes do merge.

## Configs de Assistentes de IA neste Repositório

| Arquivo | Propósito |
|---------|-----------|
| `.github/copilot-instructions.md` | Este arquivo — baseline do Copilot CLI |
| `.codex/AGENTS.md` | Baseline do Codex CLI; referencia `.codex/config.toml` para servidores MCP (GitHub, Context7, Exa, Memory, Playwright, Sequential Thinking) |
| `.agents/skills/MULT-CHAT-HUB/SKILL.md` | Skill gerada pelo Codex para este repo |
| `.claude/skills/MULT-CHAT-HUB/SKILL.md` | Skill complementar voltada para Claude |

> Mantenha credenciais específicas do usuário e configs MCP privadas em `~/.codex/config.toml`, nunca commitadas no repo.
