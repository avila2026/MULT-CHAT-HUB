import React, { useContext, useState } from 'react';
import { Plus } from 'lucide-react';
import { ChatContext } from '../context/ChatContext';

export default function Sidebar() {
  const ctx = useContext(ChatContext);
  if (!ctx) return null;

  const { channels, currentChannel, setCurrentChannel, addChannel, tasks, reports } = ctx;
  const [newChannel, setNewChannel] = useState('');
  const [newChannelMembers, setNewChannelMembers] = useState<string[]>([]);
  const [isPrivateChannel, setIsPrivateChannel] = useState(false);

  const handleAddChannel = () => {
    if (newChannel.trim() && !channels.find(c => c.name === newChannel)) {
      addChannel({name: newChannel, members: newChannelMembers, isPrivate: isPrivateChannel});
      setNewChannel('');
      setNewChannelMembers([]);
      setIsPrivateChannel(false);
    }
  };

  return (
    <aside className="bg-white border-r border-zinc-200 p-4 space-y-6 flex flex-col w-[300px] overflow-y-auto">
      <div>
        <h2 className="font-semibold mb-4 text-zinc-800">Canais</h2>
        <div className="space-y-1">
          {channels.map(channel => (
            <button 
              key={channel.name} 
              onClick={() => setCurrentChannel(channel.name)}
              className={`w-full text-left p-2 rounded-lg text-sm transition-colors ${currentChannel === channel.name ? 'bg-indigo-600 text-white font-medium' : 'hover:bg-zinc-100 text-zinc-600'}`}
            >
              # {channel.name} {channel.isPrivate && '(🔒)'}
            </button>
          ))}
        </div>
        
        <div className="mt-4 p-3 bg-zinc-50 border border-zinc-200 rounded-lg space-y-2">
          <input 
            type="text" 
            value={newChannel}
            onChange={(e) => setNewChannel(e.target.value)}
            className="w-full p-2 border border-zinc-300 rounded-md text-xs"
            placeholder="Novo canal..."
          />
          <button onClick={handleAddChannel} className="w-full bg-zinc-800 hover:bg-zinc-900 text-white p-2 rounded-md text-xs flex items-center justify-center gap-1 transition-colors">
            <Plus className="w-3 h-3" /> Criar Canal
          </button>
        </div>
      </div>

      <div className="pt-4 border-t border-zinc-200">
        <h2 className="font-semibold mb-2 text-zinc-800 text-sm">Estado Geral</h2>
        <div className="space-y-3 text-xs text-zinc-600">
          <div>
            <h3 className="font-medium text-zinc-800 uppercase text-[10px]">Tarefas Ativas ({tasks.length})</h3>
            <ul className="list-disc pl-4 mt-1 space-y-1">
              {tasks.map(t => <li key={t.id} className="truncate">{t.title}</li>)}
            </ul>
          </div>
          <div>
             <h3 className="font-medium text-zinc-800 uppercase text-[10px]">Relatórios ({reports.length})</h3>
             <ul className="list-disc pl-4 mt-1 space-y-1">
              {reports.map((r, i) => <li key={i} className="truncate">{r}</li>)}
            </ul>
          </div>
        </div>
      </div>
    </aside>
  );
}
