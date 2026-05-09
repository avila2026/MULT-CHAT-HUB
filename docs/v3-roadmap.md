# MULT-CHAT-HUB v3 — Roadmap (Lite + Cloud)

> Roadmap público da plataforma híbrida. Detalhes operacionais e métricas internas vivem em `/root/.claude/plans/` (não publicado).

## Visão

Sair de "chat com Ollama" para **plataforma de agentes com governança**, em três camadas:

- **HUB** — portas LLM unificadas, persistência durável, auth.
- **AGENT OS** — workspaces, agents customizáveis, memória vetorial, registry de tools, sandbox.
- **AI COMPANY** — budgets, audit log, kill switch, marketplace de plugins, observabilidade, billing.

## Modos de deploy

| Target | Stack | Persistência | Provedores | Auth | Enterprise |
|---|---|---|---|---|---|
| **apps/lite** (Electron desktop) | Vite + React + better-sqlite3 + Express embutido | SQLite local | 5 (keys do usuário, secure storage) | Local-only (PIN opcional) | Desabilitado em build |
| **apps/cloud** (Next.js SaaS) | Next 15 + Postgres+pgvector + Redis + BullMQ | Postgres multi-tenant | 5 (keys por workspace, vault) | Auth.js v5 | Habilitado |

## Stack consolidada

- Monorepo: **pnpm workspaces** + **Turborepo**
- ORM: **Drizzle** (dialect SQLite + Postgres com mesmo schema)
- Vector store: **pgvector** (cloud); embeddings off no lite (ou sqlite-vss opcional)
- Fila: **BullMQ** + **Redis** (cloud); in-process no lite
- Streaming LLM: **SSE** uniforme (Express + Next.js Route Handlers)
- Auth: **Auth.js v5** + Drizzle adapter (cloud)
- Sandbox: **Docker** com seccomp/cgroups (cloud); **isolated-vm** (lite)
- Observability: **OpenTelemetry** → Tempo + Prometheus; **Sentry** (frontend)
- Pagamentos: **Stripe** (cloud)

## Estrutura monorepo

```
mult-chat-hub/
├── apps/
│   ├── lite/                     # Electron + Vite (atual /src e /electron)
│   ├── cloud/                    # Next.js 15 App Router
│   └── docs/                     # Astro Starlight (opcional)
├── packages/
│   ├── @mch/provider-adapters/   # 5 adapters LLM com interface comum
│   ├── @mch/agent-runtime/       # Loop ReAct + tool dispatcher + memory
│   ├── @mch/schema/              # Drizzle schema (SQLite + Postgres)
│   ├── @mch/tokens/              # Design tokens
│   ├── @mch/ui/                  # Componentes React compartilhados
│   ├── @mch/sandbox/             # Wrapper Docker / isolated-vm
│   ├── @mch/governance/          # Budgets, audit, kill switch (cloud)
│   └── @mch/tools-registry/      # Tools built-in + manifests
├── pnpm-workspace.yaml
├── turbo.json
└── package.json
```

## Roadmap — 10 PRs

| # | Branch | Sprint | Foco | Dias |
|---|---|---|---|---|
| 1 | `claude/v3-monorepo-bootstrap` | 0 | pnpm + Turborepo + apps/lite/* + stubs cloud/packages | 3 |
| 2 | `claude/v3-provider-adapters` | 1 | 5 adapters LLM (Ollama/OpenAI/Claude/Gemini/OpenRouter) com streaming | 7 |
| 3 | `claude/v3-schema-and-persistence` | 2 | Drizzle schema dual + better-sqlite3 + import localStorage→SQLite | 7 |
| 4 | `claude/v3-streaming-and-credentials-ui` | 3 | SSE end-to-end + UI de credenciais + safeStorage | 6 |
| 5 | `claude/v3-cloud-auth-and-workspaces` | 4 | Auth.js v5 + multi-tenant workspaces + RBAC (cloud) | 7 |
| 6 | `claude/v3-agent-runtime` | 5 | Loop ReAct + tool dispatcher + AgentBuilder UI | 8 |
| 7 | `claude/v3-memory-pgvector` | 6 | Memória de longo prazo + embeddings + retrieval | 6 |
| 8 | `claude/v3-tools-registry-and-sandbox` | 7 | Registry público + Docker sandbox / isolated-vm | 8 |
| 9 | `claude/v3-governance-budgets-audit` | 8 | Budgets + audit log + kill switch (cloud) | 7 |
| 10 | `claude/v3-observability-plugins-billing` | 9-10 | OTel + Sentry + plugin marketplace + Stripe | 12 |

Cada PR é shippable independentemente. PR #4 já entrega "v3 lite" usável com 5 provedores; depois disso tudo é incremento.

## Diferenciação build lite vs cloud

- Conditional imports via `package.json#exports` por pacote (`@mch/governance` exporta no-op stubs em condition `lite`).
- Build flag `MCH_TARGET=lite|cloud` em vite/next configs alimenta dead-code-elimination.
- Pacotes cloud-only (`@mch/governance`, BullMQ workers) não compõem o bundle Electron.

## Migração v2 → v3

- v2 (atual) continua funcional ao longo de PRs #1-#3.
- Importer one-shot em `apps/lite/electron/main.cjs` lê `localStorage:mch:state:v1` no primeiro boot v3 e popula SQLite.
- Cloud não tem migration (start fresh).
- Documentado em `docs/migration-v2-to-v3.md` (criado no PR #4).

## Riscos & mitigações

| Risco | Mitigação |
|---|---|
| 5 adapters divergem em tool calling | PR #2 inclui suite de conformidade comum |
| pgvector indisponível em alguns hosts | Suporte oficial Neon/Supabase; fallback BM25 |
| Sandbox Docker exige privilégios | fly.io/modal para tools com shell em cloud |
| Custos de embedding | Cache por hash de conteúdo; batch ≤ 100 |
| 5 meses é muito | Cada PR shippable; PR #4 já entrega valor |
| Bundle Electron > 200MB | Tree-shaking agressivo; deps cloud-only ficam fora do lite |
| Auth.js v5 em RC | Pin de versão; alternativa Lucia se travar |

## Verificação end-to-end (final do PR #10)

1. **Lite**: instalar `.exe`; primeiro boot importa localStorage; chat com 5 provedores funciona; restart preserva state.
2. **Cloud preview**: signup magic link; criar workspace; configurar key Anthropic; criar agent custom; ver streaming SSE; audit log e budget chart funcionando.
3. **Stress**: 50 chats simultâneos no cloud com BullMQ; Grafana mostra p95 < 800ms (sem token gen).
4. **Plugin**: instalar `weather-tool` em workspace; agent consome via tool call.
5. **Governança**: budget $1, kill switch, audit log — todos respondem como esperado.
6. **Migração v2 → v3**: usuário antigo abre v3; localStorage importado para SQLite; nenhum chat perdido.
