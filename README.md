<div align="center">
<img src="./assets/logo.png" width="240" alt="MULT-CHAT-HUB" />

# MULT-CHAT-HUB

Hub de colaboração **multi-IA** com motor analítico embutido.<br/>
Frontend React 19 + Vite · Backend Express · Desktop via Electron · LLM local via Ollama.

[![Deploy](https://img.shields.io/badge/Vercel-deploy-000?logo=vercel)](https://vercel.com/new/clone?repository-url=https://github.com/avila2026/MULT-CHAT-HUB)
[![Build Windows installer](https://github.com/avila2026/MULT-CHAT-HUB/actions/workflows/release.yml/badge.svg)](https://github.com/avila2026/MULT-CHAT-HUB/actions/workflows/release.yml)

</div>

## Visão geral

Plataforma onde **múltiplas IAs colaboram como uma equipe** num único ambiente self-contained, sem chave de API e sem nuvem obrigatória. Inclui:

- Chat com IAs locais (Ollama / `fazendaavila2026/avila`) e gateways externos (NullClaw).
- **Quantum Analytical Engine** em TypeScript puro — 5 análises quantitativas executadas localmente:
  - `analyze_descriptive` — estatísticas (count, mean, std, min, p25/p50/p75, max).
  - `analyze_predictive` — regressão linear multivariada (`ml-regression-multivariate-linear`).
  - `detect_anomalies` — z-score multivariado com limiar 2.5.
  - `optimize_linear` — programação linear (`javascript-lp-solver`).
  - `recommend_stack` — recomendação de stack tecnológica.
- Upload de **CSV/JSON**, persistência em `localStorage`, gráficos inline via `recharts`.
- Comandos slash que a IA emite e o app executa: `/criar_tarefa`, `/use_tool`, `/gerar_relatorio` etc.

## Pré-requisitos

- Node.js 20+
- pnpm 9+
- um backend LLM local ou remoto configurado:
  - [Ollama](https://ollama.com/download) para uso local (`ollama serve` + `ollama pull ...`)
  - ou `llama.cpp` com `llama-server` em HTTP/OpenAI-compatible (`http://127.0.0.1:8080/v1`)
  - ou um endpoint cloud compatível com OpenAI

## Rodar localmente

```bash
pnpm install
cp .env.example apps/lite/.env.local
# ajuste APP_ACTIVATION_SECRET + OLLAMA_HOST/OLLAMA_MODEL ou LLM_BASE_URL/LLM_PROVIDER
pnpm dev:all
```

Abra `http://localhost:3001`.

### Modo 1: Ollama local

```bash
ollama serve
ollama pull fazendaavila2026/avila
# no apps/lite/.env.local
APP_ACTIVATION_SECRET="sua-chave"
OLLAMA_HOST="http://localhost:11434"
OLLAMA_MODEL="fazendaavila2026/avila:latest"
LLM_PROVIDER="ollama"
```

### Modo 2: llama.cpp local

```bash
# exemplo: rodar o servidor do llama.cpp em HTTP
llama-server --model /caminho/para/model.gguf --port 8080 --ctx-size 4096
# no apps/lite/.env.local
APP_ACTIVATION_SECRET="sua-chave"
LLM_PROVIDER="llamacpp"
LLM_BASE_URL="http://127.0.0.1:8080/v1"
LLM_MODEL="local-model"
```

### Modo 3: cloud / OpenAI-compatible

```bash
# no apps/lite/.env.local
APP_ACTIVATION_SECRET="sua-chave"
OPENAI_API_KEY="sua-chave"
LLM_PROVIDER="openai"
# ou use um endpoint compatível via provider UI
```

> Importante: o projeto não deve depender de `llama.cpp` como pacote npm. O backend aceita esse modelo como servidor HTTP local/compatível em OpenAI, sem instalar nova dependency JS no monorepo.

## Empacotar como `.exe` Windows (Electron + NSIS)

Em uma máquina Windows:

```bash
npm install
npm run electron:build
```

Instalador gerado em `release/MULT CHAT HUB Setup <versão>.exe`. Ícone, asarUnpack e logging em `%APPDATA%/MULT CHAT HUB/logs/` já configurados.

> O app instalado precisa do Ollama rodando em `localhost:11434` com o modelo `fazendaavila2026/avila` baixado.

Alternativamente, dispare o workflow [`release.yml`](.github/workflows/release.yml) via push de tag `v*` ou `workflow_dispatch` para builds automatizados em `windows-latest`.

## Deploy no Vercel (modo demo: análises + UI completa)

O frontend é um SPA Vite/React publicável no Vercel:

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/avila2026/MULT-CHAT-HUB)

Config em [`vercel.json`](./vercel.json) — `buildCommand: npm run build:frontend`, `outputDirectory: dist`. Vercel detecta automaticamente.

**O que funciona no Vercel** (sem backend, 100% client-side):

| Recurso | Status no Vercel |
|---|---|
| UI completa, navegação, persistência localStorage | ✅ |
| Upload de CSV/JSON + preview | ✅ |
| `analyze_descriptive`, `analyze_predictive`, `detect_anomalies`, `optimize_linear`, `recommend_stack` | ✅ (engine TypeScript puro roda no browser) |
| Gráficos `recharts` inline | ✅ |
| Comandos slash (`/criar_tarefa`, `/concluir_tarefa`, `/limpar_dados`, `/gerar_relatorio`) | ✅ |
| Chat com Ollama (`/api/chat`) | ❌ Requer Ollama local — modo desktop |
| Tools `github_*`, `calculate_math`, `store/retrieve_memory`, `get_current_time` | ❌ Backend Express |
| Gateway NullClaw externo | ❌ |

Quando uma tool exige backend, o app exibe mensagem clara orientando a rodar `npm run dev:all` localmente.

Para chat completo no Vercel: hospede o backend Express separadamente (Fly.io, Railway, VPS com Ollama) e edite o proxy `/api` em `vite.config.ts`.

## Variáveis de ambiente

| Variável | Default | Descrição |
|---|---|---|
| `OLLAMA_HOST` | `http://localhost:11434` | URL do servidor Ollama |
| `OLLAMA_MODEL` | `fazendaavila2026/avila:latest` | Modelo padrão do `/api/chat` |
| `VITE_GITHUB_TOKEN` | (vazio) | Opcional, usado pelas tools `github_list_repos` / `github_create_issue` |
| `PORT` | `3000` | Porta do backend Express |

## Arquitetura

```
electron/main.cjs        ── janela Electron + spawn do Express
server/                  ── backend Express
  controllers/           ── chat (Ollama proxy), tools (engine + GitHub)
  lib/analyticalEngine   ── 5 análises em TypeScript puro
  routes/api.ts          ── /api/chat, /api/tools/execute
src/
  components/            ── UI React (ChatArea, Sidebar, AnalysisChart, ManualModal)
  context/ChatContext    ── state global, parser de comandos, persistência
  types.ts               ── Message, AnalysisResult, etc.
public/                  ── favicons, logo (servido por Vite)
build/                   ── recursos do electron-builder (icon.ico)
```

## Licença

Apache-2.0.
