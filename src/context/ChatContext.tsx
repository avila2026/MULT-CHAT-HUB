import React, { createContext, useState, useEffect, useRef, ReactNode } from 'react';
import { Agent, Message, Channel, Task, AnalysisResult } from '../types';
import { executeAnalysis, AnalysisType } from '../lib/analyticalEngine';
import { useConfirm } from '../components/ui/ConfirmDialog';

const CLIENT_ANALYSIS_TOOLS: Record<string, AnalysisType> = {
  analyze_descriptive: 'descritiva',
  analyze_predictive: 'preditiva',
  detect_anomalies: 'anomalias',
  optimize_linear: 'otimizacao',
  recommend_stack: 'software'
};

interface ChatContextType {
  messages: Message[];
  channels: Channel[];
  currentChannel: string;
  agents: Agent[];
  tasks: Task[];
  dataCache: Record<string, any>;
  reports: string[];
  notifications: {id: number, text: string}[];
  activeAgentIndex: number | null;
  externalAgentURL: string;
  pairingCode: string;
  thinkingLevel: 'LOW' | 'HIGH';
  isLoading: boolean;

  setCurrentChannel: (ch: string) => void;
  addChannel: (ch: Channel) => void;
  addMessage: (msg: Message) => void;
  sendMessage: (text: string) => Promise<void>;
  registerAgent: (agent: Agent) => void;
  updateAgent: (index: number, agent: Agent) => void;
  setActiveAgentIndex: (index: number | null) => void;
  setThinkingLevel: (level: 'LOW' | 'HIGH') => void;
  setExternalAgentURL: (url: string) => void;
  setPairingCode: (code: string) => void;
  connectExternalAgent: () => Promise<void>;
  transcribeAudio: (callback: (text: string) => void) => void;
  uploadDataset: (file: File) => Promise<void>;
}

export const ChatContext = createContext<ChatContextType | undefined>(undefined);

const STORAGE_KEY = 'mch:state:v1';
const MAX_PERSIST_MESSAGES = 100;

const DEFAULT_MESSAGES: Message[] = [
  { id: 1, channel: 'Geral', sender: 'Sistema', text: 'Bem-vindo ao Hub de Colaboração Multi-IA. Por favor, apresente-se ou proponha uma tarefa.' }
];
const DEFAULT_CHANNELS: Channel[] = [{ name: 'Geral', members: [], isPrivate: false }];

const DEFAULT_AGENTS: Agent[] = [
  {
    name: 'Orquestrador Hub',
    specialty: 'Coordenação Ollama Local',
    description: 'IA central do sistema para tarefas gerais e orquestração via modelo local fazendaavila2026/avila.',
    permissions: ['admin', 'tools'],
    provider: 'Interno',
    status: 'Ativo',
    thinkingLevel: 'HIGH',
    tools: []
  },
  {
    name: 'NullClaw Gateway',
    specialty: 'Automação Local',
    description: 'Conecte seu motor NullClaw rodando localmente.',
    permissions: ['full_access'],
    provider: 'NullClaw Gateway',
    status: 'Offline',
    thinkingLevel: 'HIGH',
    tools: []
  }
];

interface PersistedState {
  messages: Message[];
  channels: Channel[];
  tasks: Task[];
  dataCache: Record<string, any>;
  reports: string[];
}

function loadPersisted(): Partial<PersistedState> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as Partial<PersistedState>;
  } catch {
    return {};
  }
}

function persistState(state: PersistedState): void {
  try {
    let toSave = state;
    let serialized = JSON.stringify(toSave);
    if (serialized.length > 4_000_000 && state.messages.length > MAX_PERSIST_MESSAGES) {
      toSave = { ...state, messages: state.messages.slice(-MAX_PERSIST_MESSAGES) };
      serialized = JSON.stringify(toSave);
    }
    localStorage.setItem(STORAGE_KEY, serialized);
  } catch {
    // localStorage cheio ou indisponível: ignorar silenciosamente
  }
}

