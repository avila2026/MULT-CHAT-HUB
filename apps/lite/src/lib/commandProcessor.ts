import { Dispatch, SetStateAction } from 'react';
import { AnalysisResult, Task } from '../types';
import { executeAnalysis, AnalysisType } from './analyticalEngine';
import { extractBalancedJson, newMsgId } from './utils';

export type AddMessageFn = (msg: { id: string; channel: string; sender: string; text: string; analysis?: AnalysisResult }) => void;

const CLIENT_ANALYSIS_TOOLS: Record<string, AnalysisType> = {
  analyze_descriptive: 'descritiva',
  analyze_predictive: 'preditiva',
  detect_anomalies: 'anomalias',
  optimize_linear: 'otimizacao',
  recommend_stack: 'software',
};

export interface CommandContext {
  channel: string;
  tasks: Task[];
  dataCache: Record<string, unknown>;
  addMessage: AddMessageFn;
  setTasks: Dispatch<SetStateAction<Task[]>>;
  setDataCache: Dispatch<SetStateAction<Record<string, unknown>>>;
  setReports: Dispatch<SetStateAction<string[]>>;
}

export async function processCommands(responseText: string, ctx: CommandContext): Promise<void> {
  const { channel, tasks, dataCache, addMessage, setTasks, setDataCache, setReports } = ctx;

  // /use_tool [nome] {json balanceado}
  const useToolStart = responseText.match(/\/use_tool\s+([a-zA-Z_0-9]+)\s+/);
  if (useToolStart && useToolStart.index !== undefined) {
    const toolName = useToolStart[1];
    const jsonStart = useToolStart.index + useToolStart[0].length;
    const extracted = extractBalancedJson(responseText, jsonStart);
    if (extracted) {
      try {
        const args = JSON.parse(extracted.json);

        if (toolName in CLIENT_ANALYSIS_TOOLS) {
          try {
            const analysis = executeAnalysis({
              data: args.data,
              analysisType: CLIENT_ANALYSIS_TOOLS[toolName],
              targetColumn: args.target_column,
              optimizationModel: args.optimizationModel,
            });
            addMessage({
              id: newMsgId(),
              channel,
              sender: 'Sistema',
              text: `Resultado de ${toolName}: análise ${analysis.analysis_type} sobre ${analysis.input_rows} linhas e ${analysis.input_columns.length} colunas.`,
              analysis,
            });
          } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : String(err);
            addMessage({ id: newMsgId(), channel, sender: 'Sistema', text: `Erro na análise ${toolName}: ${msg}` });
          }
          return;
        }

        try {
          const res = await fetch('/api/tools/execute', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ toolName, args }),
          });
          const data = await res.json();
          if (!res.ok) {
            addMessage({ id: newMsgId(), channel, sender: 'Sistema', text: `Erro de ferramenta ${toolName}: ${data.error || res.status}` });
          } else {
            const toolOutput = data.result || JSON.stringify(data);
            addMessage({ id: newMsgId(), channel, sender: 'Sistema', text: `Resultado da Ferramenta ${toolName}: ${toolOutput}` });
          }
        } catch {
          addMessage({
            id: newMsgId(), channel, sender: 'Sistema',
            text: `Ferramenta "${toolName}" exige o backend Express local. No deploy Vercel apenas as 5 tools de análise estão disponíveis. Rode "npm run dev:all" localmente para acesso completo.`,
          });
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        addMessage({ id: newMsgId(), channel, sender: 'Sistema', text: `Erro de ferramenta: ${msg}` });
      }
    }
  }

  if (responseText.includes('/criar_tarefa')) {
    const match = responseText.match(/\/criar_tarefa\s+"([^"]+)"\s+"([^"]+)"\s+"([^"]+)"/);
    if (match) {
      setTasks((prev) => [...prev, { id: (prev.length > 0 ? Math.max(...prev.map((t) => t.id)) : 0) + 1, title: match[1], description: match[2], deadline: match[3], status: 'pendente' }]);
      addMessage({ id: newMsgId(), channel, sender: 'Sistema', text: `Tarefa criada: ${match[1]}` });
    }
  }

  if (responseText.includes('/analisar_dados')) {
    const match = responseText.match(/\/analisar_dados\s+/);
    if (match && match.index !== undefined) {
      const start = match.index + match[0].length;
      const extracted = extractBalancedJson(responseText, start);
      if (extracted) {
        const after = responseText.slice(extracted.end).match(/\s+"([^"]+)"/);
        if (after) {
          try {
            const type = after[1];
            setDataCache((prev) => ({ ...prev, [type]: JSON.parse(extracted.json) }));
            addMessage({ id: newMsgId(), channel, sender: 'Sistema', text: `Dados analisados cache: [${type}]` });
          } catch { /* ignorar parse errors */ }
        }
      }
    }
  }

  if (responseText.includes('/concluir_tarefa')) {
    const match = responseText.match(/\/concluir_tarefa\s+"?(\d+)"?/);
    if (match) {
      const taskId = parseInt(match[1], 10);
      setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, status: 'concluído' } : t)));
      addMessage({ id: newMsgId(), channel, sender: 'Sistema', text: `Tarefa ${taskId} marcada como concluída.` });
    }
  }

  if (responseText.includes('/remover_tarefa')) {
    const match = responseText.match(/\/remover_tarefa\s+"?(\d+)"?/);
    if (match) {
      const taskId = parseInt(match[1], 10);
      setTasks((prev) => prev.filter((t) => t.id !== taskId));
      addMessage({ id: newMsgId(), channel, sender: 'Sistema', text: `Tarefa ${taskId} removida.` });
    }
  }

  if (responseText.includes('/limpar_dados')) {
    setDataCache({});
    addMessage({ id: newMsgId(), channel, sender: 'Sistema', text: 'Todos os dados em cache de análise foram limpos.' });
  }

  if (responseText.includes('/gerar_relatorio')) {
    const match = responseText.match(/\/gerar_relatorio\s+"([^"]+)"\s+"([^"]+)"/);
    if (match) {
      const [, content, format] = match;
      const stamp = new Date().toLocaleString('pt-BR');
      const header = `# Relatório (${format}) — ${stamp}`;
      const body = `${header}\n\n${content}\n\nTarefas ativas: ${tasks.length} | Datasets em cache: ${Object.keys(dataCache).length}`;
      setReports((prev) => [...prev, body]);
      addMessage({ id: newMsgId(), channel, sender: 'Sistema', text: `Relatório consolidado adicionado (formato ${format}).` });
    }
  }
}
