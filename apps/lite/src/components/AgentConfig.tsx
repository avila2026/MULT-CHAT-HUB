import { useContext, useState } from 'react';
import { Plus } from 'lucide-react';
import { ChatContext } from '../context/ChatContext';
import { Button } from './ui/Button';
import type { ProviderName } from '../types';

const PROVIDER_LABELS: Record<ProviderName, string> = {
  ollama:     'Ollama',
  openai:     'OpenAI',
  anthropic:  'Anthropic',
  gemini:     'Gemini',
  openrouter: 'OpenRouter',
};

const PROVIDER_ORDER: ProviderName[] = ['ollama', 'openai', 'anthropic', 'gemini', 'openrouter'];

const NEEDS_API_KEY: Record<ProviderName, boolean> = {
  ollama: false,
  openai: true,
  anthropic: true,
  gemini: true,
  openrouter: true,
};

export default function AgentConfig() {
  const ctx = useContext(ChatContext);
  if (!ctx) return null;

  const {
    agents,
    activeAgentIndex,
    setActiveAgentIndex,
    externalAgentURL,
    setExternalAgentURL,
    pairingCode,
    setPairingCode,
    connectExternalAgent,
    activeProvider,
    setActiveProvider,
    providerConfig,
    updateProviderConfig,
  } = ctx;
  const [searchTerm, setSearchTerm] = useState('');

  const filteredAgents = agents.filter(
    (a) =>
      a.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      a.specialty.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  const cfg = providerConfig[activeProvider];

  return (
    <div className="flex-1 flex flex-col gap-6 p-4 overflow-y-auto">
      <section aria-labelledby="agents-heading">
        <h2 id="agents-heading" className="font-semibold mb-3 text-zinc-800 dark:text-zinc-200">Agentes Disponíveis</h2>
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full h-10 px-3 mb-3 border border-zinc-300 dark:border-zinc-700 rounded-md text-sm bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-indigo-500"
          placeholder="Pesquisar agentes…"
          aria-label="Pesquisar agentes"
        />

        <ul className="space-y-3" role="list">
          {filteredAgents.length === 0 ? (
            <li className="text-xs text-zinc-500 dark:text-zinc-400 italic">Nenhum agente encontrado.</li>
          ) : (
            filteredAgents.map((agent) => {
              const index = agents.findIndex((a) => a.name === agent.name);
              const isActive = activeAgentIndex === index;
              return (
                <li key={agent.name}>
                  <button
                    onClick={() => setActiveAgentIndex(isActive ? null : index)}
                    aria-pressed={isActive}
                    className={`w-full text-left p-3 rounded-xl border-2 transition-all min-h-[44px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-indigo-500 ${
                      isActive
                        ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-950 shadow-sm'
                        : 'border-zinc-200 dark:border-zinc-700 hover:border-zinc-300 dark:hover:border-zinc-600 hover:bg-zinc-50 dark:hover:bg-zinc-800'
                    }`}
                  >
                    <div className="flex justify-between items-center mb-1 gap-2">
                      <span className="font-semibold text-sm text-zinc-900 dark:text-zinc-100 truncate">{agent.name}</span>
                      {isActive && (
                        <span className="bg-indigo-600 text-white text-[10px] px-2 py-0.5 rounded-full font-bold shadow-sm shrink-0">
                          ATIVO
                        </span>
                      )}
                    </div>
                    <div className="text-[10px] text-zinc-500 dark:text-zinc-400 mb-1 uppercase font-semibold">
                      {agent.provider} · {agent.status}
                    </div>
                    <div className="text-xs text-zinc-600 dark:text-zinc-400 mb-2 leading-relaxed">{agent.description}</div>
                    <div className="flex flex-wrap gap-1">
                      {agent.permissions.map((p, idx) => (
                        <span
                          key={idx}
                          className="bg-zinc-200 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-300 text-[9px] px-1.5 py-0.5 rounded font-medium"
                        >
                          {p}
                        </span>
                      ))}
                    </div>
                  </button>
                </li>
              );
            })
          )}
        </ul>
      </section>

      {/* ── Provedor LLM ─────────────────────────────────────────────────── */}
      <section className="pt-4 border-t border-zinc-200 dark:border-zinc-800" aria-labelledby="provider-heading">
        <h2 id="provider-heading" className="font-semibold mb-3 text-zinc-800 dark:text-zinc-200 text-sm">Provedor LLM</h2>
        <div className="space-y-3 bg-zinc-50 dark:bg-zinc-800 p-3 rounded-xl border border-zinc-200 dark:border-zinc-700">
          <div className="flex flex-wrap gap-1.5" role="group" aria-label="Selecionar provedor LLM">
            {PROVIDER_ORDER.map((p) => (
              <Button
                key={p}
                variant={activeProvider === p ? 'primary' : 'ghost'}
                size="sm"
                onClick={() => setActiveProvider(p)}
                aria-pressed={activeProvider === p}
              >
                {PROVIDER_LABELS[p]}
              </Button>
            ))}
          </div>

          <div>
            <label
              htmlFor="provider-model"
              className="text-[10px] font-bold text-zinc-500 dark:text-zinc-400 uppercase"
            >
              Modelo
            </label>
            <input
              id="provider-model"
              type="text"
              value={cfg.model}
              onChange={(e) => updateProviderConfig(activeProvider, { model: e.target.value })}
              className="w-full mt-1 h-10 px-2 border border-zinc-300 dark:border-zinc-600 rounded-lg text-sm bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
              placeholder="nome-do-modelo"
              aria-label="Modelo do provedor LLM"
            />
          </div>

          {NEEDS_API_KEY[activeProvider] && (
            <div>
              <label
                htmlFor="provider-apikey"
                className="text-[10px] font-bold text-zinc-500 dark:text-zinc-400 uppercase"
              >
                API Key
              </label>
              <input
                id="provider-apikey"
                type="password"
                value={cfg.apiKey}
                onChange={(e) => updateProviderConfig(activeProvider, { apiKey: e.target.value })}
                className="w-full mt-1 h-10 px-2 border border-zinc-300 dark:border-zinc-600 rounded-lg text-sm bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                placeholder="sk-••••••••"
                autoComplete="off"
                aria-label={`Chave de API para ${PROVIDER_LABELS[activeProvider]}`}
              />
              {!cfg.apiKey && (
                <p className="mt-1 text-[10px] text-amber-600 dark:text-amber-400">
                  Chave necessária para usar {PROVIDER_LABELS[activeProvider]}.
                </p>
              )}
            </div>
          )}

          {activeProvider === 'ollama' && (
            <p className="text-[10px] text-zinc-500 dark:text-zinc-400">
              Ollama não requer chave. Certifique-se de que <span className="font-mono">ollama serve</span> está rodando.
            </p>
          )}
        </div>
      </section>

      {/* ── Gateway Externo ───────────────────────────────────────────────── */}
      <section className="pt-4 border-t border-zinc-200 dark:border-zinc-800" aria-labelledby="gateway-heading">
        <h2 id="gateway-heading" className="font-semibold mb-3 text-zinc-800 dark:text-zinc-200 text-sm">Conectar Gateway Externo</h2>
        <div className="space-y-3 bg-zinc-50 dark:bg-zinc-800 p-3 rounded-xl border border-zinc-200 dark:border-zinc-700">
          <div>
            <label htmlFor="gateway-url" className="text-[10px] font-bold text-zinc-500 dark:text-zinc-400 uppercase">
              URL do Gateway
            </label>
            <input
              id="gateway-url"
              type="text"
              value={externalAgentURL}
              onChange={(e) => setExternalAgentURL(e.target.value)}
              className="w-full mt-1 h-10 px-2 border border-zinc-300 dark:border-zinc-600 rounded-lg text-sm bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
              placeholder="http://127.0.0.1:3000"
            />
          </div>
          <div>
            <label htmlFor="pairing-code" className="text-[10px] font-bold text-zinc-500 dark:text-zinc-400 uppercase">
              Código de Pareamento
            </label>
            <input
              id="pairing-code"
              type="password"
              value={pairingCode}
              onChange={(e) => setPairingCode(e.target.value)}
              className="w-full mt-1 h-10 px-2 border border-zinc-300 dark:border-zinc-600 rounded-lg text-sm bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
              placeholder="••••••"
              autoComplete="off"
            />
          </div>
          <Button
            variant="primary"
            icon={<Plus className="w-4 h-4" />}
            onClick={connectExternalAgent}
            disabled={!externalAgentURL.trim() || !pairingCode.trim()}
            fullWidth
            className="bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 focus-visible:ring-emerald-500"
          >
            Conectar
          </Button>
        </div>
      </section>
    </div>
  );
}
