import React, { useContext, useState } from 'react';
import { Plus } from 'lucide-react';
import { ChatContext } from '../context/ChatContext';

export default function AgentConfig() {
  const ctx = useContext(ChatContext);
  if (!ctx) return null;

  const { agents, activeAgentIndex, setActiveAgentIndex, externalAgentURL, setExternalAgentURL, pairingCode, setPairingCode, connectExternalAgent } = ctx;
  const [searchTerm, setSearchTerm] = useState('');

  const filteredAgents = agents.filter(a => a.name.toLowerCase().includes(searchTerm.toLowerCase()) || a.specialty.toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <aside className="bg-white border-l border-zinc-200 p-4 w-[350px] overflow-y-auto hidden lg:flex flex-col">
       <div>
        <h2 className="font-semibold mb-4 text-zinc-800">Agentes Disponíveis</h2>
        <input 
          type="text" 
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full p-2 mb-4 border border-zinc-300 rounded-md text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 ring-indigo-500 transition-all"
          placeholder="Pesquisar agentes..."
        />
        
        <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
          {filteredAgents.map((agent, i) => {
            const index = agents.findIndex(a => a.name === agent.name);
            const isActive = activeAgentIndex === index;
            
            return (
              <div 
                key={agent.name}
                onClick={() => setActiveAgentIndex(isActive ? null : index)}
                className={`p-3 rounded-xl border-2 transition-all cursor-pointer ${isActive ? 'border-indigo-600 bg-indigo-50 shadow-sm' : 'border-zinc-200 hover:border-zinc-300 hover:bg-zinc-50'}`}
              >
                <div className="flex justify-between items-center mb-1">
                  <div className="font-semibold text-sm text-zinc-900">{agent.name}</div>
                  {isActive && <span className="bg-indigo-600 text-white text-[10px] px-2 py-0.5 rounded-full font-bold shadow-sm">ATIVO</span>}
                </div>
                <div className="text-[10px] text-zinc-500 mb-2 uppercase font-semibold">Provedor: {agent.provider} | Status: {agent.status}</div>
                <div className="text-xs text-zinc-600 mb-2 leading-relaxed">{agent.description}</div>
                <div className="flex flex-wrap gap-1">
                  {agent.permissions.map((p, idx) => (
                    <span key={idx} className="bg-zinc-200 text-zinc-700 text-[9px] px-1.5 py-0.5 rounded font-medium">{p}</span>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="mt-8 pt-6 border-t border-zinc-200">
        <h2 className="font-semibold mb-4 text-zinc-800 text-sm">Conectar Gateway Externo</h2>
        <div className="space-y-3 bg-zinc-50 p-4 rounded-xl border border-zinc-200">
          <div>
            <label className="text-[10px] font-bold text-zinc-500 uppercase">URL do Gateway</label>
            <input 
              type="text" 
              value={externalAgentURL}
              onChange={(e) => setExternalAgentURL(e.target.value)}
              className="w-full mt-1 p-2 border border-zinc-300 rounded-lg text-sm bg-white"
              placeholder="http://127.0.0.1:3000"
            />
          </div>
          <div>
            <label className="text-[10px] font-bold text-zinc-500 uppercase">Código de Pareamento</label>
            <input 
              type="text" 
              value={pairingCode}
              onChange={(e) => setPairingCode(e.target.value)}
              className="w-full mt-1 p-2 border border-zinc-300 rounded-lg text-sm bg-white"
              placeholder="Ex: 793564"
            />
          </div>
          <button onClick={connectExternalAgent} className="w-full bg-emerald-600 hover:bg-emerald-700 text-white p-2.5 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2 shadow-sm">
            <Plus className="w-4 h-4" /> Conectar
          </button>
        </div>
      </div>
    </aside>
  );
}
