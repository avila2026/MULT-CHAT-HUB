# Arquitetura — MULT-CHAT-HUB v3

## Topologia do monorepo

```
mult-chat-hub/                     # raiz (pnpm workspaces + Turborepo)
├── apps/
│   ├── lite/                       # Electron desktop (single user, offline)
│   │   ├── src/                    # React 19 + Vite
│   │   ├── server/                 # Express embutido (proxy + tools)
│   │   ├── electron/               # main.cjs (BrowserWindow + spawn server)
│   │   ├── public/, assets/, build/ # estáticos + ícones electron-builder
│   │   ├── index.html, vite.config.ts, tsconfig.json
│   │   └── package.json            # @mch/lite
│   └── cloud/                      # Next.js 15 SaaS (multi-tenant)
│       ├── app/                    # App Router (Auth.js, /admin, /marketplace)
│       ├── next.config.mjs, tsconfig.json
│       └── package.json            # @mch/cloud
├── packages/@mch/
│   ├── provider-adapters/          # 5 adapters LLM (Ollama/OpenAI/Anthropic/Gemini/OpenRouter)
│   ├── agent-runtime/              # Loop ReAct + tool dispatcher
│   ├── schema/                     # Drizzle dual (SQLite + Postgres dialects)
│   ├── tokens/                     # Design tokens
│   ├── ui/                         # Componentes React compartilhados
│   ├── sandbox/                    # Wrapper Docker / isolated-vm
│   ├── governance/                 # Budgets, audit, kill switch (cloud)
│   └── tools-registry/             # Tools built-in + manifests
├── docs/                           # v3-roadmap.md, architecture.md, guias
├── pnpm-workspace.yaml, turbo.json
├── tsconfig.base.json              # config TS compartilhada
└── package.json                    # scripts orquestradores
```

## Decisões de stack

| Camada | Escolha | Por quê |
|---|---|---|
| Build orchestration | Turborepo + pnpm | Cache distribuído de builds; pnpm tem o melhor suporte a workspaces e symlinks |
| ORM | Drizzle | Mesmo schema TS gera dialects SQLite (lite) e Postgres (cloud); migrations versionadas |
| Vector store | pgvector | Padrão de mercado em Postgres; cloud-native; Neon/Supabase têm suporte first-class |
| Fila | BullMQ + Redis (cloud) | Robustez para jobs longos (embeddings, scrapes); retry e dead-letter |
| Streaming LLM | SSE | Funciona em Express e Next.js Route Handlers sem WebSocket; mais simples que WS |
| Auth (cloud) | Auth.js v5 | Já tem Drizzle adapter; magic-link + OAuth out of the box |
| Sandbox (cloud) | Docker + seccomp | Isolamento real; integra com runners gerenciados (fly.io, modal) |
| Sandbox (lite) | isolated-vm | Sem dependência de Docker no desktop; só JS-only tools |
| Observability | OpenTelemetry → Tempo + Prometheus + Sentry (front) | Padrão CNCF; agnóstico de vendor |
| Pagamentos | Stripe (cloud) | Industry standard; Webhooks robustos |

## Diferenciação build lite vs cloud

```
                           ┌────────────────────────────┐
                           │  MCH_TARGET=lite|cloud      │
                           │  (env de build, vite/next)  │
                           └────────────┬────────────────┘
                                        │
                ┌───────────────────────┴────────────────────────┐
                │                                                 │
        ┌───────▼────────┐                              ┌─────────▼─────────┐
        │ apps/lite      │                              │ apps/cloud         │
        │ Vite + Electron│                              │ Next.js 15         │
        ├────────────────┤                              ├───────────────────┤
        │ better-sqlite3 │                              │ Postgres+pgvector │
        │ Express embed  │                              │ Auth.js v5         │
        │ isolated-vm    │                              │ BullMQ + Redis     │
        │ no auth        │                              │ Stripe             │
        └────────┬───────┘                              │ Docker sandbox     │
                 │                                      └─────────┬─────────┘
                 │  consumes                                       │  consumes
                 │                                                 │
                 └─────────┬───────────────────────────────────────┘
                           ▼
              ┌─────────────────────────────┐
              │   packages/@mch/*           │
              │  shared TS sources          │
              ├─────────────────────────────┤
              │ provider-adapters           │
              │ agent-runtime               │
              │ schema (Drizzle)            │
              │ tokens, ui                  │
              │ sandbox                     │
              │ governance (no-op em lite)  │
              │ tools-registry              │
              └─────────────────────────────┘
```

Conditional code via:
- `package.json#exports` por pacote (condition `lite` exporta no-op stubs).
- Build flag `MCH_TARGET` em vite/next configs alimenta dead-code-elimination.

## Comandos

| Ação | Comando |
|---|---|
| Dev lite (web only) | `pnpm dev:lite` |
| Dev lite (Electron) | `pnpm dev:lite:electron` |
| Dev cloud | `pnpm dev:cloud` |
| Build lite (instalador) | `pnpm build:lite` |
| Build lite (web → Vercel) | `pnpm build:lite:web` |
| Build cloud | `pnpm build:cloud` |
| Lint todos | `pnpm lint` |
| Test todos | `pnpm test` |
| Limpar | `pnpm clean` |

## Estado atual (PR #1 — bootstrap)

- ✅ Monorepo pnpm + Turborepo
- ✅ apps/lite contém o app v2 atual movido (sem mudança comportamental)
- ✅ apps/cloud com stub Next.js mínimo
- ✅ packages/@mch/* com stubs vazios
- ✅ vercel.json atualizado para buildar apps/lite
- ⏳ pnpm-lock.yaml será gerado no primeiro `pnpm install` (não commitado neste PR para evitar conflitos com lockfile npm; usuário regenera localmente)
- ⏳ Pacotes serão preenchidos nos PRs subsequentes (ver `docs/v3-roadmap.md`)
