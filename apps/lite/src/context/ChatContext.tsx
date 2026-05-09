import React, { createContext, useState, useEffect, useRef, useCallback, ReactNode } from 'react';
import { Agent, Message, Channel, Task, AnalysisResult } from '../types';
import { useConfirm } from '../components/ui/ConfirmDialog';
import { parseCsv, newMsgId } from '../lib/utils';
import { processCommands } from '../lib/commandProcessor';

interface ChatContextType {
  messages: Message[];
  channels: Channel[];
  currentChannel: string;
  agents: Agent[];
  tasks: Task[];
  dataCache: Record<string, unknown>;
  reports: string[];
  notifications: { id: string; text: string }[];
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
  { id: '1', channel: 'Geral', sender: 'Sistema', text: 'Bem-vindo ao Hub de Colaboração Multi-IA. Por favor, apresente-se ou proponha uma tarefa.' }
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
  dataCache: Record<string, unknown>;
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

export const ChatProvider = ({ children }: { children: ReactNode }) => {
  const persisted = loadPersisted();
  const confirm = useConfirm();

  const [messages, setMessages] = useState<Message[]>(persisted.messages?.length ? persisted.messages : DEFAULT_MESSAGES);
  const [channels, setChannels] = useState<Channel[]>(persisted.channels?.length ? persisted.channels : DEFAULT_CHANNELS);
  const [currentChannel, setCurrentChannel] = useState('Geral');
  const [agents, setAgents] = useState<Agent[]>(DEFAULT_AGENTS);
  const [tasks, setTasks] = useState<Task[]>(persisted.tasks ?? []);
  const [dataCache, setDataCache] = useState<Record<string, unknown>>(persisted.dataCache ?? {});
  const [reports, setReports] = useState<string[]>(persisted.reports ?? []);
  const [notifications] = useState<{ id: string; text: string }[]>([]);
  const [activeAgentIndex, setActiveAgentIndex] = useState<number | null>(null);
  const [externalAgentURL, setExternalAgentURL] = useState('http://127.0.0.1:3000');
  const [pairingCode, setPairingCode] = useState('');
  const [thinkingLevel, setThinkingLevel] = useState<'LOW' | 'HIGH'>('HIGH');
  const [isLoading, setIsLoading] = useState(false);

  // Refs para acesso ao estado atual dentro de callbacks
  const messagesRef = useRef(messages);
  messagesRef.current = messages;
  const tasksRef = useRef(tasks);
  tasksRef.current = tasks;
  const dataCacheRef = useRef(dataCache);
  dataCacheRef.current = dataCache;

  // Debounce de 500ms para não serializar a cada mudança de estado
  const persistTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (persistTimer.current) clearTimeout(persistTimer.current);
    persistTimer.current = setTimeout(() => {
      persistState({ messages, channels, tasks, dataCache, reports });
    }, 500);
    return () => { if (persistTimer.current) clearTimeout(persistTimer.current); };
  }, [messages, channels, tasks, dataCache, reports]);

  const addMessage = useCallback((msg: Message) => {
    setMessages((prev) => [...prev, msg]);
  }, []);

  const sendMessage = async (input: string) => {
    const channel = channels.find((c) => c.name === currentChannel);
    if (channel?.isPrivate && !channel.members.includes('User')) {
      addMessage({ id: newMsgId(), channel: currentChannel, sender: 'Sistema', text: 'Você não tem permissão neste canal privado.' });
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
        addMessage({ id: newMsgId(), channel: currentChannel, sender: 'Sistema', text: 'Comandos locais: /clear, /reset' });
      }
      return;
    }

    addMessage({ id: newMsgId(), channel: currentChannel, sender: 'User', text: input });
    setIsLoading(true);

    try {
      let responseText = '';
      let senderName = 'Orquestrador Hub';

      if (activeAgentIndex !== null && agents[activeAgentIndex].provider === 'NullClaw Gateway') {
        senderName = agents[activeAgentIndex].name;
        const response = await fetch(`${externalAgentURL}/webhook`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${pairingCode}` },
          body: JSON.stringify({ message: input }),
        });
        if (response.ok) {
          const data = await response.json() as { reply?: string; response?: string };
          responseText = data.reply || data.response || JSON.stringify(data);
        } else {
          responseText = `Erro no Gateway (${response.status}).`;
        }
      } else {
        senderName = activeAgentIndex !== null ? agents[activeAgentIndex].name : 'Orquestrador Hub';

        // Histórico do canal ativo: últimas 20 mensagens User/AI (sem Sistema)
        const channelHistory = messagesRef.current
          .filter((m) => m.channel === currentChannel && m.sender !== 'Sistema')
          .slice(-20)
          .map((m) => ({
            role: m.sender === 'User' ? 'user' : 'assistant',
            content: m.text,
          }));

        const response = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ input, thinking: thinkingLevel, history: channelHistory }),
        });
        if (response.ok) {
          const data = await response.json() as { text?: string; error?: string };
          responseText = data.text || data.error || 'Sem resposta.';
        } else {
          const data = await response.json().catch(() => ({} as { error?: string })) as { error?: string };
          responseText = data.error?.includes('Ollama')
            ? data.error
            : 'Erro no servidor backend. Verifique se o Ollama está rodando com "ollama serve".';
        }
      }

      addMessage({ id: newMsgId(), channel: currentChannel, sender: senderName, text: responseText });
      await processCommands(responseText, {
        channel: currentChannel,
        tasks: tasksRef.current,
        dataCache: dataCacheRef.current,
        addMessage,
        setTasks,
        setDataCache,
        setReports,
      });
    } catch {
      addMessage({ id: newMsgId(), channel: currentChannel, sender: 'Sistema', text: 'Falha de comunicação. Verifique se o backend está rodando.' });
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
        const raw = JSON.parse(text) as unknown;
        if (Array.isArray(raw)) {
          if (raw.length === 0) throw new Error('JSON vazio.');
          const firstRow = raw[0] as Record<string, unknown>;
          const cols: Record<string, number[]> = {};
          for (const key of Object.keys(firstRow)) cols[key] = [];
          for (const row of raw) {
            for (const key of Object.keys(cols)) {
              const v = (row as Record<string, unknown>)[key];
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
        id: newMsgId(),
        channel: currentChannel,
        sender: 'Sistema',
        text: `Dataset "${file.name}" carregado: ${rows} linhas, ${cols.length} colunas (${cols.join(', ')}).\nUse: /use_tool analyze_descriptive {"data": <conteúdo de dataCache["${file.name}"]>}`
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      addMessage({ id: newMsgId(), channel: currentChannel, sender: 'Sistema', text: `Erro ao carregar arquivo: ${msg}` });
    }
  };

  const connectExternalAgent = async () => {
    if (!externalAgentURL.trim() || !pairingCode.trim()) return;

    // Evita duplicatas pelo mesmo URL
    const alreadyConnected = agents.some(
      (a) => a.provider === 'NullClaw Gateway' && a.description.includes(externalAgentURL)
    );
    if (alreadyConnected) {
      addMessage({ id: newMsgId(), channel: currentChannel, sender: 'Sistema', text: `Agente em ${externalAgentURL} já está conectado.` });
      return;
    }

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
        addMessage({ id: newMsgId(), channel: currentChannel, sender: 'Sistema', text: `Conectado com sucesso ao agente em ${externalAgentURL}!` });
        setPairingCode('');
      } else {
        addMessage({ id: newMsgId(), channel: currentChannel, sender: 'Sistema', text: `Erro: Gateway ${externalAgentURL} retornou erro.` });
      }
    } catch {
      addMessage({ id: newMsgId(), channel: currentChannel, sender: 'Sistema', text: 'Erro de conexão: Não alcançável.' });
    }
  };

  const transcribeAudio = (callback: (t: string) => void) => {
    if (!('webkitSpeechRecognition' in window)) {
      addMessage({ id: newMsgId(), channel: currentChannel, sender: 'Sistema', text: 'Reconhecimento de voz não suportado neste navegador.' });
      return;
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const SpeechRecognitionCtor = (window as any).webkitSpeechRecognition;
    const recognition = new SpeechRecognitionCtor();
    recognition.lang = 'pt-BR';
    recognition.onresult = (event: { results: { [0]: { [0]: { transcript: string } } } }) => {
      callback(event.results[0][0].transcript);
    };
    recognition.onerror = () => {
      addMessage({ id: newMsgId(), channel: currentChannel, sender: 'Sistema', text: 'Erro ao capturar áudio.' });
    };
    recognition.start();
    addMessage({ id: newMsgId(), channel: currentChannel, sender: 'Sistema', text: 'Ouvindo…' });
  };

  return (
    <ChatContext.Provider value={{
      messages, channels, currentChannel, agents, tasks, dataCache, reports, notifications, activeAgentIndex,
      externalAgentURL, pairingCode, thinkingLevel, isLoading,
      setCurrentChannel,
      addChannel: (ch) => setChannels((prev) => [...prev, ch]),
      addMessage,
      sendMessage,
      registerAgent: (ag) => setAgents((prev) => [...prev, ag]),
      updateAgent: (i, ag) => setAgents((prev) => { const next = [...prev]; next[i] = ag; return next; }),
      setActiveAgentIndex,
      setThinkingLevel,
      setExternalAgentURL,
      setPairingCode,
      connectExternalAgent,
      transcribeAudio,
      uploadDataset,
    }}>
      {children}
    </ChatContext.Provider>
  );
};
