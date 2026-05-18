import { Request, Response } from 'express';
import { createAdapter, DEFAULT_MODELS, ProviderName } from '../../src/lib/providerAdapters.js';

const OLLAMA_HOST = process.env.OLLAMA_HOST || 'http://localhost:11434';
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'fazendaavila2026/avila:latest';

const OLLAMA_TIMEOUT_MS = 90_000;
const CLOUD_TIMEOUT_MS = 60_000;

// Lazy lookup: dotenv.config() runs after this module is imported, so reading
// process.env at module load returns undefined. Resolve per-request instead.
function envKeyFor(provider: ProviderName): string {
  switch (provider) {
    case 'openai':     return process.env.OPENAI_API_KEY ?? '';
    case 'anthropic':  return process.env.ANTHROPIC_API_KEY ?? '';
    case 'gemini':     return process.env.GEMINI_API_KEY ?? '';
    case 'openrouter': return process.env.OPENROUTER_API_KEY ?? '';
    case 'ollama':     return '';
  }
}

const SYSTEM_INSTRUCTION = [
  "Você é o Multi-AI Collaboration Hub, um sistema que orquestra múltiplas IAs em uma equipe colaborativa com agentes especializados.",
  "Detecte comandos prefixados com '/' nos seus outputs e execute-os logicamente:",
  "  /criar_tarefa \"Título\" \"Descrição\" \"Prazo\" — cria task.",
  "  /concluir_tarefa \"ID\" — marca como concluída.",
  "  /remover_tarefa \"ID\" — remove task.",
  "  /analisar_dados {json} \"Categoria\" — guarda em cache de dados.",
  "  /limpar_dados — esvazia o cache.",
  "  /gerar_relatorio \"Conteúdo\" \"Formato\" — adiciona relatório consolidado.",
  "  /use_tool [nome] [args_json] — invoca tool no backend.",
  "",
  "Tools disponíveis no backend:",
  "  get_current_time {}",
  "  calculate_math {\"expression\":\"...\"}",
  "  store_memory {\"key\":\"...\",\"value\":\"...\"} / retrieve_memory {\"key\":\"...\"}",
  "  github_list_repos {\"username\":\"...\"} / github_create_issue {\"owner\":\"...\",\"repo\":\"...\",\"title\":\"...\",\"body\":\"...\"}",
  "  webhook_call {\"url\":\"...\",\"payload\":{...},\"headers\":{...}} — envia POST para webhook externo.",
  "  analyze_descriptive {\"data\":<obj|array>} — estatísticas (mean, std, quartis) por coluna.",
  "  analyze_predictive {\"data\":<obj|array>,\"target_column\":\"...\"} — regressão linear; target_column OBRIGATÓRIA.",
  "  detect_anomalies {\"data\":<obj|array>} — z-score multivariado, marca outliers.",
  "  optimize_linear {} — minimização linear (exemplo padrão).",
  "  recommend_stack {} — sugere stack tecnológica.",
  "",
  "Mapa de intenções → análise quantitativa (use a tool correspondente):",
  "  prever | estimar | regressão | vendas futuras → analyze_predictive (extraia target_column do contexto).",
  "  fraude | outlier | atípico | suspeito | anomalia → detect_anomalies.",
  "  resumo | médias | desvio padrão | descrever dados → analyze_descriptive.",
  "  minimizar custos | otimizar recursos | programação linear → optimize_linear.",
  "  qual stack | qual banco de dados | que linguagem usar → recommend_stack.",
  "",
  "Quando os dados foram pré-carregados via upload (mensagem de Sistema mencionando 'dataCache'), referencie-os pelo nome do arquivo.",
  "Sempre que o usuário pedir uma análise sobre dados que estão no cache, emita o /use_tool correspondente em uma única linha sem quebra dentro do JSON."
].join('\n');

interface HistoryMessage {
  role: 'user' | 'assistant';
  content: string;
}

function slog(level: 'INFO' | 'WARN' | 'ERROR', reqId: string, msg: string, extra?: Record<string, unknown>) {
  const entry = { ts: new Date().toISOString(), level, reqId, msg, ...extra };
  if (level === 'ERROR') console.error(JSON.stringify(entry));
  else console.log(JSON.stringify(entry));
}

function resolveProvider(raw: unknown): ProviderName {
  const valid: ProviderName[] = ['ollama', 'openai', 'anthropic', 'gemini', 'openrouter'];
  return valid.includes(raw as ProviderName) ? (raw as ProviderName) : 'ollama';
}

