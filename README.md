<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# MULT CHAT HUB

Hub de colaboração multi-IA. Frontend React 19 + Vite, backend Express, empacotado como app desktop com Electron. O backend de LLM é o **Ollama local** (`http://localhost:11434`).

View original prototype on AI Studio: https://ai.studio/apps/8745538f-c941-4185-9078-89f596ca305d

## Pré-requisitos

- Node.js 18+
- [Ollama](https://ollama.com/download) instalado e rodando (`ollama serve`)
- Modelo baixado: `ollama pull llama3.1:8b` (ou outro de sua preferência)

## Rodar localmente (web)

1. Instalar dependências:
   ```
   npm install
   ```
2. Copiar `.env.example` para `.env.local` e ajustar se necessário (host/modelo do Ollama, token GitHub opcional):
   ```
   cp .env.example .env.local
   ```
3. Subir frontend + backend:
   ```
   npm run dev:all
   ```
4. Abrir `http://localhost:3001` no navegador.

## Empacotar como app Windows (Electron)

Em uma máquina Windows com Node.js 18+:

1. `npm install`
2. `copy .env.example .env.local` e ajustar
3. `npm run electron:build`
4. Instalador NSIS gerado em `release/MULT CHAT HUB Setup <versão>.exe`

> O app instalado precisa do Ollama rodando em `localhost:11434` na máquina de uso.

## Variáveis de ambiente

| Variável | Default | Descrição |
|---|---|---|
| `OLLAMA_HOST` | `http://localhost:11434` | URL do servidor Ollama |
| `OLLAMA_MODEL` | `llama3.1:8b` | Modelo padrão usado pelo `/api/chat` |
| `VITE_GITHUB_TOKEN` | (vazio) | Opcional, usado pelas tools `github_list_repos` / `github_create_issue` |
| `PORT` | `3000` | Porta do backend Express |
