import React, { useContext, useState } from 'react';
import { Send, Bot, Mic } from 'lucide-react';
import { motion } from 'motion/react';
import { ChatContext } from '../context/ChatContext';

export default function ChatArea() {
  const ctx = useContext(ChatContext);
  if (!ctx) return null;

  const { messages, currentChannel, sendMessage, thinkingLevel, setThinkingLevel, transcribeAudio } = ctx;
  const [input, setInput] = useState('');

  const handleSend = () => {
    if (input.trim()) {
      sendMessage(input);
      setInput('');
    }
  };

  return (
    <div className="flex-1 bg-white flex flex-col h-full overflow-hidden">
      <div className="p-4 border-b border-zinc-200 bg-zinc-50 flex items-center justify-between shadow-sm">
        <h2 className="font-semibold text-zinc-900"># {currentChannel}</h2>
        <div className="flex items-center gap-2 text-xs">
          <span className="text-zinc-600">Nível de Pensamento:</span>
          <button 
            onClick={() => setThinkingLevel(thinkingLevel === 'HIGH' ? 'LOW' : 'HIGH')}
            className={`px-3 py-1.5 rounded-md font-semibold transition-all shadow-sm ${thinkingLevel === 'HIGH' ? 'bg-emerald-600 hover:bg-emerald-700 text-white' : 'bg-zinc-200 hover:bg-zinc-300 text-zinc-800'}`}
          >
            {thinkingLevel === 'HIGH' ? 'ALTO' : 'BAIXO'}
          </button>
        </div>
      </div>

      <div className="flex-1 p-6 overflow-y-auto space-y-6">
        {messages.filter(m => m.channel === currentChannel).map((msg) => (
          <motion.div 
            key={msg.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`flex w-full ${msg.sender === 'User' ? 'justify-end' : 'justify-start'}`}
          >
            <div className={`max-w-[75%] p-4 rounded-xl shadow-sm leading-relaxed ${
              msg.sender === 'User' ? 'bg-indigo-600 text-white rounded-br-none' : 
              msg.sender === 'Sistema' ? 'bg-zinc-100 text-zinc-800 border border-zinc-200 text-sm italic' : 
              'bg-emerald-50 border border-emerald-100 text-emerald-950 rounded-bl-none'
            }`}>
              <span className={`font-bold text-[10px] uppercase flex items-center gap-1 mb-1 opacity-80 ${msg.sender === 'User' ? 'text-indigo-200' : 'text-zinc-500'}`}>
                {msg.sender !== 'User' && msg.sender !== 'Sistema' && <Bot className="w-3 h-3" />}
                {msg.sender}
              </span>
              <p className="whitespace-pre-wrap">{msg.text}</p>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="p-4 bg-zinc-50 border-t border-zinc-200 shadow-inner">
        <div className="flex gap-2 items-center bg-white p-2 rounded-xl border border-zinc-300 focus-within:ring-2 ring-indigo-500/20 transition-all shadow-sm">
           <button 
            onClick={() => transcribeAudio(setInput)}
            className="p-2 text-zinc-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
            title="Transcrever áudio"
          >
            <Mic className="w-5 h-5" />
          </button>
          <input 
            type="text" 
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            className="flex-1 p-2 outline-none bg-transparent"
            placeholder="Digite uma mensagem ou comando (ex: /use_tool github_list_repos)..."
          />
          <button 
            onClick={handleSend} 
            className="bg-zinc-900 hover:bg-black text-white p-2.5 rounded-lg transition-colors shadow-sm"
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
}
