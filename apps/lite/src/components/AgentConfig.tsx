import { useContext, useState } from 'react';
import { Plus, Sparkles, Cpu, Key, Eye, EyeOff, UserPlus, X } from 'lucide-react';
import { ChatContext } from '../context/ChatContext';
import { Button } from './ui/Button';
import { Agent, ProviderName } from '../types';

const TECH_OPTIONS = [
  'OpenAI · GPT',
  'Claude · Anthropic',
  'Gemini · Google',
  'GitHub API',
  'Webhook HTTP',
  'Gateway Externo',
  'Engine Local · TS',
] as const;

type ProviderMeta = {
  id: ProviderName;
  label: string;
  short: string;
  description: string;
  accent: string;
  ring: string;
  dot: string;
  needsKey: boolean;
};

const PROVIDERS: ProviderMeta[] = [
  {
    id: 'openai',
    label: 'OpenAI',
    short: 'GPT',
    description: 'gpt-4o-mini, gpt-4o — chat geral e raciocínio.',
    accent: 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200',
    ring: 'ring-emerald-500/40',
    dot: 'bg-emerald-500',
    needsKey: true,
  },
  {
    id: 'anthropic',
    label: 'Claude',
    short: 'Anthropic',
    description: 'claude-haiku-4-5 — análise, segurança e textos longos.',
    accent: 'bg-orange-50 dark:bg-orange-950/40 border-orange-300 dark:border-orange-800 text-orange-900 dark:text-orange-200',
    ring: 'ring-orange-500/40',
    dot: 'bg-orange-500',
    needsKey: true,
  },
  {
    id: 'gemini',
    label: 'Gemini',
    short: 'Google',
    description: 'gemini-2.0-flash-lite — multimodal rápido do Google.',
    accent: 'bg-blue-50 dark:bg-blue-950/40 border-blue-300 dark:border-blue-800 text-blue-900 dark:text-blue-200',
    ring: 'ring-blue-500/40',
    dot: 'bg-blue-500',
    needsKey: true,
  },
  {
    id: 'openrouter',
    label: 'OpenRouter',
    short: 'Gateway',
    description: 'Roteador para dezenas de modelos pagos e gratuitos.',
    accent: 'bg-violet-50 dark:bg-violet-950/40 border-violet-300 dark:border-violet-800 text-violet-900 dark:text-violet-200',
    ring: 'ring-violet-500/40',
    dot: 'bg-violet-500',
    needsKey: true,
  },
  {
    id: 'ollama',
    label: 'Ollama',
    short: 'Local',
    description: 'Modelos rodando no seu PC (privacidade total, sem chave).',
    accent: 'bg-stone-100 dark:bg-stone-800 border-stone-300 dark:border-stone-700 text-stone-900 dark:text-stone-200',
    ring: 'ring-stone-500/40',
    dot: 'bg-stone-500',
    needsKey: false,
  },
];

