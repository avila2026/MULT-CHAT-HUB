import React, { createContext, useState, useEffect, useRef, useCallback, ReactNode } from 'react';
import { Agent, Message, Channel, Task, AnalysisResult, ProviderName, ProviderConfig } from '../types';
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
  streamingId: string | null;
  activeProvider: ProviderName;
  providerConfig: Record<ProviderName, ProviderConfig>;

  setCurrentChannel: (ch: string) => void;
  addChannel: (ch: Channel) => void;
  addMessage: (msg: Message) => void;
  updateMessageText: (id: string, text: string) => void;
  sendMessage: (text: string) => Promise<void>;
  registerAgent: (agent: Agent) => void;
  updateAgent: (index: number, agent: Agent) => void;
  setActiveAgentIndex: (index: number | null) => void;
  setThinkingLevel: (level: 'LOW' | 'HIGH') => void;
  setActiveProvider: (p: ProviderName) => void;
  updateProviderConfig: (p: ProviderName, cfg: Partial<ProviderConfig>) => void;
  setExternalAgentURL: (url: string) => void;
  setPairingCode: (code: string) => void;
  connectExternalAgent: () => Promise<void>;
  transcribeAudio: (callback: (text: string) => void) => void;
  uploadDataset: (file: File) => Promise<void>;
}

export const ChatContext = createContext<ChatContextType | undefined>(undefined);

const STORAGE_KEY = 'mch:state:v1';
const MAX_PERSIST_MESSAGES = 100;

