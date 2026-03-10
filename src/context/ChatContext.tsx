import React, { createContext, useState, ReactNode } from 'react';
import { Agent, Tool, Message, Channel, Task } from '../types';

interface ChatContextType {
  messages: Message[];
  channels: Channel[];
  currentChannel: string;
  agents: Agent[];
  tasks: Task[];
  dataCache: any;
  reports: string[];
  notifications: {id: number, text: string}[];
  activeAgentIndex: number | null;
  externalAgentURL: string;
  pairingCode: string;
  thinkingLevel: 'LOW' | 'HIGH';
  
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
}

export const ChatContext = createContext<ChatContextType | undefined>(undefined);

export const ChatProvider = ({ children }: { children: ReactNode }) => {
  const [messages, setMessages] = useState<Message[]>([
    { id: 1, channel: 'Geral', sender: 'Sistema', text: 'Bem-vindo ao Hub de Colaboração Multi-IA. Por favor, apresente-se ou proponha uma tarefa.' }
  ]);
  const [channels, setChannels] = useState<Channel[]>([{name: 'Geral', members: [], isPrivate: false}]);
  const [currentChannel, setCurrentChannel] = useState('Geral');
  
  const [agents, setAgents] = useState<Agent[]>([
    {
      name: 'Orquestrador Hub',
      specialty: 'Coordenação e Gemini 3.1',
      description: 'IA central do sistema para tarefas gerais e orquestração.',
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
  ]);
  
  const [tasks, setTasks] = useState<Task[]>([]);
  const [dataCache, setDataCache] = useState<any>({});
  const [reports, setReports] = useState<string[]>([]);
  const [notifications, setNotifications] = useState<{id: number, text: string}[]>([]);
  const [activeAgentIndex, setActiveAgentIndex] = useState<number | null>(0);
  const [externalAgentURL, setExternalAgentURL] = useState('http://127.0.0.1:3000');
  const [pairingCode, setPairingCode] = useState('');
  const [thinkingLevel, setThinkingLevel] = useState<'LOW' | 'HIGH'>('HIGH');

  const processCommands = async (responseText: string) => {
    // Parser simples para comandos textuais
    let processedResult = responseText;
    
    // Tools /use_tool [nome] {"json"}
    const toolMatch = responseText.match(/\/use_tool\s+([a-zA-Z_0-9]+)\s+({[^}]+})/);
    if (toolMatch) {
      try {
        const [_, toolName, argsStr] = toolMatch;
        const args = JSON.parse(argsStr);
        const res = await fetch('/api/tools/execute', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ toolName, args })
        });
        const data = await res.json();
        
        let toolOutput = data.result || JSON.stringify(data);
        addMessage({ id: Date.now(), channel: currentChannel, sender: 'Sistema', text: `Resultado da Ferramenta ${toolName}: ${toolOutput}` });
      } catch (err: any) {
         addMessage({ id: Date.now(), channel: currentChannel, sender: 'Sistema', text: `Erro de ferramenta: ${err.message}` });
      }
    }

    if (responseText.includes('/criar_tarefa')) {
      const match = responseText.match(/\/criar_tarefa\s+"([^"]+)"\s+"([^"]+)"\s+"([^"]+)"/);
      if (match) {
        setTasks(prev => [...prev, { id: prev.length + 1, title: match[1], description: match[2], deadline: match[3], status: 'pendente' }]);
        addMessage({ id: Date.now(), channel: currentChannel, sender: 'Sistema', text: `Tarefa criada: ${match[1]}` });
      }
    }

    if (responseText.includes('/analisar_dados')) {
      const match = responseText.match(/\/analisar_dados\s+({[^}]+})\s+"([^"]+)"/);
      if (match) {
        try {
          const type = match[2];
          setDataCache((prev: any) => ({...prev, [type]: JSON.parse(match[1])}));
          addMessage({ id: Date.now(), channel: currentChannel, sender: 'Sistema', text: `Dados analisados cache: [${type}]` });
        } catch {}
      }
    }
  };

  const addMessage = (msg: Message) => {
    setMessages(prev => [...prev, msg]);
  };

  const sendMessage = async (input: string) => {
    const channel = channels.find(c => c.name === currentChannel);
    if (channel?.isPrivate && !channel.members.includes('User')) {
      addMessage({ id: Date.now(), channel: currentChannel, sender: 'Sistema', text: 'Você não tem permissão neste canal privado.' });
      return;
    }

    if (input.startsWith('/')) {
      if (input === '/clear') {
         setMessages(prev => prev.filter(m => m.channel !== currentChannel));
      } else {
         addMessage({ id: Date.now(), channel: currentChannel, sender: 'Sistema', text: 'Os comandos locais são: /clear' });
      }
      return;
    }

    addMessage({ id: Date.now(), channel: currentChannel, sender: 'User', text: input });

    try {
      let responseText = '';
      let senderName = 'Gemini';

      // Se Agente Externo
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
        // Backend Express Local
        senderName = activeAgentIndex !== null ? agents[activeAgentIndex].name : 'Orquestrador Hub';
        const response = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            input: input,
            thinking: thinkingLevel
          })
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
    }
  };

  const connectExternalAgent = async () => {
    if (externalAgentURL.trim() && pairingCode.trim()) {
      try {
        const response = await fetch(`${externalAgentURL}/health`);
        if (response.ok) {
           setAgents([...agents, {
             name: 'NullClaw Externo',
             specialty: 'Agente Conectado',
             description: `Agente rodando em ${externalAgentURL}`,
             permissions: ['full_access'],
             provider: 'NullClaw Gateway',
             status: 'Online',
             thinkingLevel: 'HIGH',
             tools: []
           }]);
           addMessage({ id: Date.now(), channel: currentChannel, sender: 'Sistema', text: `Conectado com sucesso ao agente em ${externalAgentURL}!` });
           setPairingCode('');
        } else {
           addMessage({ id: Date.now(), channel: currentChannel, sender: 'Sistema', text: `Erro: Gateway ${externalAgentURL} retornou erro.` });
        }
      } catch (e) {
        addMessage({ id: Date.now(), channel: currentChannel, sender: 'Sistema', text: `Erro de conexão: Não alcançável.` });
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
      messages, channels, currentChannel, agents, tasks, dataCache, reports, notifications, activeAgentIndex, externalAgentURL, pairingCode, thinkingLevel,
      setCurrentChannel, addChannel: (ch) => setChannels([...channels, ch]), addMessage, sendMessage,
      registerAgent: (ag) => setAgents([...agents, ag]),
      updateAgent: (i, ag) => { const newAg = [...agents]; newAg[i] = ag; setAgents(newAg); },
      setActiveAgentIndex, setThinkingLevel, setExternalAgentURL, setPairingCode, connectExternalAgent, transcribeAudio
    }}>
      {children}
    </ChatContext.Provider>
  );
};
