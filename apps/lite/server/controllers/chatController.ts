import { Request, Response } from 'express';

const OLLAMA_HOST = process.env.OLLAMA_HOST || 'http://localhost:11434';
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'fazendaavila2026/avila:latest';

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

export const handleChat = async (req: Request, res: Response) => {
  try {
    const { input, model = OLLAMA_MODEL, thinking = 'HIGH', history = [] } = req.body;

    if (!input) {
      return res.status(400).json({ error: 'Input form is required' });
    }

    const numPredict = thinking === 'HIGH' ? 2048 : 512;

    // Monta o histórico de conversa — máximo 10 turnos para não estourar contexto
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

    let ollamaResponse: globalThis.Response;
    try {
      ollamaResponse = await fetch(`${OLLAMA_HOST}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model, messages, stream: false, options: { num_predict: numPredict } }),
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      return res.status(503).json({
        error: `Ollama não acessível em ${OLLAMA_HOST}. Inicie com 'ollama serve' e baixe o modelo: 'ollama pull ${model}'. Detalhe: ${msg}`,
      });
    }

    if (!ollamaResponse.ok) {
      const text = await ollamaResponse.text();
      return res.status(ollamaResponse.status).json({
        error: `Ollama respondeu ${ollamaResponse.status}: ${text}`,
      });
    }

    const data = await ollamaResponse.json() as { message?: { content?: string } };
    return res.json({ text: data?.message?.content || 'Sem resposta do modelo.' });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Internal Server Error';
    console.error('Error generic chat handler:', error);
    return res.status(500).json({ error: msg });
  }
};
