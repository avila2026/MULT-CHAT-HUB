import { useContext, useState } from 'react';
import { Plus } from 'lucide-react';
import { ChatContext } from '../context/ChatContext';
import { Button } from './ui/Button';

export default function Sidebar() {
  const ctx = useContext(ChatContext);
  if (!ctx) return null;

  const { channels, currentChannel, setCurrentChannel, addChannel, tasks, reports } = ctx;
  const [newChannel, setNewChannel] = useState('');

  const handleAddChannel = () => {
    const name = newChannel.trim();
    if (!name || channels.find((c) => c.name === name)) return;
    addChannel({ name, members: [], isPrivate: false });
    setNewChannel('');
  };

  return (
    <div className="flex-1 flex flex-col gap-6 p-4 overflow-y-auto">
      <section aria-labelledby="channels-heading">
        <h2 id="channels-heading" className="font-semibold mb-3 text-zinc-800">Canais</h2>
        {channels.length === 0 ? (
          <p className="text-xs text-zinc-500 italic">Nenhum canal. Crie um abaixo.</p>
        ) : (
          <ul className="space-y-1" role="list">
            {channels.map((channel) => {
              const isActive = currentChannel === channel.name;
              return (
                <li key={channel.name}>
                  <button
                    onClick={() => setCurrentChannel(channel.name)}
                    aria-current={isActive ? 'page' : undefined}
                    className={`w-full text-left h-11 px-3 rounded-lg text-sm transition-colors min-w-[44px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-indigo-500 ${
                      isActive
                        ? 'bg-indigo-600 text-white font-medium'
                        : 'hover:bg-zinc-100 text-zinc-700'
                    }`}
                  >
                    # {channel.name} {channel.isPrivate && <span aria-label="canal privado">🔒</span>}
                  </button>
                </li>
              );
            })}
          </ul>
        )}

        <div className="mt-4 p-3 bg-zinc-50 border border-zinc-200 rounded-lg space-y-2">
          <label className="text-[10px] font-bold text-zinc-500 uppercase block">Novo canal</label>
          <input
            type="text"
            value={newChannel}
            onChange={(e) => setNewChannel(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAddChannel()}
            className="w-full h-10 px-2 border border-zinc-300 rounded-md text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
            placeholder="ex: marketing"
            aria-label="Nome do novo canal"
          />
          <Button
            variant="primary"
            size="sm"
            icon={<Plus className="w-3 h-3" />}
            onClick={handleAddChannel}
            disabled={!newChannel.trim()}
            fullWidth
          >
            Criar Canal
          </Button>
        </div>
      </section>

      <section aria-labelledby="state-heading" className="pt-4 border-t border-zinc-200">
        <h2 id="state-heading" className="font-semibold mb-3 text-zinc-800 text-sm">Estado Geral</h2>
        <div className="space-y-3 text-xs text-zinc-600">
          <div>
            <h3 className="font-medium text-zinc-800 uppercase text-[10px] mb-1">
              Tarefas Ativas ({tasks.length})
            </h3>
            {tasks.length === 0 ? (
              <p className="text-zinc-400 italic">Nenhuma tarefa.</p>
            ) : (
              <ul className="list-disc pl-4 space-y-1" role="list">
                {tasks.map((t) => (
                  <li key={t.id} className="truncate">
                    {t.title}
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div>
            <h3 className="font-medium text-zinc-800 uppercase text-[10px] mb-1">
              Relatórios ({reports.length})
            </h3>
            {reports.length === 0 ? (
              <p className="text-zinc-400 italic">Nenhum relatório gerado.</p>
            ) : (
              <ul className="list-disc pl-4 space-y-1" role="list">
                {reports.map((r, i) => (
                  <li key={i} className="truncate">
                    {r.split('\n')[0]}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
