# AGENTS.md — MULT-CHAT-HUB

## Package manager & runtime

- **pnpm 9.12.0+** obrigatório. Não use `npm` nem `yarn`; o workspace é pnpm-only.
- **Node 20+**. O CI (`release.yml`) fixa `'20'`.
- Workspaces ativos: `apps/*` + `packages/@mch/*` (`pnpm-workspace.yaml`).
- Turborepo orquestra build/test/lint. Nunca rode `tsc` ou `vite` direto na raiz — use os scripts do `package.json` raiz.

## Monorepo entrypoints & boundaries

```
apps/lite/      ← Electron + Vite + Express. Único app com backend real.
apps/cloud/     ← Next.js 15 SaaS (stub; Supabase obrigatório). Sem backend próprio ainda.
packages/@mch/  ← 7 pacotes compartilhados. Muitos ainda stub; provider-adapters e tools-registry são os mais usados.
```

- `apps/lite` é onde **todo o desenvolvimento ativo** acontece. O `apps/cloud` é um esqueleto futuro.
- Build Electron: `pnpm build:lite` gera instalador Windows (`release/*.exe`).
- Deploy Vercel: `vercel.json` builda **apenas** o frontend de `apps/lite` (`build:frontend`). O backend **não roda** no Vercel.

## Dev commands that matter

| Quero… | Comando correto |
|---|---|
| Rodar lite (web + backend) | `pnpm dev:all` — sobe Vite `:3001` **e** Express `:3000` via `concurrently`. Não basta `pnpm dev` (só frontend). |
| Rodar lite no Electron | `pnpm dev:lite:electron` |
| Rodar cloud | `pnpm dev:cloud` |
| Testar **engine** analítico | `pnpm --filter @mch/lite exec tsx src/lib/analyticalEngine.test.ts` |
| Testar **controller** de tools | `pnpm --filter @mch/lite exec tsx server/controllers/toolController.test.ts` |
| Testar tudo do lite | `pnpm --filter @mch/lite test` |
| Buildar frontend (Vercel / demo) | `pnpm build:lite:web` |
| Buildar instalador .exe | `pnpm build:lite` |
| Lint geral | `pnpm lint` |

> **Não existe** test runner formal (Jest/Vitest). Testes rodam via `tsx` com asserts manuais (`console.assert` + process exit code).

## ESM gotchas

- `apps/lite` usa `"type": "module"`. Nunca assuma `__dirname`/`__filename` disponíveis.
- Para obter `__dirname` em arquivos do servidor (ex: `toolController.ts`), use o padrão:
  ```ts
  import { fileURLToPath } from 'url';
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  ```
- `tsconfig.base.json` define `module: ESNext`, `moduleResolution: bundler`, `noEmit: true`. Build do servidor usa `tsconfig.server.json` separado (gera `server-dist/`).

## Environment & secrets

- Copie `.env.example` → **`apps/lite/.env.local`** (arquivo **git-ignored**).
- `APP_ACTIVATION_SECRET` é **obrigatória** — o servidor Express não sobe sem ela.
- `GITHUB_TOKEN` **sem prefixo `VITE_`** — é usado server-side em `toolController.ts`.
- `OLLAMA_HOST` default: `http://localhost:11434`. Ollama deve estar com `ollama serve` + modelo `fazendaavila2026/avila:latest` baixado.
- `VITE_GITHUB_TOKEN` (prefixo `VITE_`) é **diferente** de `GITHUB_TOKEN` — o primeiro expõe no bundle, o segundo não.
- `SUPABASE_*` só serve para `apps/cloud`. Se estiver trabalhando só no `lite`, pode ignorar.

## Security conventions

- **`apps/lite/data/` está no `.gitignore`** (não comite). É onde `provenance.jsonl` é gerado em runtime.
- Qualquer alteração em `recordProvenance()` ou `maskSensitive()` no `toolController.ts` **deve** manter o comportamento: dados sensíveis (chaves `apiKey`, `password`, `token`, `secret`, `auth`, `credential`, `privateKey`, `bearer`) são mascarados com `****` antes de persistir no `.jsonl`, mas o hash SHA-256 continua sendo do valor original.
- Adicione `apps/lite/data/` ao `.gitignore` sempre que criar um clone limpo — já está protegido no repo, mas reforce se houver dúvida.

## Vite config quirks

- `base` é dinâmico: `./` no build Electron (`file://`), `/` no build web/Vercel (SPA rewrite).
- Proxy `/api` → `http://localhost:3000` (backend Express). Alterar backend sem ajustar proxy quebra dev.
- `DISABLE_HMR=true` desabilita HMR (usado em AI Studio). O watch também está desligado por padrão no repo original.
- Code splitting manual: `recharts` e `ml-regression-multivariate-linear`/`javascript-lp-solver` ficam em chunks separados.

## Git & release workflow

- Commits: Conventional Commits (`feat:`, `fix:`, `security:`, etc.).
- CI release: push de tag `v*` dispara `release.yml` (build Windows installer no `windows-latest`).
- Não commitar `pnpm-lock.yaml` em PRs de bootstrap/migração se o lockfile anterior for `npm` — regenere localmente com `pnpm install`.

## Testing strategy (current)

- `analyticalEngine.test.ts` → testes das 5 funções de análise (descriptive, predictive, anomalies, optimize, recommend).
- `toolController.test.ts` → testes de validação de args, limites de payload (>256KB), mascaramento de dados sensíveis e hash SHA-256.
- Ambos rodam com `tsx` (sem framework de testes). Falha é detectada por `process.exit(1)`.

## What not to touch without confirming

- `turbo.json` — afeta cache de build e dependências entre pacotes. Mudanças podem quebrar `dev:all`.
- `pnpm-workspace.yaml` — adicionar/remover workspaces exige `pnpm install` + possível reconfiguração de `turbo.json`.
- `electron/main.cjs` — entrypoint Electron. Alterar sem testar build `.exe` localmente é arriscado.