const DEFAULT_PROVIDER_CONFIG: Record<ProviderName, ProviderConfig> = {
  ollama:     { model: 'fazendaavila2026/avila:latest', apiKey: '' },
  openai:     { model: 'gpt-4o-mini', apiKey: '' },
  anthropic:  { model: 'claude-haiku-4-5-20251001', apiKey: '' },
  gemini:     { model: 'gemini-2.0-flash-lite', apiKey: '' },
  openrouter: { model: 'openai/gpt-4o-mini', apiKey: '' },
};

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
    name: 'Agente de Análise',
    specialty: 'Análise de Dados & BI',
    description: 'Especialista em análise descritiva, preditiva, detecção de anomalias e otimização linear sobre datasets carregados.',
    permissions: ['tools', 'data_read'],
    provider: 'Interno',
    status: 'Ativo',
    thinkingLevel: 'HIGH',
    tools: [
      { name: 'analyze_descriptive', description: 'Estatísticas descritivas por coluna', parameters: { data: 'object' } },
      { name: 'analyze_predictive', description: 'Regressão linear multivariada', parameters: { data: 'object', target_column: 'string' } },
      { name: 'detect_anomalies', description: 'Detecção de anomalias via z-score', parameters: { data: 'object' } },
      { name: 'optimize_linear', description: 'Otimização linear (LP)', parameters: {} }
    ]
  },
  {
    name: 'Agente de Tools',
    specialty: 'Execução de Ferramentas',
    description: 'Dispatcher de ferramentas do backend: matemática, tempo, memória e análises. Interpreta /use_tool e roteia ao endpoint correto.',
    permissions: ['tools', 'backend'],
    provider: 'Interno',
    status: 'Ativo',
    thinkingLevel: 'LOW',
    tools: [
      { name: 'get_current_time', description: 'Data e hora atual', parameters: {} },
      { name: 'calculate_math', description: 'Calculadora matemática segura', parameters: { expression: 'string' } },
      { name: 'store_memory', description: 'Salva valor em memória', parameters: { key: 'string', value: 'string' } },
      { name: 'retrieve_memory', description: 'Recupera valor da memória', parameters: { key: 'string' } }
    ]
  },
  {
    name: 'Agente GitHub',
    specialty: 'Integração GitHub',
    description: 'Gerencia repositórios e issues via API do GitHub. Requer GITHUB_TOKEN configurado no backend.',
    permissions: ['tools', 'github'],
    provider: 'GitHub API',
    status: 'Ativo',
    thinkingLevel: 'LOW',
    tools: [
      { name: 'github_list_repos', description: 'Lista repositórios de um usuário', parameters: { username: 'string' } },
      { name: 'github_create_issue', description: 'Cria issue em repositório', parameters: { owner: 'string', repo: 'string', title: 'string', body: 'string' } }
    ]
  },
  {
    name: 'Agente de Memória',
    specialty: 'Persistência & Contexto',
    description: 'Gerencia memória de curto e longo prazo do hub. Salva e recupera contexto entre sessões via store_memory/retrieve_memory.',
    permissions: ['memory', 'tools'],
    provider: 'Interno',
    status: 'Ativo',
    thinkingLevel: 'LOW',
    tools: [
      { name: 'store_memory', description: 'Persiste valor por chave', parameters: { key: 'string', value: 'string' } },
      { name: 'retrieve_memory', description: 'Recupera valor por chave', parameters: { key: 'string' } }
    ]
  },
  {
    name: 'Agente de Relatórios',
    specialty: 'Geração de Relatórios',
    description: 'Consolida resultados de análises, tarefas e métricas em relatórios estruturados via /gerar_relatorio.',
    permissions: ['reports', 'data_read'],
    provider: 'Interno',
    status: 'Ativo',
    thinkingLevel: 'HIGH',
    tools: []
  },
  {
    name: 'Agente de Segurança',
    specialty: 'Auditoria & Conformidade',
    description: 'Monitora entradas suspeitas, valida expressões matemáticas e audita uso de ferramentas. Bloqueia payloads maliciosos.',
    permissions: ['audit', 'read_only'],
    provider: 'Interno',
    status: 'Ativo',
    thinkingLevel: 'HIGH',
    tools: []
  },
  {
    name: 'Agente de Monetização',
    specialty: 'Estratégia & Receita',
    description: 'Analisa métricas de uso, sugere modelos de precificação e identifica oportunidades de crescimento com base nos dados do hub.',
    permissions: ['data_read', 'reports'],
    provider: 'Interno',
    status: 'Ativo',
    thinkingLevel: 'HIGH',
    tools: [
      { name: 'recommend_stack', description: 'Recomenda stack tecnológica', parameters: {} }
    ]
  },
  {
    name: 'Agente de Cibersegurança',
    specialty: 'Segurança Ofensiva e Defensiva',
    description: 'Especialista em segurança via Claude API (Anthropic). Analisa vulnerabilidades, audita código, detecta ameaças e gera relatórios de conformidade OWASP/CWE.',
    permissions: ['security_scan', 'code_audit'],
    provider: 'Claude API',
    status: 'Online',
    thinkingLevel: 'HIGH' as const,
    tools: [
      { name: 'scan_text_threats', description: 'Detecta padrões de injeção e ameaças no texto', parameters: { text: 'string' } },
      { name: 'analyze_code_security', description: 'Audita código por vulnerabilidades (CWE/OWASP)', parameters: { code: 'string', language: 'string' } },
      { name: 'generate_security_report', description: 'Gera relatório de segurança estruturado', parameters: { findings: 'string' } }
    ]
  },
  {
    name: 'NullClaw Gateway',
    specialty: 'Automação Local',
    description: 'Conecte seu motor NullClaw rodando localmente.',
    permissions: ['full_access'],
    provider: 'NullClaw Gateway',
    status: 'Offline',
    thinkingLevel: 'HIGH' as const,
    tools: []
  },
  {
    name: 'OpenClaw Automator',
    specialty: 'Integração Webhook Genérico',
    description: 'Agente para automação via webhooks externos. Configure um endpoint URL e dispare automações para qualquer API compatível.',
    permissions: ['tools', 'webhook'],
    provider: 'Webhook Externo',
    status: 'Offline',
    thinkingLevel: 'HIGH' as const,
    tools: [{ name: 'webhook_call', description: 'POST para webhook configurado', parameters: { url: 'string', payload: 'object', headers: 'object' } }]
  }
];

