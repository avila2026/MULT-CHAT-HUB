---
name: ollama-local-proxy
description: Use quando precisar expor um endpoint POST /api/chat (ou similar) que faz proxy para Ollama local rodando em localhost:11434, injetando system instruction e parametrizando o nível de pensamento (num_predict).
allowed-tools: Read, Write, Edit, Bash
---

# ollama-local-proxy

Proxy HTTP enxuto entre frontend e Ollama. Empacota chamadas para `/api/generate` do Ollama com:

- System instruction injetável (parâmetro, não hardcoded).
- Mapa de "nível de pensamento" → `num_predict` (controla tamanho do output).
- Modelo configurável via env var.
- Timeout opcional.

Compatível com Express, Fastify, ou qualquer framework Node que aceite `(req, res) => Promise<void>`.

## API

```ts
type ThinkingLevel = string;

interface OllamaProxyOptions {
  /** URL base do Ollama. Default: process.env.OLLAMA_HOST ?? 'http://localhost:11434' */
  host?: string;
  /** Modelo a usar. Default: process.env.OLLAMA_MODEL ?? 'llama3' */
  model?: string;
  /** System instruction injetada antes do user input. */
  systemInstruction: string;
  /** Mapa nível → num_predict. Default: { LOW: 512, HIGH: 2048 } */
  thinkingMap?: Record<ThinkingLevel, number>;
  /** Timeout em ms. Default: 60000 */
  timeoutMs?: number;
}

function createOllamaProxy(opts: OllamaProxyOptions): (req: Request, res: Response) => Promise<void>;
```

Esperado no body do request: `{ input: string; thinking?: ThinkingLevel }`.
Retorno: `{ text: string }`.

## Source

```ts
// ollama-local-proxy.ts
import type { Request, Response } from 'express';

const DEFAULT_THINKING_MAP = { LOW: 512, HIGH: 2048 };

export interface OllamaProxyOptions {
  host?: string;
  model?: string;
  systemInstruction: string;
  thinkingMap?: Record<string, number>;
  timeoutMs?: number;
}

export function createOllamaProxy(opts: OllamaProxyOptions) {
  const host = opts.host ?? process.env.OLLAMA_HOST ?? 'http://localhost:11434';
  const model = opts.model ?? process.env.OLLAMA_MODEL ?? 'llama3';
  const thinkingMap = opts.thinkingMap ?? DEFAULT_THINKING_MAP;
  const timeoutMs = opts.timeoutMs ?? 60_000;

  return async (req: Request, res: Response): Promise<void> => {
    const { input, thinking } = req.body ?? {};
    if (!input || typeof input !== 'string') {
      res.status(400).json({ error: 'Campo "input" (string) é obrigatório.' });
      return;
    }

    const num_predict = thinkingMap[thinking ?? 'HIGH'] ?? thinkingMap['HIGH'] ?? 2048;
    const prompt = `${opts.systemInstruction}\n\nUsuário: ${input}\n\nAssistente:`;

    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), timeoutMs);
    try {
      const resp = await fetch(`${host}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model,
          prompt,
          stream: false,
          options: { num_predict, temperature: 0.7 },
        }),
        signal: ctrl.signal,
      });
      clearTimeout(t);
      if (!resp.ok) {
        const errText = await resp.text();
        res.status(502).json({ error: `Ollama respondeu ${resp.status}: ${errText}` });
        return;
      }
      const data = await resp.json();
      res.json({ text: data.response ?? '', model, num_predict });
    } catch (err: any) {
      clearTimeout(t);
      if (err.name === 'AbortError') {
        res.status(504).json({ error: `Timeout (${timeoutMs}ms) ao chamar Ollama.` });
      } else {
        res.status(500).json({ error: `Falha ao conectar Ollama: ${err.message}` });
      }
    }
  };
}
```

## Uso (Express)

```ts
import express from 'express';
import { createOllamaProxy } from './ollama-local-proxy';

const SYSTEM_INSTRUCTION = `
Você é um assistente útil que responde de forma concisa e em português.
Quando precisar fazer cálculos, emita /use_tool calculate_math {"expression": "..."}.
`;

const app = express();
app.use(express.json());

app.post('/api/chat', createOllamaProxy({
  systemInstruction: SYSTEM_INSTRUCTION,
  model: 'fazendaavila2026/avila:latest',
  thinkingMap: { LOW: 256, MEDIUM: 1024, HIGH: 4096 },
}));

app.listen(3000);
```

## Uso (Vercel / Edge)

Para deploy serverless, exportar a função sem o wrapper Express:

```ts
// pages/api/chat.ts (Next.js / Vercel)
import { createOllamaProxy } from '../../lib/ollama-local-proxy';

const handler = createOllamaProxy({
  systemInstruction: '...',
  host: process.env.OLLAMA_HOST, // ⚠️ Vercel não tem Ollama; aponte para VPS público
});

export default async function (req: any, res: any) {
  if (req.method !== 'POST') return res.status(405).end();
  return handler(req, res);
}
```

## Pré-requisito

Ollama rodando localmente (ou em VPS acessível):

```bash
# Instalar: https://ollama.com/download
ollama serve                                      # inicia daemon na 11434
ollama pull fazendaavila2026/avila:latest         # baixa modelo
```

## Adaptation hints

- **Streaming**: o proxy atual usa `stream: false`. Para SSE/streaming, mudar para `stream: true`, ler `resp.body` chunk-a-chunk e usar `res.write()` com `Content-Type: text/event-stream`.
- **Multi-model**: aceitar `model` no body para permitir trocar de modelo per-request.
- **Conversation history**: o protocolo `/api/generate` é stateless. Para manter contexto, usar `/api/chat` da Ollama (suporta `messages: [{role, content}]`) e armazenar history server-side ou client-side.
- **Auth**: adicionar middleware com `Bearer token` antes do handler se exposto além do localhost.
- **Rate limit**: combinar com `express-rate-limit` para evitar abuso.
- **Logging de prompt/output**: cuidado com PII. Adicionar redactor antes de logar.

## Origin

Extraído de [`server/controllers/chatController.ts`](https://github.com/avila2026/MULT-CHAT-HUB/blob/main/server/controllers/chatController.ts) (~75 linhas). Refactor moderado: `SYSTEM_INSTRUCTION` agora é parâmetro injetável (antes hardcoded com referências ao MULT-CHAT-HUB), `thinkingMap` parametrizável, `timeoutMs` configurável.