// Parser CSV simples (sem aspas dentro de aspas, mas suporta aspas em campos).
function parseCsv(text: string): Record<string, number[]> {
  const lines = text.replace(/\r\n/g, '\n').split('\n').filter((l) => l.trim().length > 0);
  if (lines.length < 2) throw new Error('CSV vazio ou apenas com cabeçalho.');
  const headers = splitCsvLine(lines[0]);
  const cols: Record<string, number[]> = {};
  headers.forEach((h) => { cols[h] = []; });
  for (let i = 1; i < lines.length; i++) {
    const values = splitCsvLine(lines[i]);
    headers.forEach((h, idx) => {
      const raw = values[idx] ?? '';
      const num = Number(raw);
      cols[h].push(Number.isFinite(num) && raw !== '' ? num : NaN);
    });
  }
  // Filtra colunas que têm pelo menos 1 valor numérico
  const out: Record<string, number[]> = {};
  for (const [k, arr] of Object.entries(cols)) {
    if (arr.some((v) => Number.isFinite(v))) out[k] = arr;
  }
  if (Object.keys(out).length === 0) throw new Error('CSV sem colunas numéricas.');
  return out;
}

function splitCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') { inQuotes = !inQuotes; continue; }
    if (ch === ',' && !inQuotes) { out.push(cur.trim()); cur = ''; continue; }
    cur += ch;
  }
  out.push(cur.trim());
  return out;
}

// Encontra o JSON balanceado a partir do índice — retorna {json, end} ou null
function extractBalancedJson(text: string, start: number): { json: string; end: number } | null {
  if (text[start] !== '{') return null;
  let depth = 0;
  let inStr = false;
  let escape = false;
  for (let i = start; i < text.length; i++) {
    const c = text[i];
    if (escape) { escape = false; continue; }
    if (c === '\\') { escape = true; continue; }
    if (c === '"') { inStr = !inStr; continue; }
    if (inStr) continue;
    if (c === '{') depth++;
    else if (c === '}') {
      depth--;
      if (depth === 0) return { json: text.slice(start, i + 1), end: i + 1 };
    }
  }
  return null;
}

