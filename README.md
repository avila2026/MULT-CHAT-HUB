<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# MULT CHAT HUB

Hub de colaboração multi-IA. Frontend React 19 + Vite, backend Express, empacotado como app desktop com Electron. O backend de LLM usa **Google Gemini** como provedor padrão (cloud) com fallback automático para **Ollama local** se a API key não estiver configurada.

View original prototype on AI Studio: https://ai.studio/apps/8745538f-c941-4185-9078-89f596ca305d

## Pré-requisitos

- Node.js 18+
- API key do Gemini em https://ai.google.dev (free tier disponível) **ou** Ollama local (https://ollama.com) como fallback

## Rodar localmente (web)

1. Instalar dependências:
   ```
   npm install
   ```
2. Copiar `.env.example` para `.env.local` e preencher `GEMINI_API_KEY`:
   ```
   cp .env.example .env.local
   # editar .env.local: GEMINI_API_KEY="sua-key-aqui"
   ```
3. Subir frontend + backend:
   ```
   npm run dev:all
   ```
4. Abrir `http://localhost:3001` no navegador.

### Usar Ollama local em vez de Gemini

Deixe `GEMINI_API_KEY=""` no `.env.local`, instale o [Ollama](https://ollama.com), rode `ollama serve` e `ollama pull llama3.1:8b`. O backend automaticamente usa Ollama quando Gemini não está configurado.

## Empacotar como app Windows (Electron)

Em uma máquina Windows com Node.js 18+:

1. `npm install`
2. `copy .env.example .env.local` e preencher `GEMINI_API_KEY`
3. `npm run electron:build`
4. Instalador NSIS gerado em `release/MULT CHAT HUB Setup <versão>.exe`

## Variáveis de ambiente

| Variável | Default | Descrição |
|---|---|---|
| `GEMINI_API_KEY` | (vazio) | Key do Gemini. Se vazio, cai para Ollama. |
| `GEMINI_MODEL` | `gemini-2.5-flash` | Modelo Gemini (ex: `gemini-2.5-pro` para melhor qualidade) |
| `OLLAMA_HOST` | `http://localhost:11434` | URL do servidor Ollama (fallback) |
| `OLLAMA_MODEL` | `llama3.1:8b` | Modelo Ollama padrão (fallback) |
| `VITE_GITHUB_TOKEN` | (vazio) | Opcional, usado pelas tools `github_list_repos` / `github_create_issue` |
| `PORT` | `3000` | Porta do backend Express |
