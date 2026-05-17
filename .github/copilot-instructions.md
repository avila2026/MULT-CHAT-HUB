# Copilot Instructions — MULT-CHAT-HUB

## Build, Test, and Lint Commands

**Install dependencies**
```bash
pnpm install
```
> Use `pnpm` exclusively. `packageManager` is pinned to `pnpm@9.12.0`.

**Development**
```bash
# Lite (Electron + Vite frontend :3001 + Express backend :3000)
pnpm dev:lite                 # turbo run dev --filter=@mch/lite
pnpm --filter @mch/lite dev:all      # concurrently: vite + express
pnpm --filter @mch/lite server         # express backend only (tsx server/index.ts)
pnpm --filter @mch/lite electron:dev # dev + launch Electron window

# Cloud (Next.js :3002)
pnpm dev:cloud                # turbo run dev --filter=@mch/cloud
```

**Production builds**
```bash
pnpm build                    # build all apps/packages via turbo
pnpm build:lite               # electron build (frontend + server + electron-builder)
pnpm build:lite:web           # vite build only (for Vercel)
pnpm build:cloud              # next build for cloud app
pnpm clean                    # turbo run clean + rm -rf node_modules
```

**Lint / Type-check**
```bash
pnpm lint                     # turbo run lint (next lint for cloud; tsc --noEmit for lite)
pnpm --filter @mch/cloud typecheck
pnpm --filter @mch/lite lint  # tsc --noEmit
```

**Tests**
```bash
pnpm test                     # turbo run test (currently stubs — no actual test files)
```

## High-level Architecture

This is a **pnpm + Turbo monorepo** with two distinct apps and shared internal packages under `packages/@mch/*`.

### Apps

- **`apps/lite`** — Desktop application (Electron + Vite + Express)
  - **Frontend**: Vite/React 19 SPA served on `:3001` (dev) or loaded from `dist/index.html` (Electron production).
  - **Backend**: Express on `:3000` with Ollama proxy (`/api/chat`), tool execution (`/api/tools/execute`), and a health endpoint. Structured JSON logging on every request.
  - **Electron**: `electron/main.cjs` spawns the compiled Express backend (`server-dist/index.js`) in production and loads the Vite-built UI. Backend logs to `%APPDATA%/MULT CHAT HUB/logs/`.
  - **Analytical Engine**: Pure TypeScript implementation in `src/lib/analyticalEngine.ts` — 5 analysis types (`descritiva`, `preditiva`, `anomalias`, `otimizacao`, `software`). No Python required.
  - **Vercel deploy**: `vercel.json` builds `apps/lite` frontend only (`outputDirectory: apps/lite/dist`). Backend features are unavailable on Vercel.
  - **Server compilation boundary**: `server/` compiles to `server-dist/` via `tsconfig.server.json` using `NodeNext` module resolution. Only `src/lib/analyticalEngine.ts` and `src/lib/providerAdapters.ts` are allowed imports from `src/`.

- **`apps/cloud`** — Web application (Next.js 15, port `:3002`)
  - Currently a stub page. `next.config.mjs` sets `MCH_TARGET: 'cloud'`.
  - Supabase client dependencies (`@supabase/supabase-js`, `@supabase/ssr`) are in `package.json` but no client setup files exist yet.

### Packages (`packages/@mch/*`)

All packages currently have stub build/test scripts. They are intended as shared internal libraries:

| Package | Purpose |
|---------|---------|
| `@mch/ui` | Shared React components |
| `@mch/schema` | Drizzle ORM schemas (SQLite for lite, Postgres for cloud) |
| `@mch/agent-runtime` | ReAct loop + tool dispatcher + memory injection |
| `@mch/provider-adapters` | Unified LLM adapters (Ollama, OpenAI, Anthropic, Gemini, OpenRouter) |
| `@mch/governance` | Budgets, audit log, kill switch (cloud-only) |
| `@mch/tools-registry` | Built-in tools registry + manifests |
| `@mch/tokens` | Shared design tokens (CSS vars + JS exports) |
| `@mch/sandbox` | Sandbox wrapper (Docker in cloud, isolated-vm in lite) |

## Key Conventions

- **Portuguese UI**: All user-facing text in the lite app is in Brazilian Portuguese (`pt-BR`).
- **Environment variables**: Copy `.env.example` to `.env.local` (root and/or `apps/lite/.env.local`).
  - `APP_ACTIVATION_SECRET` is **mandatory** — the Express server exits immediately if unset. Never commit the real value.
  - `OLLAMA_HOST` / `OLLAMA_MODEL` default to `http://localhost:11434` and `fazendaavila2026/avila:latest`.
  - `GITHUB_TOKEN` is optional for `github_list_repos` / `github_create_issue` tools.
- **Path aliases**: Both apps use `@/` mapped to the package root (Vite/Next.js tsconfig paths).
- **Electron CORS**: The Express CORS handler explicitly allows `origin: null` to support Electron's `file://` protocol.
- **Server build**: Lite server source lives in `apps/lite/server/` and compiles to `server-dist/` via `tsconfig.server.json` (NodeNext module resolution). Do not import from `src/` in server code except for the explicitly included `src/lib/analyticalEngine.ts` and `src/lib/providerAdapters.ts`.
- **Vite chunks**: `vite.config.ts` splits `recharts` and `analysis-engine` libs into separate manual chunks to reduce initial load.
- **Base URL handling**: `vite.config.ts` uses `base: './'` for Electron builds (`file://`) and `base: '/'` for web/Vercel. Use `import.meta.env.BASE_URL` for asset paths.
- **localStorage keys**: All keys use the `mch:` prefix (e.g., `mch:theme`, `mch:chat_history`).
- **Structured logging**: The Express server logs every request as structured JSON with fields `ts`, `level`, `reqId`, `method`, `path`, `status`, `durationMs`.
- **Release workflow**: `.github/workflows/release.yml` builds the Windows NSIS installer on `v*` tags using `npm run electron:build`.
- **AI assistant configs**: `.codex/AGENTS.md` references repo-generated skills and an MCP baseline. Keep user-specific credentials and private MCPs in `~/.codex/config.toml`, not in this repo.