export const ChatProvider = ({ children }: { children: ReactNode }) => {
  const persisted = loadPersisted();
  const confirm = useConfirm();

  const [messages, setMessages] = useState<Message[]>(persisted.messages?.length ? persisted.messages : DEFAULT_MESSAGES);
  const [channels, setChannels] = useState<Channel[]>(persisted.channels?.length ? persisted.channels : DEFAULT_CHANNELS);
  const [currentChannel, setCurrentChannel] = useState('Geral');
  const [agents, setAgents] = useState<Agent[]>(DEFAULT_AGENTS);
  const [tasks, setTasks] = useState<Task[]>(persisted.tasks ?? []);
  const [dataCache, setDataCache] = useState<Record<string, any>>(persisted.dataCache ?? {});
  const [reports, setReports] = useState<string[]>(persisted.reports ?? []);
  const [notifications] = useState<{ id: number; text: string }[]>([]);
  const [activeAgentIndex, setActiveAgentIndex] = useState<number | null>(0);
  const [externalAgentURL, setExternalAgentURL] = useState('http://127.0.0.1:3000');
  const [pairingCode, setPairingCode] = useState('');
  const [thinkingLevel, setThinkingLevel] = useState<'LOW' | 'HIGH'>('HIGH');
  const [isLoading, setIsLoading] = useState(false);

  const messagesRef = useRef(messages);
  messagesRef.current = messages;

  useEffect(() => {
    persistState({ messages, channels, tasks, dataCache, reports });
  }, [messages, channels, tasks, dataCache, reports]);

  const addMessage = (msg: Message) => {
    setMessages((prev) => [...prev, msg]);
  };

  const processCommands = async (responseText: string) => {
    // /use_tool [nome] {json balanceado}
    const useToolStart = responseText.match(/\/use_tool\s+([a-zA-Z_0-9]+)\s+/);
    if (useToolStart && useToolStart.index !== undefined) {
      const toolName = useToolStart[1];
      const jsonStart = useToolStart.index + useToolStart[0].length;
      const extracted = extractBalancedJson(responseText, jsonStart);
      if (extracted) {
        try {
          const args = JSON.parse(extracted.json);

          // Tools de analise quantitativa rodam client-side (TypeScript puro,
          // sem dependencia de backend). Permite que o app funcione completo
          // no deploy Vercel mesmo sem Express + Ollama disponiveis.
          if (toolName in CLIENT_ANALYSIS_TOOLS) {
            try {
              const analysis = executeAnalysis({
                data: args.data,
                analysisType: CLIENT_ANALYSIS_TOOLS[toolName],
                targetColumn: args.target_column
              });
              addMessage({
                id: Date.now(),
                channel: currentChannel,
                sender: 'Sistema',
                text: `Resultado de ${toolName}: análise ${analysis.analysis_type} sobre ${analysis.input_rows} linhas e ${analysis.input_columns.length} colunas.`,
                analysis
              });
            } catch (err: any) {
              addMessage({ id: Date.now(), channel: currentChannel, sender: 'Sistema', text: `Erro na análise ${toolName}: ${err.message}` });
            }
            return;
          }

          // Demais tools (github, calculate_math, store/retrieve_memory,
          // get_current_time) dependem do backend Express.
          try {
            const res = await fetch('/api/tools/execute', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ toolName, args })
            });
            const data = await res.json();
            if (!res.ok) {
              addMessage({ id: Date.now(), channel: currentChannel, sender: 'Sistema', text: `Erro de ferramenta ${toolName}: ${data.error || res.status}` });
            } else {
              const toolOutput = data.result || JSON.stringify(data);
              addMessage({ id: Date.now(), channel: currentChannel, sender: 'Sistema', text: `Resultado da Ferramenta ${toolName}: ${toolOutput}` });
            }
          } catch {
            addMessage({
              id: Date.now(), channel: currentChannel, sender: 'Sistema',
              text: `Ferramenta "${toolName}" exige o backend Express local. No deploy Vercel apenas as 5 tools de análise (analyze_descriptive, analyze_predictive, detect_anomalies, optimize_linear, recommend_stack) estão disponíveis. Rode "npm run dev:all" localmente para acesso completo.`
            });
          }
        } catch (err: any) {
          addMessage({ id: Date.now(), channel: currentChannel, sender: 'Sistema', text: `Erro de ferramenta: ${err.message}` });
        }
      }
    }

    if (responseText.includes('/criar_tarefa')) {
      const match = responseText.match(/\/criar_tarefa\s+"([^"]+)"\s+"([^"]+)"\s+"([^"]+)"/);
      if (match) {
        setTasks((prev) => [...prev, { id: prev.length + 1, title: match[1], description: match[2], deadline: match[3], status: 'pendente' }]);
        addMessage({ id: Date.now(), channel: currentChannel, sender: 'Sistema', text: `Tarefa criada: ${match[1]}` });
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
              addMessage({ id: Date.now(), channel: currentChannel, sender: 'Sistema', text: `Dados analisados cache: [${type}]` });
            } catch {}
          }
        }
      }
    }

    if (responseText.includes('/concluir_tarefa')) {
      const match = responseText.match(/\/concluir_tarefa\s+"?(\d+)"?/);
      if (match) {
        const taskId = parseInt(match[1], 10);
        setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, status: 'concluído' } : t)));
        addMessage({ id: Date.now(), channel: currentChannel, sender: 'Sistema', text: `Tarefa ${taskId} marcada como concluída.` });
      }
    }

    if (responseText.includes('/remover_tarefa')) {
      const match = responseText.match(/\/remover_tarefa\s+"?(\d+)"?/);
      if (match) {
        const taskId = parseInt(match[1], 10);
        setTasks((prev) => prev.filter((t) => t.id !== taskId));
        addMessage({ id: Date.now(), channel: currentChannel, sender: 'Sistema', text: `Tarefa ${taskId} removida.` });
      }
    }

    if (responseText.includes('/limpar_dados')) {
      setDataCache({});
      addMessage({ id: Date.now(), channel: currentChannel, sender: 'Sistema', text: 'Todos os dados em cache de análise foram limpos.' });
    }

    if (responseText.includes('/gerar_relatorio')) {
      const match = responseText.match(/\/gerar_relatorio\s+"([^"]+)"\s+"([^"]+)"/);
      if (match) {
        const [, content, format] = match;
        const stamp = new Date().toLocaleString('pt-BR');
        const header = `# Relatório (${format}) — ${stamp}`;
        const body = `${header}\n\n${content}\n\nTarefas ativas: ${tasks.length} | Datasets em cache: ${Object.keys(dataCache).length}`;
        setReports((prev) => [...prev, body]);
        addMessage({ id: Date.now(), channel: currentChannel, sender: 'Sistema', text: `Relatório consolidado adicionado (formato ${format}).` });
      }
    }
  };

  const sendMessage = async (input: string) => {
    const channel = channels.find((c) => c.name === currentChannel);
    if (channel?.isPrivate && !channel.members.includes('User')) {
      addMessage({ id: Date.now(), channel: currentChannel, sender: 'Sistema', text: 'Você não tem permissão neste canal privado.' });
      return;
    }

    if (input.startsWith('/')) {
      if (input === '/clear') {
        const ok = await confirm({
          title: 'Limpar canal?',
          message: `Todas as mensagens do canal "${currentChannel}" serão apagadas.`,
          confirmLabel: 'Limpar',
          variant: 'danger',
        });
        if (ok) setMessages((prev) => prev.filter((m) => m.channel !== currentChannel));
      } else if (input === '/reset') {
        const ok = await confirm({
          title: 'Resetar tudo?',
          message: 'Mensagens, tarefas, datasets e relatórios serão apagados permanentemente.',
          confirmLabel: 'Resetar',
          variant: 'danger',
        });
        if (ok) {
          setMessages(DEFAULT_MESSAGES);
          setTasks([]);
          setDataCache({});
          setReports([]);
          localStorage.removeItem(STORAGE_KEY);
        }
      } else {
        addMessage({ id: Date.now(), channel: currentChannel, sender: 'Sistema', text: 'Comandos locais: /clear, /reset' });
      }
      return;
    }

    addMessage({ id: Date.now(), channel: currentChannel, sender: 'User', text: input });
    setIsLoading(true);

    try {
      let responseText = '';
      let senderName = 'Orquestrador Hub';

      if (activeAgentIndex !== null && agents[activeAgentIndex].provider === 'NullClaw Gateway') {
        senderName = agents[activeAgentIndex].name;
        const response = await fetch(`${externalAgentURL}/webhook`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${pairingCode}`
          },
          body: JSON.stringify({ message: input })
        });
        if (response.ok) {
          const data = await response.json();
          responseText = data.reply || data.response || JSON.stringify(data);
        } else {
          responseText = `Erro no Gateway (${response.status}).`;
        }
      } else {
        senderName = activeAgentIndex !== null ? agents[activeAgentIndex].name : 'Orquestrador Hub';
        const response = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ input, thinking: thinkingLevel })
        });
        if (response.ok) {
          const data = await response.json();
          responseText = data.text;
        } else {
          responseText = 'Erro no servidor backend.';
        }
      }

      addMessage({ id: Date.now() + 1, channel: currentChannel, sender: senderName, text: responseText });
      await processCommands(responseText);
    } catch (e) {
      addMessage({ id: Date.now() + 2, channel: currentChannel, sender: 'Sistema', text: 'Falha de comunicação.' });
    } finally {
      setIsLoading(false);
    }
  };

  const uploadDataset = async (file: File) => {
    try {
      const text = await file.text();
      let parsed: Record<string, number[]>;
      const lower = file.name.toLowerCase();
      if (lower.endsWith('.json')) {
        const raw = JSON.parse(text);
        if (Array.isArray(raw)) {
          // converte array de objetos para colunar
          if (raw.length === 0) throw new Error('JSON vazio.');
          const cols: Record<string, number[]> = {};
          for (const key of Object.keys(raw[0])) cols[key] = [];
          for (const row of raw) {
            for (const key of Object.keys(cols)) {
              const v = (row as any)[key];
              const num = Number(v);
              cols[key].push(Number.isFinite(num) ? num : NaN);
            }
          }
          parsed = cols;
        } else if (raw && typeof raw === 'object') {
          parsed = raw as Record<string, number[]>;
        } else {
          throw new Error('JSON precisa ser objeto colunar ou array de objetos.');
        }
      } else if (lower.endsWith('.csv')) {
        parsed = parseCsv(text);
      } else {
        throw new Error('Formato não suportado. Envie .csv ou .json');
      }

      setDataCache((prev) => ({ ...prev, [file.name]: parsed }));
      const cols = Object.keys(parsed);
      const rows = parsed[cols[0]]?.length ?? 0;
      addMessage({
        id: Date.now(),
        channel: currentChannel,
        sender: 'Sistema',
        text: `Dataset "${file.name}" carregado: ${rows} linhas, ${cols.length} colunas (${cols.join(', ')}).\nUse: /use_tool analyze_descriptive {"data": <conteúdo de dataCache["${file.name}"]>}`
      });
    } catch (err: any) {
      addMessage({ id: Date.now(), channel: currentChannel, sender: 'Sistema', text: `Erro ao carregar arquivo: ${err.message}` });
    }
  };

  const connectExternalAgent = async () => {
    if (externalAgentURL.trim() && pairingCode.trim()) {
      try {
        const response = await fetch(`${externalAgentURL}/health`);
        if (response.ok) {
          setAgents((prev) => [
            ...prev,
            {
              name: 'NullClaw Externo',
              specialty: 'Agente Conectado',
              description: `Agente rodando em ${externalAgentURL}`,
              permissions: ['full_access'],
              provider: 'NullClaw Gateway',
              status: 'Online',
              thinkingLevel: 'HIGH',
              tools: []
            }
          ]);
          addMessage({ id: Date.now(), channel: currentChannel, sender: 'Sistema', text: `Conectado com sucesso ao agente em ${externalAgentURL}!` });
          setPairingCode('');
        } else {
          addMessage({ id: Date.now(), channel: currentChannel, sender: 'Sistema', text: `Erro: Gateway ${externalAgentURL} retornou erro.` });
        }
      } catch {
        addMessage({ id: Date.now(), channel: currentChannel, sender: 'Sistema', text: 'Erro de conexão: Não alcançável.' });
      }
    }
  };

  const transcribeAudio = (callback: (t: string) => void) => {
    if (!('webkitSpeechRecognition' in window)) {
      addMessage({ id: Date.now(), channel: currentChannel, sender: 'Sistema', text: 'Reconhecimento de voz não suportado.' });
      return;
    }
    const recognition = new (window as any).webkitSpeechRecognition();
    recognition.lang = 'pt-BR';
    recognition.onresult = (event: any) => {
      callback(event.results[0][0].transcript);
    };
    recognition.start();
    addMessage({ id: Date.now(), channel: currentChannel, sender: 'Sistema', text: 'Ouvindo...' });
  };

  return (
    <ChatContext.Provider value={{
      messages, channels, currentChannel, agents, tasks, dataCache, reports, notifications, activeAgentIndex, externalAgentURL, pairingCode, thinkingLevel, isLoading,
      setCurrentChannel, addChannel: (ch) => setChannels([...channels, ch]), addMessage, sendMessage,
      registerAgent: (ag) => setAgents([...agents, ag]),
      updateAgent: (i, ag) => { const newAg = [...agents]; newAg[i] = ag; setAgents(newAg); },
      setActiveAgentIndex, setThinkingLevel, setExternalAgentURL, setPairingCode, connectExternalAgent, transcribeAudio,
      uploadDataset
    }}>
      {children}
    </ChatContext.Provider>
  );
};
