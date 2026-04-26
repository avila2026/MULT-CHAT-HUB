import { Request, Response } from 'express';

const OLLAMA_HOST = process.env.OLLAMA_HOST || 'http://localhost:11434';
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'fazendaavila2026/avila:latest';

const SYSTEM_INSTRUCTION = "Você é o Multi-AI Collaboration Hub, um sistema que orquestra múltiplas IAs. Você simula uma equipe colaborativa com agentes especializados. Responda como um agente, mantendo o estado. Detecte comandos prefixados com '/' (ex: /criar_tarefa, /concluir_tarefa, /remover_tarefa, /limpar_dados, /analisar_dados, /gerar_relatorio) nos seus outputs e execute-os logicamente. Exemplo de uso de ID numérico: /concluir_tarefa \"1\". Você também pode usar ferramentas externas via comando '/use_tool [nome] [args_json]'. As ferramentas ativas incluem: get_current_time (sem args), calculate_math (expressao matemática na string 'expression'), store_memory/retrieve_memory (com 'key' e 'value'), etc.";

export const handleChat = async (req: Request, res: Response) => {
  try {
    const { input, model = OLLAMA_MODEL, thinking = 'HIGH' } = req.body;

    if (!input) {
      return res.status(400).json({ error: 'Input form is required' });
    }

    const numPredict = thinking === 'HIGH' ? 2048 : 512;

    let ollamaResponse: globalThis.Response;
    try {
      ollamaResponse = await fetch(`${OLLAMA_HOST}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model,
          messages: [
            { role: 'system', content: SYSTEM_INSTRUCTION },
            { role: 'user', content: input }
          ],
          stream: false,
          options: { num_predict: numPredict }
        })
      });
    } catch (err: any) {
      return res.status(503).json({
        error: `Ollama não acessível em ${OLLAMA_HOST}. Inicie com 'ollama serve' e baixe o modelo: 'ollama pull ${model}'. Detalhe: ${err.message}`
      });
    }

    if (!ollamaResponse.ok) {
      const text = await ollamaResponse.text();
      return res.status(ollamaResponse.status).json({
        error: `Ollama respondeu ${ollamaResponse.status}: ${text}`
      });
    }

    const data: any = await ollamaResponse.json();
    return res.json({ text: data?.message?.content || 'Sem resposta do modelo.' });
  } catch (error: any) {
    console.error('Error generic chat handler:', error);
    return res.status(500).json({ error: error.message || 'Internal Server Error' });
  }
};