export const handleChat = async (req: Request, res: Response) => {
  const reqId = (req as Request & { id?: string }).id ?? crypto.randomUUID().slice(0, 8);
  const t0 = Date.now();

  try {
    const {
      input,
      thinking = 'HIGH',
      history = [],
      provider: rawProvider,
      model: modelOverride,
      apiKey: reqApiKey,
    } = req.body;

    if (!input) {
      return res.status(400).json({ error: 'Input form is required' });
    }

    const provider = resolveProvider(rawProvider);
    const defaultModel = provider === 'ollama' ? OLLAMA_MODEL : DEFAULT_MODELS[provider];
    const model = (typeof modelOverride === 'string' && modelOverride.trim()) ? modelOverride.trim() : defaultModel;
    const apiKey = (typeof reqApiKey === 'string' && reqApiKey.trim()) ? reqApiKey.trim() : envKeyFor(provider);
    const baseUrl = provider === 'ollama' ? OLLAMA_HOST : undefined;
    const timeoutMs = provider === 'ollama' ? OLLAMA_TIMEOUT_MS : CLOUD_TIMEOUT_MS;
    const maxTokens = thinking === 'HIGH' ? 2048 : 512;

    const rawHistory = (Array.isArray(history) ? history : [])
      .slice(-10)
      .map((m: { role: string; content: string }) => ({
        role: (m.role === 'user' ? 'user' : 'assistant') as 'user' | 'assistant',
        content: String(m.content),
      }));
    // Anthropic/Gemini require first non-system message to be 'user'
    const firstUser = rawHistory.findIndex((m) => m.role === 'user');
    const historyMessages: HistoryMessage[] = firstUser >= 0 ? rawHistory.slice(firstUser) : [];

    const messages = [
      { role: 'system' as const, content: SYSTEM_INSTRUCTION },
      ...historyMessages,
      { role: 'user' as const, content: input },
    ];

    slog('INFO', reqId, 'chat_request', { provider, model, thinking, historyTurns: historyMessages.length });

    const controller = new AbortController();
    const timeoutHandle = setTimeout(() => controller.abort(), timeoutMs);

    let responseText: string;
    try {
      const adapter = createAdapter(provider);
      responseText = await adapter.chat({ messages, model, maxTokens, apiKey, baseUrl, signal: controller.signal });
    } catch (err: unknown) {
      clearTimeout(timeoutHandle);
      const isTimeout = err instanceof Error && err.name === 'AbortError';
      let errMsg: string;
      if (isTimeout) {
        errMsg = provider === 'ollama'
          ? `Ollama não respondeu em ${timeoutMs / 1000}s. Verifique se o modelo está carregado: 'ollama run ${model}'.`
          : `${provider} não respondeu em ${timeoutMs / 1000}s. Verifique sua conexão.`;
      } else {
        const detail = err instanceof Error ? err.message : String(err);
        errMsg = provider === 'ollama'
          ? `Ollama não acessível em ${OLLAMA_HOST}. Inicie com 'ollama serve' e baixe: 'ollama pull ${model}'. Detalhe: ${detail}`
          : `Erro ao chamar ${provider}: ${detail}`;
      }
      slog('WARN', reqId, 'adapter_error', { provider, isTimeout, durationMs: Date.now() - t0 });
      return res.status(503).json({ error: errMsg });
    } finally {
      clearTimeout(timeoutHandle);
    }

    slog('INFO', reqId, 'chat_ok', { provider, model, durationMs: Date.now() - t0, chars: responseText.length });
    return res.json({ text: responseText });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Internal Server Error';
    slog('ERROR', reqId, 'chat_unhandled_error', { error: msg, durationMs: Date.now() - t0 });
    return res.status(500).json({ error: msg });
  }
};

