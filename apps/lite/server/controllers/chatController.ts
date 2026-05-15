import { Request, Response } from 'express';
import { createAdapter, DEFAULT_MODELS, ProviderName } from '../../src/lib/providerAdapters.js';

const OLLAMA_HOST = process.env.OLLAMA_HOST || 'http://localhost:11434';
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'fazendaavila2026/avila:latest';

const OLLAMA_TIMEOUT_MS = 90_000;
const CLOUD_TIMEOUT_MS = 60_000;

const ENV_KEYS: Record<ProviderName, string> = {
  ollama: '',
  openai: process.env.OPENAI_API_KEY ?? '',
  anthropic: process.env.ANTHROPIC_API_KEY ?? '',
  gemini: process.env.GEMINI_API_KEY ?? '',
  openrouter: process.env.OPENROUTER_API_KEY ?? '',
};

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
    const apiKey = (typeof reqApiKey === 'string' && reqApiKey.trim()) ? reqApiKey.trim() : ENV_KEYS[provider];
    const baseUrl = provider === 'ollama' ? OLLAMA_HOST : undefined;
    const timeoutMs = provider === 'ollama' ? OLLAMA_TIMEOUT_MS : CLOUD_TIMEOUT_MS;
    const maxTokens = thinking === 'HIGH' ? 2048 : 512;

    const historyMessages: HistoryMessage[] = (Array.isArray(history) ? history : [])
      .slice(-10)
      .map((m: { role: string; content: string }) => ({
        role: m.role === 'user' ? 'user' : 'assistant',
        content: String(m.content),
      }));

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