interface PersistedState {
  messages: Message[];
  channels: Channel[];
  tasks: Task[];
  dataCache: Record<string, unknown>;
  reports: string[];
  activeProvider?: ProviderName;
  providerConfig?: Record<ProviderName, ProviderConfig>;
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

function mergeProviderConfig(
  saved: Partial<Record<ProviderName, ProviderConfig>> | undefined
): Record<ProviderName, ProviderConfig> {
  if (!saved) return { ...DEFAULT_PROVIDER_CONFIG };
  const result = { ...DEFAULT_PROVIDER_CONFIG };
  for (const p of Object.keys(DEFAULT_PROVIDER_CONFIG) as ProviderName[]) {
    if (saved[p]) result[p] = { ...result[p], ...saved[p] };
  }
  return result;
}

// SSE reader helper: returns the full accumulated text
async function readSseStream(
  response: globalThis.Response,
  onToken: (token: string) => void
): Promise<string> {
  const reader = response.body!.getReader();
  const decoder = new TextDecoder();
  const tokens: string[] = [];
  let sseBuffer = '';
  let done = false;

  while (!done) {
    const { value, done: readerDone } = await reader.read();
    if (readerDone) break;
    sseBuffer += decoder.decode(value, { stream: true });
    const lines = sseBuffer.split('\n');
    sseBuffer = lines.pop() ?? '';
    for (const line of lines) {
      const trimmed = line.replace(/^data:\s*/, '').trim();
      if (!trimmed) continue;
      try {
        const evt = JSON.parse(trimmed) as { token?: string; done?: boolean; text?: string; error?: string };
        if (evt.error) throw new Error(evt.error);
        if (evt.token) { tokens.push(evt.token); onToken(evt.token); }
        if (evt.done) { done = true; if (evt.text) return evt.text; break; }
      } catch (e) {
        // Re-throw error events, ignore malformed SSE lines
        if (e instanceof Error && !line.startsWith('data:')) continue;
        throw e;
      }
    }
  }
  // Flush remaining decoder bytes
  sseBuffer += decoder.decode();
  return tokens.join('');
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
  const [streamingId, setStreamingId] = useState<string | null>(null);
  const [activeProvider, setActiveProvider] = useState<ProviderName>(
    () => (persisted.activeProvider ?? 'ollama')
  );
  const [providerConfig, setProviderConfig] = useState<Record<ProviderName, ProviderConfig>>(
    () => mergeProviderConfig(persisted.providerConfig)
  );

  const updateProviderConfig = useCallback((p: ProviderName, cfg: Partial<ProviderConfig>) => {
    setProviderConfig((prev) => ({ ...prev, [p]: { ...prev[p], ...cfg } }));
  }, []);

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
      persistState({ messages, channels, tasks, dataCache, reports, activeProvider, providerConfig });
    }, 500);
    return () => { if (persistTimer.current) clearTimeout(persistTimer.current); };
  }, [messages, channels, tasks, dataCache, reports, activeProvider, providerConfig]);

  const addMessage = useCallback((msg: Message) => {
    setMessages((prev) => [...prev, msg]);
  }, []);

  const updateMessageText = useCallback((id: string, text: string) => {
    setMessages((prev) => prev.map((m) => m.id === id ? { ...m, text } : m));
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

    let streamPlaceholderId: string | null = null;
    try {
      let responseText = '';
      let senderName = 'Orquestrador Hub';
      const activeAgent = activeAgentIndex !== null ? agents[activeAgentIndex] : null;

      if (activeAgent?.provider === 'NullClaw Gateway') {
        senderName = activeAgent.name;
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
        addMessage({ id: newMsgId(), channel: currentChannel, sender: senderName, text: responseText });

      } else if (activeAgent?.provider === 'Webhook Externo') {
        senderName = activeAgent.name;
        responseText = 'Aguardando configuração de URL de webhook. Defina a URL no campo "Conectar Gateway Externo" (URL) e envie /use_tool webhook_call para testar.';
        addMessage({ id: newMsgId(), channel: currentChannel, sender: senderName, text: responseText });

      } else if (activeAgent?.provider === 'Claude API') {
        // SSE streaming via Agente de Cibersegurança (Claude API)
        senderName = activeAgent.name;

        const channelHistory = messagesRef.current
          .filter((m) => m.channel === currentChannel && m.sender !== 'Sistema')
          .slice(-20)
          .map((m) => ({ role: m.sender === 'User' ? 'user' : 'assistant', content: m.text }));

        const streamMsgId = newMsgId();
        streamPlaceholderId = streamMsgId;
        addMessage({ id: streamMsgId, channel: currentChannel, sender: senderName, text: '' });
        setStreamingId(streamMsgId);

        try {
          const response = await fetch('/api/chat/claude-security', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ input, history: channelHistory }),
          });

          if (!response.ok || !response.body) {
            const errData = await response.json().catch(() => ({} as { error?: string })) as { error?: string };
            responseText = errData.error ?? 'Erro ao conectar à Claude API. Verifique ANTHROPIC_API_KEY no backend.';
            updateMessageText(streamMsgId, responseText);
          } else {
            try {
              const claudeTokens: string[] = [];
              responseText = await readSseStream(response, (token) => {
                claudeTokens.push(token);
                updateMessageText(streamMsgId, claudeTokens.join(''));
              });
              updateMessageText(streamMsgId, responseText);
            } catch (sseErr: unknown) {
              responseText = sseErr instanceof Error ? sseErr.message : 'Erro no stream do Agente de Cibersegurança.';
              updateMessageText(streamMsgId, responseText);
            }
          }
        } finally {
          setStreamingId(null);
        }

      } else if (activeProvider === 'ollama') {
        // SSE streaming via Ollama
        senderName = activeAgent?.name ?? 'Orquestrador Hub';

        const channelHistory = messagesRef.current
          .filter((m) => m.channel === currentChannel && m.sender !== 'Sistema')
          .slice(-20)
          .map((m) => ({ role: m.sender === 'User' ? 'user' : 'assistant', content: m.text }));

        const cfg = providerConfig[activeProvider];
        const streamMsgId = newMsgId();
        streamPlaceholderId = streamMsgId;
        addMessage({ id: streamMsgId, channel: currentChannel, sender: senderName, text: '' });
        setStreamingId(streamMsgId);

        try {
          const response = await fetch('/api/chat/stream', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ input, thinking: thinkingLevel, history: channelHistory, model: cfg.model }),
          });

          if (!response.ok || !response.body) {
            const errData = await response.json().catch(() => ({} as { error?: string })) as { error?: string };
            responseText = errData.error ?? 'Ollama offline. Inicie com `ollama serve`.';
            updateMessageText(streamMsgId, responseText);
          } else {
            // Accumulate tokens in a local array to avoid O(n²) string growth
            const accumulated: string[] = [];
            try {
              responseText = await readSseStream(response, (token) => {
                accumulated.push(token);
                updateMessageText(streamMsgId, accumulated.join(''));
              });
              updateMessageText(streamMsgId, responseText);
            } catch (sseErr: unknown) {
              responseText = sseErr instanceof Error ? sseErr.message : 'Erro no stream do Ollama.';
              updateMessageText(streamMsgId, responseText);
            }
          }
        } finally {
          setStreamingId(null);
        }

      } else {
        // Non-streaming multi-provider path (openai, anthropic, gemini, openrouter)
        senderName = activeAgent?.name ?? 'Orquestrador Hub';

        const channelHistory = messagesRef.current
          .filter((m) => m.channel === currentChannel && m.sender !== 'Sistema')
          .slice(-20)
          .map((m) => ({ role: m.sender === 'User' ? 'user' : 'assistant', content: m.text }));

        const cfg = providerConfig[activeProvider];
        const response = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            input,
            thinking: thinkingLevel,
            history: channelHistory,
            provider: activeProvider,
            model: cfg.model,
            apiKey: cfg.apiKey,
          }),
        });
        if (response.ok) {
          const data = await response.json() as { text?: string; error?: string };
          responseText = data.text || data.error || 'Sem resposta.';
        } else {
          const data = await response.json().catch(() => ({} as { error?: string })) as { error?: string };
          responseText = data.error ?? `Erro ao chamar ${activeProvider}.`;
        }
        addMessage({ id: newMsgId(), channel: currentChannel, sender: senderName, text: responseText });
      }

      // processCommands runs for all paths
      if (responseText) {
        await processCommands(responseText, {
          channel: currentChannel,
          tasks: tasksRef.current,
          dataCache: dataCacheRef.current,
          addMessage,
          setTasks,
          setDataCache,
          setReports,
        });
      }
    } catch {
      const errMsg = 'Falha de comunicação. Verifique se o backend está rodando.';
      if (streamPlaceholderId) {
        updateMessageText(streamPlaceholderId, errMsg);
      } else {
        addMessage({ id: newMsgId(), channel: currentChannel, sender: 'Sistema', text: errMsg });
      }
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
      externalAgentURL, pairingCode, thinkingLevel, isLoading, streamingId, activeProvider, providerConfig,
      setCurrentChannel,
      addChannel: (ch) => setChannels((prev) => [...prev, ch]),
      addMessage,
      updateMessageText,
      sendMessage,
      registerAgent: (ag) => setAgents((prev) => [...prev, ag]),
      updateAgent: (i, ag) => setAgents((prev) => { const next = [...prev]; next[i] = ag; return next; }),
      setActiveAgentIndex,
      setThinkingLevel,
      setActiveProvider,
      updateProviderConfig,
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