// ── SSE streaming handler ─────────────────────────────────────────────────────
// Endpoint: POST /api/chat/stream
// Fluxo: frontend → Express SSE → Ollama NDJSON stream → cliente token a token
// Eventos SSE emitidos:
//   data: {"token":"..."}\n\n   — fragmento de texto
//   data: {"done":true}\n\n     — fim do stream (texto completo em .text)
//   data: {"error":"..."}\n\n   — erro
export const handleChatStream = async (req: Request, res: Response) => {
  const reqId = (req as Request & { id?: string }).id ?? crypto.randomUUID().slice(0, 8);
  const t0 = Date.now();

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders();

  const send = (payload: object) => res.write(`data: ${JSON.stringify(payload)}\n\n`);

  try {
    const { input, model = OLLAMA_MODEL, thinking = 'HIGH', history = [] } = req.body;

    if (!input) {
      send({ error: 'Input is required' });
      return res.end();
    }

    const numPredict = thinking === 'HIGH' ? 2048 : 512;

    const historyMessages: HistoryMessage[] = (Array.isArray(history) ? history : [])
      .slice(-10)
      .map((m: { role: string; content: string }) => ({
        role: m.role === 'user' ? 'user' : 'assistant',
        content: String(m.content),
      }));

    const messages = [
      { role: 'system', content: SYSTEM_INSTRUCTION },
      ...historyMessages,
      { role: 'user', content: input },
    ];

    slog('INFO', reqId, 'ollama_stream_request', { model, thinking, historyTurns: historyMessages.length });

    const controller = new AbortController();
    const timeoutHandle = setTimeout(() => controller.abort(), OLLAMA_TIMEOUT_MS);
    let clientDisconnected = false;
    req.on('close', () => {
      clientDisconnected = true;
      controller.abort();
      clearTimeout(timeoutHandle);
    });

    let ollamaResponse: globalThis.Response;
    try {
      ollamaResponse = await fetch(`${OLLAMA_HOST}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model, messages, stream: true, options: { num_predict: numPredict } }),
        signal: controller.signal,
      });
    } catch (err: unknown) {
      clearTimeout(timeoutHandle);
      const isTimeout = err instanceof Error && err.name === 'AbortError' && !clientDisconnected;
      const errMsg = isTimeout
        ? `Ollama não respondeu em ${OLLAMA_TIMEOUT_MS / 1000}s. Verifique se o modelo está carregado.`
        : `Ollama não acessível em ${OLLAMA_HOST}. Inicie com 'ollama serve'.`;
      slog('WARN', reqId, 'ollama_stream_unreachable', { isTimeout, durationMs: Date.now() - t0 });
      send({ error: errMsg });
      return res.end();
    }

    if (!ollamaResponse.ok) {
      clearTimeout(timeoutHandle);
      const text = await ollamaResponse.text();
      send({ error: `Ollama respondeu ${ollamaResponse.status}: ${text}` });
      return res.end();
    }

    if (!ollamaResponse.body) {
      clearTimeout(timeoutHandle);
      send({ error: 'Sem corpo de resposta do Ollama.' });
      return res.end();
    }

    // Lê NDJSON do Ollama e repassa como eventos SSE
    const decoder = new TextDecoder();
    let accumulated = '';
    let tokenCount = 0;
    let ndjsonBuffer = '';

    try {
      for await (const chunk of ollamaResponse.body as unknown as AsyncIterable<Uint8Array>) {
        ndjsonBuffer += decoder.decode(chunk, { stream: true });
        const lines = ndjsonBuffer.split('\n');
        ndjsonBuffer = lines.pop() ?? '';
        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed) continue;
          try {
            const parsed = JSON.parse(trimmed) as { message?: { content?: string }; done?: boolean };
            const token = parsed.message?.content ?? '';
            if (token) {
              accumulated += token;
              tokenCount++;
              send({ token });
            }
            if (parsed.done) {
              clearTimeout(timeoutHandle);
              send({ done: true, text: accumulated });
              slog('INFO', reqId, 'ollama_stream_ok', { durationMs: Date.now() - t0, tokens: tokenCount, chars: accumulated.length });
              return res.end();
            }
          } catch { /* linha NDJSON malformada — ignorar */ }
        }
      }

      // Flush decoder residual bytes
      const remaining = decoder.decode();
      if (remaining) {
        ndjsonBuffer += remaining;
        const lines = ndjsonBuffer.split('\n');
        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed) continue;
          try {
            const parsed = JSON.parse(trimmed) as { message?: { content?: string }; done?: boolean };
            const token = parsed.message?.content ?? '';
            if (token) {
              accumulated += token;
              tokenCount++;
              send({ token });
            }
            if (parsed.done) {
              clearTimeout(timeoutHandle);
              send({ done: true, text: accumulated });
              slog('INFO', reqId, 'ollama_stream_ok', { durationMs: Date.now() - t0, tokens: tokenCount, chars: accumulated.length });
              return res.end();
            }
          } catch { /* linha NDJSON malformada — ignorar */ }
        }
      }
    } catch (streamErr: unknown) {
      const isAbort = streamErr instanceof Error && streamErr.name === 'AbortError';
      if (isAbort && !clientDisconnected) {
        slog('WARN', reqId, 'ollama_stream_timeout', { durationMs: Date.now() - t0 });
        send({ error: 'Tempo limite excedido (90s). O modelo demorou demais para responder. Tente novamente.' });
        return res.end();
      }
      if (isAbort && clientDisconnected) {
        slog('INFO', reqId, 'ollama_stream_client_disconnect', { durationMs: Date.now() - t0 });
        return res.end();
      }
      slog('WARN', reqId, 'ollama_stream_error', { error: String(streamErr) });
      send({ error: `Erro no stream do Ollama: ${String(streamErr)}` });
      return res.end();
    } finally {
      clearTimeout(timeoutHandle);
    }

    // Fallback se stream terminar sem evento done
    send({ done: true, text: accumulated || 'Sem resposta do modelo.' });
    res.end();

  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Internal Server Error';
    slog('ERROR', reqId, 'stream_unhandled_error', { error: msg, durationMs: Date.now() - t0 });
    send({ error: msg });
    res.end();
  }
};
