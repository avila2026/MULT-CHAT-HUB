import { Request, Response } from 'express';

const OLLAMA_HOST = process.env.OLLAMA_HOST || 'http://localhost:11434';
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'fazendaavila2026/avila:latest';
const OLLAMA_TIMEOUT_MS = 90_000;

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

export const handleChat = async (req: Request, res: Response) => {
  const reqId = (req as Request & { id?: string }).id ?? crypto.randomUUID().slice(0, 8);
  const t0 = Date.now();

  try {
    const { input, model = OLLAMA_MODEL, thinking = 'HIGH', history = [] } = req.body;

    if (!input) {
      return res.status(400).json({ error: 'Input form is required' });
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

    slog('INFO', reqId, 'ollama_request', { model, thinking, historyTurns: historyMessages.length });

    const controller = new AbortController();
    const timeoutHandle = setTimeout(() => controller.abort(), OLLAMA_TIMEOUT_MS);

    let ollamaResponse: globalThis.Response;
    try {
      ollamaResponse = await fetch(`${OLLAMA_HOST}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model, messages, stream: false, options: { num_predict: numPredict } }),
        signal: controller.signal,
      });
    } catch (err: unknown) {
      clearTimeout(timeoutHandle);
      const isTimeout = err instanceof Error && err.name === 'AbortError';
      const errMsg = isTimeout
        ? `Ollama não respondeu em ${OLLAMA_TIMEOUT_MS / 1000}s. Verifique se o modelo está carregado: 'ollama run ${model}'.`
        : `Ollama não acessível em ${OLLAMA_HOST}. Inicie com 'ollama serve' e baixe: 'ollama pull ${model}'. Detalhe: ${err instanceof Error ? err.message : String(err)}`;
      slog('WARN', reqId, 'ollama_unreachable', { isTimeout, durationMs: Date.now() - t0 });
      return res.status(503).json({ error: errMsg });
    } finally {
      clearTimeout(timeoutHandle);
    }

    if (!ollamaResponse.ok) {
      const text = await ollamaResponse.text();
      slog('WARN', reqId, 'ollama_http_error', { status: ollamaResponse.status, durationMs: Date.now() - t0 });
      return res.status(ollamaResponse.status).json({
        error: `Ollama respondeu ${ollamaResponse.status}: ${text}`,
      });
    }

    const data = await ollamaResponse.json() as { message?: { content?: string } };
    const responseText = data?.message?.content || 'Sem resposta do modelo.';
    slog('INFO', reqId, 'ollama_ok', { durationMs: Date.now() - t0, chars: responseText.length });

    return res.json({ text: responseText });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Internal Server Error';
    slog('ERROR', reqId, 'chat_unhandled_error', { error: msg, durationMs: Date.now() - t0 });
    return res.status(500).json({ error: msg });
  }
};
