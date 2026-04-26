import { Request, Response } from 'express';
import { GoogleGenAI } from '@google/genai';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
const OLLAMA_HOST = process.env.OLLAMA_HOST || 'http://localhost:11434';
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'llama3.1:8b';

const SYSTEM_INSTRUCTION = "Você é o Multi-AI Collaboration Hub, um sistema que orquestra múltiplas IAs. Você simula uma equipe colaborativa com agentes especializados. Responda como um agente, mantendo o estado. Detecte comandos prefixados com '/' (ex: /criar_tarefa, /concluir_tarefa, /remover_tarefa, /limpar_dados, /analisar_dados, /gerar_relatorio) nos seus outputs e execute-os logicamente. Exemplo de uso de ID numérico: /concluir_tarefa \"1\". Você também pode usar ferramentas externas via comando '/use_tool [nome] [args_json]'. As ferramentas ativas incluem: get_current_time (sem args), calculate_math (expressao matemática na string 'expression'), store_memory/retrieve_memory (com 'key' e 'value'), etc.";

const gemini = GEMINI_API_KEY ? new GoogleGenAI({ apiKey: GEMINI_API_KEY }) : null;

async function chatViaGemini(input: string, thinking: 'HIGH' | 'LOW', model: string): Promise<string> {
  const response = await gemini!.models.generateContent({
    model,
    contents: input,
    config: {
      systemInstruction: SYSTEM_INSTRUCTION,
      thinkingConfig: { thinkingBudget: thinking === 'HIGH' ? 2048 : 512 }
    }
  });
  return response.text || 'Sem resposta do modelo.';
}

async function chatViaOllama(input: string, thinking: 'HIGH' | 'LOW', model: string): Promise<string> {
  const numPredict = thinking === 'HIGH' ? 2048 : 512;
  const r = await fetch(`${OLLAMA_HOST}/api/chat`, {
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
  if (!r.ok) {
    const text = await r.text();
    throw new Error(`Ollama respondeu ${r.status}: ${text}`);
  }
  const data: any = await r.json();
  return data?.message?.content || 'Sem resposta do modelo.';
}

export const handleChat = async (req: Request, res: Response) => {
  try {
    const { input, model, thinking = 'HIGH' } = req.body;

    if (!input) {
      return res.status(400).json({ error: 'Input form is required' });
    }

    if (gemini) {
      try {
        const text = await chatViaGemini(input, thinking, model || GEMINI_MODEL);
        return res.json({ text, provider: 'gemini' });
      } catch (err: any) {
        console.error('[Gemini falhou, tentando Ollama como fallback]', err.message);
      }
    }

    try {
      const text = await chatViaOllama(input, thinking, model || OLLAMA_MODEL);
      return res.json({ text, provider: 'ollama' });
    } catch (err: any) {
      return res.status(503).json({
        error: `Nenhum provedor de LLM disponível. ${gemini ? 'Gemini falhou e ' : 'GEMINI_API_KEY não configurada. '}Ollama não acessível em ${OLLAMA_HOST} (${err.message}). Configure GEMINI_API_KEY no .env.local ou rode 'ollama serve' + 'ollama pull ${OLLAMA_MODEL}'.`
      });
    }
  } catch (error: any) {
    console.error('Error generic chat handler:', error);
    return res.status(500).json({ error: error.message || 'Internal Server Error' });
  }
};
