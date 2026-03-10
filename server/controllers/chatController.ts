import { Request, Response } from 'express';
import { GoogleGenAI, ThinkingLevel } from '@google/genai';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });

export const handleChat = async (req: Request, res: Response) => {
  try {
    const { input, model = 'gemini-3.1-pro-preview', thinking = 'HIGH' } = req.body;
    
    if (!input) {
      return res.status(400).json({ error: 'Input form is required' });
    }

    const response = await ai.models.generateContent({
      model: model,
      contents: input,
      config: {
        thinkingConfig: {
          thinkingLevel: thinking === 'HIGH' ? ThinkingLevel.HIGH : ThinkingLevel.LOW
        },
        systemInstruction: "Você é o Multi-AI Collaboration Hub, um sistema que orquestra múltiplas IAs. Você simula uma equipe colaborativa com agentes especializados. Responda como um agente, mantendo o estado. Detecte comandos prefixados com '/' (ex: /criar_tarefa, /analisar_dados, /gerar_relatorio) nos seus outputs e execute-os logicamente. Você também pode usar ferramentas externas via comando '/use_tool [nome] [args_json]'. Exemplos: /use_tool github_list_repos '{\"username\": \"usuario\"}', /use_tool github_create_issue '{\"owner\": \"usuario\", \"repo\": \"projeto\", \"title\": \"Bug\", \"body\": \"Descricao\"}'."
      }
    });

    return res.json({ text: response.text || 'Sem resposta das APIs.' });
  } catch (error: any) {
    console.error('Error generic chat handler:', error);
    return res.status(500).json({ error: error.message || 'Internal Server Error' });
  }
};
