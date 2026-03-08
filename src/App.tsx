/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useRef } from 'react';
import { Users, Settings, Send, Plus, Bot, Mic, Volume2, Radio } from 'lucide-react';
import { motion } from 'motion/react';
import { GoogleGenAI, ThinkingLevel, Modality } from '@google/genai';
import { Agent, Tool } from './types';
import { executeTool } from './services/toolService';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

export default function App() {
  const [messages, setMessages] = useState([
    { id: 1, channel: 'Geral', sender: 'Sistema', text: 'Bem-vindo ao Hub de Colaboração Multi-IA. Por favor, apresente-se ou proponha uma tarefa.' }
  ]);
  const [input, setInput] = useState('');
  const [channels, setChannels] = useState<{name: string, members: string[], isPrivate: boolean}[]>([{name: 'Geral', members: [], isPrivate: false}]);
  const [currentChannel, setCurrentChannel] = useState('Geral');
  const [newChannel, setNewChannel] = useState('');
  const [newChannelMembers, setNewChannelMembers] = useState<string[]>([]);
  const [isPrivateChannel, setIsPrivateChannel] = useState(false);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [tasks, setTasks] = useState<{id: number, title: string, description: string, deadline: string, status: string}[]>([]);
  const [dataCache, setDataCache] = useState<any>({});
  const [reports, setReports] = useState<string[]>([]);
  const [notifications, setNotifications] = useState<{id: number, text: string}[]>([]);
  const [newAgent, setNewAgent] = useState({name: '', specialty: '', description: '', permissions: '', provider: '', status: 'Ativo', tools: [] as Tool[]});
  const [editingAgentIndex, setEditingAgentIndex] = useState<number | null>(null);
  const [editAgentForm, setEditAgentForm] = useState({name: '', specialty: '', description: '', permissions: '', provider: '', status: 'Ativo'});
  
  const [externalAgentURL, setExternalAgentURL] = useState('http://127.0.0.1:3000');
  const [pairingCode, setPairingCode] = useState('');
  const [searchAgentTerm, setSearchAgentTerm] = useState('');
  
  const [thinkingLevel, setThinkingLevel] = useState<'LOW' | 'HIGH'>('HIGH');
  const audioRef = useRef<HTMLAudioElement>(null);

  const sendMessage = async () => {
    if (input.trim()) {
      const channel = channels.find(c => c.name === currentChannel);
      if (channel?.isPrivate && !channel.members.includes('User')) {
        setMessages(prev => [...prev, { id: Date.now(), channel: currentChannel, sender: 'Sistema', text: 'Você não tem permissão para enviar mensagens neste canal privado.' }]);
        setInput('');
        return;
      }

      if (input.startsWith('/')) {
        const [cmd, ...args] = input.slice(1).split(' ');
        switch (cmd) {
          case 'help':
            setMessages(prev => [...prev, { id: Date.now(), channel: currentChannel, sender: 'Sistema', text: 'Comandos disponíveis: /help, /list-agents, /clear, /summarize. Ações de agente: /criar_tarefa, /analisar_dados, /gerar_relatorio' }]);
            break;
          case 'list-agents':
            setMessages(prev => [...prev, { id: Date.now(), channel: currentChannel, sender: 'Sistema', text: `Agentes: ${agents.map(a => a.name).join(', ') || 'Nenhum'}` }]);
            break;
          case 'clear':
            setMessages(prev => prev.filter(m => m.channel !== currentChannel));
            break;
          case 'summarize':
            const channelMessages = messages.filter(m => m.channel === currentChannel).map(m => `${m.sender}: ${m.text}`).join('\n');
            try {
              const response = await ai.models.generateContent({
                model: "gemini-3.1-pro-preview",
                contents: `Resuma esta conversa:\n${channelMessages}`,
              });
              setMessages(prev => [...prev, { id: Date.now(), channel: currentChannel, sender: 'Gemini', text: `Resumo: ${response.text}` }]);
            } catch (e) {
              setMessages(prev => [...prev, { id: Date.now(), channel: currentChannel, sender: 'Sistema', text: 'Erro ao resumir.' }]);
            }
            break;
          default:
            setMessages(prev => [...prev, { id: Date.now(), channel: currentChannel, sender: 'Sistema', text: 'Comando desconhecido.' }]);
        }
        setInput('');
        return;
      }

      const userMessage = { id: Date.now(), channel: currentChannel, sender: 'User', text: input };
      setMessages([...messages, userMessage]);
      setInput('');

      try {
        const response = await ai.models.generateContent({
          model: "gemini-3.1-pro-preview",
          contents: input,
          config: {
            thinkingConfig: { thinkingLevel: thinkingLevel === 'HIGH' ? ThinkingLevel.HIGH : ThinkingLevel.LOW },
            systemInstruction: "Você é o Multi-AI Collaboration Hub, um sistema que orquestra múltiplas IAs. Você simula uma equipe colaborativa com agentes especializados. Responda como um agente, mantendo o estado. Detecte comandos prefixados com '/' (ex: /criar_tarefa, /analisar_dados, /gerar_relatorio) nos seus outputs e execute-os logicamente. Mantenha o histórico de tarefas, dados e relatórios. Você também pode usar ferramentas externas via comando '/use_tool [nome] [args_json]'. Exemplos: /use_tool github_list_repos '{\"username\": \"usuario\"}', /use_tool github_create_issue '{\"owner\": \"usuario\", \"repo\": \"projeto\", \"title\": \"Bug\", \"body\": \"Descricao\"}'."
          }
        });
        
        const responseText = response.text || 'Sem resposta.';
        setMessages(prev => [...prev, { id: Date.now() + 1, channel: currentChannel, sender: 'Gemini', text: responseText }]);
        
        // Parse for commands
        const commands = ['/criar_tarefa', '/analisar_dados', '/gerar_relatorio', '/notify_agent'];
        commands.forEach(cmd => {
          if (responseText.includes(cmd)) {
            let actionResult = '';
            if (cmd === '/criar_tarefa') {
              // Ex: /criar_tarefa "Título" "Descrição" "Prazo"
              const match = responseText.match(/\/criar_tarefa\s+"([^"]+)"\s+"([^"]+)"\s+"([^"]+)"/);
              if (match) {
                const [_, title, description, deadline] = match;
                const newTask = { id: tasks.length + 1, title, description, deadline, status: 'pendente' };
                setTasks(prev => [...prev, newTask]);
                actionResult = `Tarefa criada: ${title}`;
              } else {
                actionResult = 'Erro ao criar tarefa. Use o formato: /criar_tarefa "título" "descrição" "prazo"';
              }
            } else if (cmd === '/analisar_dados') {
              // Ex: /analisar_dados "{...}" "tipo"
              const match = responseText.match(/\/analisar_dados\s+({[^}]+})\s+"([^"]+)"/);
              if (match) {
                const [_, dataStr, type] = match;
                const data = JSON.parse(dataStr);
                setDataCache(prev => ({...prev, [type]: data}));
                actionResult = `Dados analisados (${type}): ${JSON.stringify(data)}`;
              } else {
                actionResult = 'Erro ao analisar dados. Use o formato: /analisar_dados "{json}" "tipo"';
              }
            } else if (cmd === '/gerar_relatorio') {
              // Ex: /gerar_relatorio "dados" "formato"
              const match = responseText.match(/\/gerar_relatorio\s+"([^"]+)"\s+"([^"]+)"/);
              if (match) {
                const [_, data, format] = match;
                const report = `Relatório (${format}): ${data}`;
                setReports(prev => [...prev, report]);
                actionResult = `Relatório gerado: ${report}`;
              } else {
                actionResult = 'Erro ao gerar relatório. Use o formato: /gerar_relatorio "dados" "formato"';
              }
            } else if (cmd === '/notify_agent') {
              // Ex: /notify_agent "Agente" "Mensagem"
              const match = responseText.match(/\/notify_agent\s+"([^"]+)"\s+"([^"]+)"/);
              if (match) {
                const [_, agentName, msg] = match;
                setNotifications(prev => [...prev, { id: Date.now(), text: `Notificação para ${agentName}: ${msg}` }]);
                actionResult = `Notificação enviada para ${agentName}`;
              } else {
                actionResult = 'Erro ao notificar. Use o formato: /notify_agent "agente" "mensagem"';
              }
            }
            setMessages(prev => [...prev, { id: Date.now() + 2, channel: currentChannel, sender: 'Sistema', text: `Ação Executada: ${actionResult}` }]);
          }
        });

        const toolMatch = responseText.match(/\/use_tool\s+(\w+)\s+({[^}]+})/);
        if (toolMatch) {
          const [_, toolName, argsStr] = toolMatch;
          try {
            const args = JSON.parse(argsStr);
            const result = await executeTool(toolName, args);
            setMessages(prev => [...prev, { id: Date.now() + 3, channel: currentChannel, sender: 'Sistema', text: `Resultado da Ferramenta ${toolName}: ${result}` }]);
          } catch (e) {
            setMessages(prev => [...prev, { id: Date.now() + 3, channel: currentChannel, sender: 'Sistema', text: `Erro ao executar ferramenta ${toolName}: ${e}` }]);
          }
        }
      } catch (error) {
        console.error(error);
        setMessages(prev => [...prev, { id: Date.now() + 1, channel: currentChannel, sender: 'Sistema', text: 'Erro: Não foi possível obter resposta do Gemini.' }]);
      }
    }
  };

  const addChannel = () => {
    if (newChannel.trim() && !channels.find(c => c.name === newChannel)) {
      setChannels([...channels, {name: newChannel, members: newChannelMembers, isPrivate: isPrivateChannel}]);
      setNewChannel('');
      setNewChannelMembers([]);
      setIsPrivateChannel(false);
    }
  };

  const registerAgent = () => {
    if (newAgent.name.trim() && newAgent.specialty.trim() && newAgent.description.trim()) {
      setAgents([...agents, {
        ...newAgent,
        permissions: newAgent.permissions.split(',').map(p => p.trim()),
        thinkingLevel: 'HIGH' // Default
      }]);
      setNewAgent({name: '', specialty: '', description: '', permissions: '', provider: '', status: 'Ativo', tools: []});
    }
  };

  const connectExternalAgent = async () => {
    if (externalAgentURL.trim() && pairingCode.trim()) {
      try {
        // Tentativa basica de conexão
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
           setMessages(prev => [...prev, { id: Date.now(), channel: currentChannel, sender: 'Sistema', text: `Conectado com sucesso ao agente em ${externalAgentURL} usando o código ${pairingCode}!` }]);
           setPairingCode('');
        } else {
           setMessages(prev => [...prev, { id: Date.now(), channel: currentChannel, sender: 'Sistema', text: `Erro: Gateway no endereço ${externalAgentURL} retornou erro.` }]);
        }
      } catch (e) {
        setMessages(prev => [...prev, { id: Date.now(), channel: currentChannel, sender: 'Sistema', text: `Erro de conexão: Não foi possível alcançar ${externalAgentURL}. Certifique-se que o agente está rodando.` }]);
      }
    }
  };

  const updateAgent = () => {
    if (editingAgentIndex !== null) {
      const updatedAgents = [...agents];
      updatedAgents[editingAgentIndex] = {
        ...updatedAgents[editingAgentIndex],
        ...editAgentForm,
        permissions: editAgentForm.permissions.split(',').map(p => p.trim())
      };
      setAgents(updatedAgents);
      setEditingAgentIndex(null);
    }
  };

  const startEdit = (index: number) => {
    setEditingAgentIndex(index);
    setEditAgentForm({
      ...agents[index],
      permissions: agents[index].permissions.join(', ')
    });
  };

  const transcribeAudio = async () => {
    if (!('webkitSpeechRecognition' in window)) {
      setMessages(prev => [...prev, { id: Date.now(), channel: currentChannel, sender: 'Sistema', text: 'Reconhecimento de voz não suportado neste navegador.' }]);
      return;
    }
    const recognition = new (window as any).webkitSpeechRecognition();
    recognition.lang = 'pt-BR';
    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setInput(transcript);
    };
    recognition.start();
    setMessages(prev => [...prev, { id: Date.now(), channel: currentChannel, sender: 'Sistema', text: 'Ouvindo... Fale agora.' }]);
  };

  const generateSpeech = async () => {
    try {
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash-preview-tts",
        contents: [{ parts: [{ text: 'Hello, I am Gemini, ready to collaborate.' }] }],
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
              voiceConfig: {
                prebuiltVoiceConfig: { voiceName: 'Kore' },
              },
          },
        },
      });
      const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
      if (base64Audio && audioRef.current) {
        audioRef.current.src = `data:audio/wav;base64,${base64Audio}`;
        audioRef.current.play();
      }
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900 font-sans flex flex-col">
      <header className="border-b border-zinc-200 bg-white p-4 flex items-center justify-between">
        <h1 className="text-xl font-semibold flex items-center gap-2">
          <Users className="w-6 h-6" /> Hub de Colaboração Multi-IA
        </h1>
        <button className="p-2 hover:bg-zinc-100 rounded-full">
          <Settings className="w-5 h-5" />
        </button>
      </header>

      <main className="flex-1 p-4 grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="md:col-span-3 bg-white border border-zinc-200 rounded-xl shadow-sm flex flex-col">
          <div className="flex-1 p-4 overflow-y-auto space-y-4">
            {messages.filter(m => m.channel === currentChannel).map((msg) => (
              <motion.div 
                key={msg.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`p-3 rounded-lg ${msg.sender === 'System' ? 'bg-zinc-100' : msg.sender === 'Gemini' ? 'bg-emerald-50' : 'bg-indigo-50'}`}
              >
                <span className="font-semibold text-xs text-zinc-500 uppercase flex items-center gap-1">
                  {msg.sender === 'Gemini' && <Bot className="w-3 h-3" />}
                  {msg.sender}
                </span>
                <p>{msg.text}</p>
              </motion.div>
            ))}
          </div>
          <div className="border-t border-zinc-200 p-4 flex gap-2 items-center">
            <button 
              onClick={() => setThinkingLevel(thinkingLevel === 'HIGH' ? 'LOW' : 'HIGH')}
              className={`px-3 py-1 rounded-lg text-xs font-semibold ${thinkingLevel === 'HIGH' ? 'bg-emerald-600 text-white' : 'bg-zinc-200 text-zinc-700'}`}
            >
              Pensamento: {thinkingLevel === 'HIGH' ? 'ALTO' : 'BAIXO'}
            </button>
            <input 
              type="text" 
              value={input}
              onChange={(e) => setInput(e.target.value)}
              className="flex-1 p-2 border border-zinc-300 rounded-lg"
              placeholder="Digite uma mensagem para o Gemini..."
            />
            <button onClick={sendMessage} className="bg-zinc-900 text-white p-2 rounded-lg">
              <Send className="w-5 h-5" />
            </button>
          </div>
        </div>

        <aside className="bg-white border border-zinc-200 rounded-xl shadow-sm p-4 space-y-6">
          <div>
            <h2 className="font-semibold mb-4">Canais</h2>
            <div className="space-y-2">
              {channels.map(channel => (
                <button 
                  key={channel.name} 
                  onClick={() => setCurrentChannel(channel.name)}
                  className={`w-full p-2 rounded-lg text-sm ${currentChannel === channel.name ? 'bg-indigo-600 text-white' : 'bg-zinc-100'}`}
                >
                  #{channel.name} {channel.isPrivate && '(Privado)'}
                  {channel.members.length > 0 && <span className="text-xs ml-1 opacity-70">({channel.members.join(', ')})</span>}
                </button>
              ))}
              <div className="space-y-2">
                <input 
                  type="text" 
                  value={newChannel}
                  onChange={(e) => setNewChannel(e.target.value)}
                  className="w-full p-2 border border-zinc-300 rounded-lg text-sm"
                  placeholder="Nome do novo canal"
                />
                <input 
                  type="text" 
                  value={newChannelMembers.join(', ')}
                  onChange={(e) => setNewChannelMembers(e.target.value.split(',').map(s => s.trim()))}
                  className="w-full p-2 border border-zinc-300 rounded-lg text-sm"
                  placeholder="Membros (separados por vírgula)"
                />
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={isPrivateChannel} onChange={(e) => setIsPrivateChannel(e.target.checked)} />
                  Privado
                </label>
                <button onClick={addChannel} className="w-full bg-zinc-900 text-white p-2 rounded-lg text-sm">
                  <Plus className="w-4 h-4" /> Adicionar Canal
                </button>
              </div>
            </div>
          </div>

          <div>
            <h2 className="font-semibold mb-4">Ferramentas de Áudio</h2>
            <div className="flex gap-2">
              <button onClick={transcribeAudio} className="bg-zinc-100 p-2 rounded-lg" title="Transcrever">
                <Mic className="w-5 h-5" />
              </button>
              <button onClick={generateSpeech} className="bg-zinc-100 p-2 rounded-lg" title="Gerar Fala">
                <Volume2 className="w-5 h-5" />
              </button>
              <button className="bg-zinc-100 p-2 rounded-lg" title="Áudio ao Vivo">
                <Radio className="w-5 h-5" />
              </button>
            </div>
            <audio ref={audioRef} className="hidden" />
          </div>

          <div>
            <h2 className="font-semibold mb-4">Registrar Agente</h2>
            <div className="space-y-2">
              <input 
                type="text" 
                value={newAgent.name}
                onChange={(e) => setNewAgent({...newAgent, name: e.target.value})}
                className="w-full p-2 border border-zinc-300 rounded-lg text-sm"
                placeholder="Nome do Agente"
              />
              <input 
                type="text" 
                value={newAgent.specialty}
                onChange={(e) => setNewAgent({...newAgent, specialty: e.target.value})}
                className="w-full p-2 border border-zinc-300 rounded-lg text-sm"
                placeholder="Especialidade"
              />
              <input 
                type="text" 
                value={newAgent.description}
                onChange={(e) => setNewAgent({...newAgent, description: e.target.value})}
                className="w-full p-2 border border-zinc-300 rounded-lg text-sm"
                placeholder="Descrição"
              />
              <input 
                type="text" 
                value={newAgent.provider}
                onChange={(e) => setNewAgent({...newAgent, provider: e.target.value})}
                className="w-full p-2 border border-zinc-300 rounded-lg text-sm"
                placeholder="Provedor"
              />
              <input 
                type="text" 
                value={newAgent.permissions}
                onChange={(e) => setNewAgent({...newAgent, permissions: e.target.value})}
                className="w-full p-2 border border-zinc-300 rounded-lg text-sm"
                placeholder="Permissões (separadas por vírgula)"
              />
              <input 
                type="text" 
                value={newAgent.tools.map(t => t.name).join(', ')}
                onChange={(e) => setNewAgent({...newAgent, tools: e.target.value.split(',').map(name => ({name: name.trim(), description: '', parameters: {}}))})}
                className="w-full p-2 border border-zinc-300 rounded-lg text-sm"
                placeholder="Ferramentas (separadas por vírgula)"
              />
              <select
                value={newAgent.status}
                onChange={(e) => setNewAgent({...newAgent, status: e.target.value})}
                className="w-full p-2 border border-zinc-300 rounded-lg text-sm"
              >
                <option value="Ativo">Ativo</option>
                <option value="Inativo">Inativo</option>
                <option value="Offline">Offline</option>
              </select>
              <button onClick={registerAgent} className="w-full bg-indigo-600 text-white p-2 rounded-lg text-sm flex items-center justify-center gap-2">
                <Plus className="w-4 h-4" /> Registrar
              </button>
            </div>
            
            <h2 className="font-semibold mt-6 mb-4">Conectar Agente Externo</h2>
            <div className="space-y-2">
               <input 
                type="text" 
                value={externalAgentURL}
                onChange={(e) => setExternalAgentURL(e.target.value)}
                className="w-full p-2 border border-zinc-300 rounded-lg text-sm"
                placeholder="URL do Gateway"
              />
              <input 
                type="text" 
                value={pairingCode}
                onChange={(e) => setPairingCode(e.target.value)}
                className="w-full p-2 border border-zinc-300 rounded-lg text-sm"
                placeholder="Pairing Code (ex: 793564)"
              />
               <button onClick={connectExternalAgent} className="w-full bg-emerald-600 text-white p-2 rounded-lg text-sm flex items-center justify-center gap-2">
                <Plus className="w-4 h-4" /> Conectar via Gateway
              </button>
            </div>
          </div>

          <div>
            <h2 className="font-semibold mb-4">Resumo do Agente</h2>
            {editingAgentIndex !== null ? (
              <div className="bg-zinc-100 p-3 rounded-lg space-y-2">
                <input type="text" value={editAgentForm.name} onChange={(e) => setEditAgentForm({...editAgentForm, name: e.target.value})} className="w-full p-1 text-sm border rounded" placeholder="Nome" />
                <input type="text" value={editAgentForm.specialty} onChange={(e) => setEditAgentForm({...editAgentForm, specialty: e.target.value})} className="w-full p-1 text-sm border rounded" placeholder="Especialidade" />
                <input type="text" value={editAgentForm.description} onChange={(e) => setEditAgentForm({...editAgentForm, description: e.target.value})} className="w-full p-1 text-sm border rounded" placeholder="Descrição" />
                <input type="text" value={editAgentForm.provider} onChange={(e) => setEditAgentForm({...editAgentForm, provider: e.target.value})} className="w-full p-1 text-sm border rounded" placeholder="Provedor" />
                <select value={editAgentForm.status} onChange={(e) => setEditAgentForm({...editAgentForm, status: e.target.value})} className="w-full p-1 text-sm border rounded">
                  <option value="Ativo">Ativo</option>
                  <option value="Inativo">Inativo</option>
                  <option value="Offline">Offline</option>
                </select>
                <input type="text" value={editAgentForm.permissions} onChange={(e) => setEditAgentForm({...editAgentForm, permissions: e.target.value})} className="w-full p-1 text-sm border rounded" placeholder="Permissões" />
                <div className="flex gap-2">
                  <button onClick={updateAgent} className="bg-indigo-600 text-white px-2 py-1 rounded text-xs">Salvar</button>
                  <button onClick={() => setEditingAgentIndex(null)} className="bg-zinc-300 px-2 py-1 rounded text-xs">Cancelar</button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <input 
                  type="text" 
                  value={searchAgentTerm}
                  onChange={(e) => setSearchAgentTerm(e.target.value)}
                  className="w-full p-2 border border-zinc-300 rounded-lg text-sm"
                  placeholder="Pesquisar agentes..."
                />
                <ul className="text-sm text-zinc-600 space-y-4 max-h-[400px] overflow-y-auto">
                  {agents.filter(a => a.name.toLowerCase().includes(searchAgentTerm.toLowerCase()) || a.specialty.toLowerCase().includes(searchAgentTerm.toLowerCase())).map((agent, i) => (
                    <li key={i} className="bg-zinc-100 p-3 rounded-lg space-y-1">
                      <div className="flex justify-between items-center">
                        <div className="font-semibold">{agent.name}</div>
                        <button onClick={() => startEdit(i)} className="text-xs text-indigo-600 hover:underline">Editar</button>
                      </div>
                      <div className="text-xs text-zinc-500">Provedor: {agent.provider} | Status: {agent.status}</div>
                      <div className="text-xs">{agent.description}</div>
                      <div className="text-xs font-semibold mt-1">Permissões:</div>
                      <div className="text-xs text-zinc-500">{agent.permissions.join(', ')}</div>
                      <div className="text-xs font-semibold mt-1">Ferramentas:</div>
                      <div className="text-xs text-zinc-500">{agent.tools.map(t => t.name).join(', ')}</div>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          <div>
            <h2 className="font-semibold mb-4">Estado do Hub</h2>
            <div className="space-y-4 text-xs">
              <div>
                <h3 className="font-semibold">Tarefas</h3>
                <ul className="list-disc pl-4">
                  {tasks.map(t => <li key={t.id}>{t.title} ({t.status})</li>)}
                </ul>
              </div>
              <div>
                <h3 className="font-semibold">Dados</h3>
                <pre className="bg-zinc-100 p-1 rounded">{JSON.stringify(dataCache, null, 2)}</pre>
              </div>
              <div>
                <h3 className="font-semibold">Relatórios</h3>
                <ul className="list-disc pl-4">
                  {reports.map((r, i) => <li key={i}>{r}</li>)}
                </ul>
              </div>
              <div>
                <h3 className="font-semibold">Notificações</h3>
                <ul className="list-disc pl-4">
                  {notifications.map(n => <li key={n.id}>{n.text}</li>)}
                </ul>
              </div>
            </div>
          </div>
        </aside>
      </main>
    </div>
  );
}