// Mapeia o `provider` textual de cada agente para um rótulo + cor de marca
function techBadge(provider: string): { label: string; cls: string } {
  const p = provider.toLowerCase();
  if (p.includes('claude') || p.includes('anthropic')) {
    return { label: 'Claude · Anthropic', cls: 'bg-orange-100 text-orange-800 border-orange-200 dark:bg-orange-950/50 dark:text-orange-200 dark:border-orange-900' };
  }
  if (p.includes('openai') || p.includes('gpt')) {
    return { label: 'OpenAI · GPT', cls: 'bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-200 dark:border-emerald-900' };
  }
  if (p.includes('gemini') || p.includes('google')) {
    return { label: 'Gemini · Google', cls: 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-950/50 dark:text-blue-200 dark:border-blue-900' };
  }
  if (p.includes('github')) {
    return { label: 'GitHub API', cls: 'bg-zinc-900 text-zinc-50 border-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:border-zinc-200' };
  }
  if (p.includes('webhook')) {
    return { label: 'Webhook HTTP', cls: 'bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-950/50 dark:text-amber-200 dark:border-amber-900' };
  }
  if (p.includes('nullclaw') || p.includes('gateway')) {
    return { label: 'Gateway Externo', cls: 'bg-violet-100 text-violet-800 border-violet-200 dark:bg-violet-950/50 dark:text-violet-200 dark:border-violet-900' };
  }
  // Interno = engine local TypeScript (sem LLM direto)
  return { label: 'Engine Local · TS', cls: 'bg-stone-100 text-stone-700 border-stone-300 dark:bg-stone-800 dark:text-stone-300 dark:border-stone-700' };
}

export default function AgentConfig() {
  const ctx = useContext(ChatContext);
  const [searchTerm, setSearchTerm] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [creating, setCreating] = useState(false);
  const [draft, setDraft] = useState<{ name: string; specialty: string; description: string; provider: string; permissions: string; thinkingLevel: 'LOW' | 'HIGH' }>({
    name: '',
    specialty: '',
    description: '',
    provider: 'Engine Local · TS',
    permissions: 'tools',
    thinkingLevel: 'HIGH',
  });

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
    registerAgent,
  } = ctx;

  const canSubmit = draft.name.trim().length > 1 && draft.description.trim().length > 1;

  function submitDraft() {
    if (!canSubmit) return;
    const newAgent: Agent = {
      name: draft.name.trim(),
      specialty: draft.specialty.trim() || 'Personalizado',
      description: draft.description.trim(),
      permissions: draft.permissions.split(',').map((p) => p.trim()).filter(Boolean),
      provider: draft.provider,
      status: 'Ativo',
      thinkingLevel: draft.thinkingLevel,
      tools: [],
    };
    registerAgent(newAgent);
    setDraft({ name: '', specialty: '', description: '', provider: 'Engine Local · TS', permissions: 'tools', thinkingLevel: 'HIGH' });
    setCreating(false);
  }

  const currentProvider = PROVIDERS.find((p) => p.id === activeProvider) ?? PROVIDERS[0];
  const currentCfg = providerConfig[activeProvider];

  const filteredAgents = agents.filter(
    (a) =>
      a.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      a.specialty.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  return (
    <div className="flex-1 flex flex-col gap-6 p-4 overflow-y-auto bg-stone-50/60 dark:bg-zinc-900">
      {/* ── LLM da Conversa ─────────────────────────────────────────────── */}
      <section aria-labelledby="llm-heading">
        <div className="flex items-center gap-2 mb-1">
          <Sparkles className="w-4 h-4 text-orange-500" />
          <h2 id="llm-heading" className="font-serif text-base font-semibold text-stone-900 dark:text-stone-100 tracking-tight">
            LLM da Conversa
          </h2>
        </div>
        <p className="text-xs text-stone-600 dark:text-stone-400 mb-3 leading-relaxed">
          Modelo que responde quando você envia uma mensagem no chat. Cada agente acima usa esta escolha.
        </p>

        <div className="grid grid-cols-2 gap-2 mb-3">
          {PROVIDERS.map((p) => {
            const isActive = p.id === activeProvider;
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => setActiveProvider(p.id)}
                aria-pressed={isActive}
                title={p.description}
                className={`group relative text-left p-2.5 rounded-lg border transition-all min-h-[44px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-orange-500 ${
                  isActive
                    ? `${p.accent} ring-2 ${p.ring} shadow-sm`
                    : 'border-stone-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 hover:border-stone-300 dark:hover:border-zinc-600'
                }`}
              >
                <div className="flex items-center gap-1.5">
                  <span className={`w-1.5 h-1.5 rounded-full ${p.dot}`} aria-hidden />
                  <span className="text-sm font-semibold tracking-tight">{p.label}</span>
                </div>
                <div className="text-[10px] uppercase tracking-wide mt-0.5 opacity-70">{p.short}</div>
              </button>
            );
          })}
        </div>

        {/* Descrição do provedor selecionado */}
        <div className="text-xs text-stone-600 dark:text-stone-400 italic mb-3 px-1 leading-relaxed">
          {currentProvider.description}
        </div>

        {/* Campo de chave API (se necessário) */}
        {currentProvider.needsKey && (
          <div className="space-y-2 bg-white dark:bg-zinc-800 border border-stone-200 dark:border-zinc-700 rounded-lg p-3">
            <label htmlFor="api-key" className="flex items-center gap-1.5 text-[10px] font-bold text-stone-600 dark:text-stone-400 uppercase tracking-wide">
              <Key className="w-3 h-3" />
              Chave {currentProvider.label}
              {currentCfg.apiKey && (
                <span className="ml-auto text-emerald-600 dark:text-emerald-400 normal-case font-medium">● conectado</span>
              )}
            </label>
            <div className="relative">
              <input
                id="api-key"
                type={showKey ? 'text' : 'password'}
                value={currentCfg.apiKey}
                onChange={(e) => updateProviderConfig(activeProvider, { apiKey: e.target.value })}
                placeholder={currentCfg.apiKey ? '••••••••••••' : `Cole sua chave ${currentProvider.label}…`}
                className="w-full h-9 pl-3 pr-9 border border-stone-300 dark:border-zinc-600 rounded-md text-sm bg-stone-50 dark:bg-zinc-900 text-stone-900 dark:text-stone-100 placeholder:text-stone-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500"
                autoComplete="off"
                spellCheck={false}
              />
              <button
                type="button"
                onClick={() => setShowKey((s) => !s)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-700 dark:hover:text-stone-200"
                aria-label={showKey ? 'Ocultar chave' : 'Mostrar chave'}
              >
                {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <p className="text-[10px] text-stone-500 dark:text-stone-500 leading-relaxed">
              Vazio = usa a chave do <code className="font-mono">.env.local</code> no servidor.
            </p>
          </div>
        )}

        <div className="mt-2 text-[10px] text-stone-500 dark:text-stone-500 px-1">
          Modelo: <span className="font-mono text-stone-700 dark:text-stone-300">{currentCfg.model}</span>
        </div>
      </section>

      <div className="border-t border-stone-200 dark:border-zinc-800" />

      {/* ── Agentes ─────────────────────────────────────────────────────── */}
      <section aria-labelledby="agents-heading">
        <div className="flex items-center justify-between gap-2 mb-1">
          <div className="flex items-center gap-2">
            <Cpu className="w-4 h-4 text-stone-500" />
            <h2 id="agents-heading" className="font-serif text-base font-semibold text-stone-900 dark:text-stone-100 tracking-tight">
              Agentes Disponíveis
            </h2>
          </div>
          <button
            type="button"
            onClick={() => setCreating((c) => !c)}
            className="inline-flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-md border border-orange-300 dark:border-orange-800 bg-orange-50 dark:bg-orange-950/40 text-orange-800 dark:text-orange-200 hover:bg-orange-100 dark:hover:bg-orange-900/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500"
          >
            {creating ? <X className="w-3.5 h-3.5" /> : <UserPlus className="w-3.5 h-3.5" />}
            {creating ? 'Cancelar' : 'Novo'}
          </button>
        </div>
        <p className="text-xs text-stone-600 dark:text-stone-400 mb-3 leading-relaxed">
          Cada agente é especializado em um domínio. O badge mostra a tecnologia que ele aciona internamente.
        </p>

        {creating && (
          <div className="mb-3 p-3 rounded-xl border border-orange-300 dark:border-orange-800 bg-orange-50/60 dark:bg-orange-950/20 space-y-2.5">
            <div className="font-serif font-semibold text-sm text-stone-900 dark:text-stone-100">Criar novo agente</div>
            <input
              type="text"
              value={draft.name}
              onChange={(e) => setDraft({ ...draft, name: e.target.value })}
              placeholder="Nome (ex: Agente de Vendas)"
              className="w-full h-9 px-2 border border-stone-300 dark:border-zinc-600 rounded-md text-sm bg-white dark:bg-zinc-900 text-stone-900 dark:text-stone-100 placeholder:text-stone-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500"
            />
            <input
              type="text"
              value={draft.specialty}
              onChange={(e) => setDraft({ ...draft, specialty: e.target.value })}
              placeholder="Especialidade (ex: Análise de CRM)"
              className="w-full h-9 px-2 border border-stone-300 dark:border-zinc-600 rounded-md text-sm bg-white dark:bg-zinc-900 text-stone-900 dark:text-stone-100 placeholder:text-stone-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500"
            />
            <textarea
              value={draft.description}
              onChange={(e) => setDraft({ ...draft, description: e.target.value })}
              placeholder="Descrição: o que esse agente faz, quando acioná-lo, exemplos de uso…"
              rows={3}
              className="w-full px-2 py-1.5 border border-stone-300 dark:border-zinc-600 rounded-md text-sm bg-white dark:bg-zinc-900 text-stone-900 dark:text-stone-100 placeholder:text-stone-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 leading-relaxed"
            />
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] font-bold text-stone-600 dark:text-stone-400 uppercase tracking-wide">Tecnologia</label>
                <select
                  value={draft.provider}
                  onChange={(e) => setDraft({ ...draft, provider: e.target.value })}
                  className="w-full mt-1 h-9 px-2 border border-stone-300 dark:border-zinc-600 rounded-md text-sm bg-white dark:bg-zinc-900 text-stone-900 dark:text-stone-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500"
                >
                  {TECH_OPTIONS.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label className="text-[10px] font-bold text-stone-600 dark:text-stone-400 uppercase tracking-wide">Raciocínio</label>
                <select
                  value={draft.thinkingLevel}
                  onChange={(e) => setDraft({ ...draft, thinkingLevel: e.target.value as 'LOW' | 'HIGH' })}
                  className="w-full mt-1 h-9 px-2 border border-stone-300 dark:border-zinc-600 rounded-md text-sm bg-white dark:bg-zinc-900 text-stone-900 dark:text-stone-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500"
                >
                  <option value="HIGH">Alto (2048 tokens)</option>
                  <option value="LOW">Baixo (512 tokens)</option>
                </select>
              </div>
            </div>
            <input
              type="text"
              value={draft.permissions}
              onChange={(e) => setDraft({ ...draft, permissions: e.target.value })}
              placeholder="Permissões (separadas por vírgula): tools, data_read, reports…"
              className="w-full h-9 px-2 border border-stone-300 dark:border-zinc-600 rounded-md text-sm bg-white dark:bg-zinc-900 text-stone-900 dark:text-stone-100 placeholder:text-stone-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 font-mono"
            />
            <Button
              variant="primary"
              icon={<Plus className="w-4 h-4" />}
              onClick={submitDraft}
              disabled={!canSubmit}
              fullWidth
              className="bg-orange-600 hover:bg-orange-700 active:bg-orange-800 focus-visible:ring-orange-500"
            >
              Adicionar agente
            </Button>
          </div>
        )}

        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full h-9 px-3 mb-3 border border-stone-300 dark:border-zinc-700 rounded-md text-sm bg-white dark:bg-zinc-800 text-stone-900 dark:text-stone-100 placeholder:text-stone-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500"
          placeholder="Pesquisar agentes…"
          aria-label="Pesquisar agentes"
        />

        <ul className="space-y-2.5" role="list">
          {filteredAgents.length === 0 ? (
            <li className="text-xs text-stone-500 italic">Nenhum agente encontrado.</li>
          ) : (
            filteredAgents.map((agent) => {
              const index = agents.findIndex((a) => a.name === agent.name);
              const isActive = activeAgentIndex === index;
              const badge = techBadge(agent.provider);
              return (
                <li key={agent.name}>
                  <button
                    onClick={() => setActiveAgentIndex(isActive ? null : index)}
                    aria-pressed={isActive}
                    className={`w-full text-left p-3 rounded-xl border transition-all min-h-[44px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-orange-500 ${
                      isActive
                        ? 'border-orange-400 bg-orange-50/70 dark:bg-orange-950/30 shadow-sm ring-1 ring-orange-300/50'
                        : 'border-stone-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 hover:border-stone-300 dark:hover:border-zinc-600'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2 mb-1.5">
                      <div className="min-w-0 flex-1">
                        <div className="font-serif font-semibold text-sm text-stone-900 dark:text-stone-100 truncate leading-tight">
                          {agent.name}
                        </div>
                        <div className="text-[11px] text-stone-500 dark:text-stone-400 mt-0.5 truncate">
                          {agent.specialty}
                        </div>
                      </div>
                      {isActive && (
                        <span className="bg-orange-500 text-white text-[9px] px-2 py-0.5 rounded-full font-bold tracking-wider shrink-0">
                          ATIVO
                        </span>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-1.5 mb-2">
                      <span className={`inline-flex items-center text-[10px] px-2 py-0.5 rounded-md border font-medium ${badge.cls}`}>
                        {badge.label}
                      </span>
                      <span className={`inline-flex items-center text-[10px] px-1.5 py-0.5 rounded-md font-medium ${
                        agent.status === 'Ativo' || agent.status === 'Online'
                          ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300'
                          : 'bg-stone-200 text-stone-600 dark:bg-zinc-700 dark:text-stone-400'
                      }`}>
                        <span className={`w-1 h-1 rounded-full mr-1 ${
                          agent.status === 'Ativo' || agent.status === 'Online' ? 'bg-emerald-500' : 'bg-stone-400'
                        }`} />
                        {agent.status}
                      </span>
                    </div>

                    <div className="text-xs text-stone-600 dark:text-stone-300 leading-relaxed mb-2">
                      {agent.description}
                    </div>

                    {agent.permissions.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {agent.permissions.map((p, idx) => (
                          <span
                            key={idx}
                            className="bg-stone-100 dark:bg-zinc-700 text-stone-600 dark:text-stone-300 text-[9px] px-1.5 py-0.5 rounded font-mono"
                          >
                            {p}
                          </span>
                        ))}
                      </div>
                    )}
                  </button>
                </li>
              );
            })
          )}
        </ul>
      </section>

      <div className="border-t border-stone-200 dark:border-zinc-800" />

      {/* ── Gateway Externo ─────────────────────────────────────────────── */}
      <section aria-labelledby="gateway-heading">
        <h2 id="gateway-heading" className="font-serif text-base font-semibold text-stone-900 dark:text-stone-100 tracking-tight mb-1">
          Gateway Externo
        </h2>
        <p className="text-xs text-stone-600 dark:text-stone-400 mb-3 leading-relaxed">
          Conecte um motor NullClaw ou serviço próprio rodando em outra máquina.
        </p>
        <div className="space-y-3 bg-white dark:bg-zinc-800 border border-stone-200 dark:border-zinc-700 p-3 rounded-xl">
          <div>
            <label htmlFor="gateway-url" className="text-[10px] font-bold text-stone-600 dark:text-stone-400 uppercase tracking-wide">
              URL do Gateway
            </label>
            <input
              id="gateway-url"
              type="text"
              value={externalAgentURL}
              onChange={(e) => setExternalAgentURL(e.target.value)}
              className="w-full mt-1 h-9 px-2 border border-stone-300 dark:border-zinc-600 rounded-md text-sm bg-stone-50 dark:bg-zinc-900 text-stone-900 dark:text-stone-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500"
              placeholder="http://127.0.0.1:3000"
            />
          </div>
          <div>
            <label htmlFor="pairing-code" className="text-[10px] font-bold text-stone-600 dark:text-stone-400 uppercase tracking-wide">
              Código de Pareamento
            </label>
            <input
              id="pairing-code"
              type="password"
              value={pairingCode}
              onChange={(e) => setPairingCode(e.target.value)}
              className="w-full mt-1 h-9 px-2 border border-stone-300 dark:border-zinc-600 rounded-md text-sm bg-stone-50 dark:bg-zinc-900 text-stone-900 dark:text-stone-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500"
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
            className="bg-orange-600 hover:bg-orange-700 active:bg-orange-800 focus-visible:ring-orange-500"
          >
            Conectar
          </Button>
        </div>
      </section>
    </div>
  );
}
