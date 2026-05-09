import { Terminal, Code, Settings, Paperclip } from 'lucide-react';
import { Modal } from './ui/Modal';
import { Button } from './ui/Button';

interface ManualModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ManualModal({ isOpen, onClose }: ManualModalProps) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Manual de Instruções & APIs"
      description="Documentação para Agentes Multi-IA, NullClaw e Engine Analítico"
      maxWidth="4xl"
      footer={
        <Button variant="primary" onClick={onClose}>
          Entendi, fechar manual
        </Button>
      }
    >
      <div className="space-y-8">
        <section>
          <h3 className="text-lg font-bold text-zinc-900 flex items-center gap-2 mb-4">
            <Terminal className="w-5 h-5 text-indigo-600" aria-hidden="true" /> 1. Comandos Internos
          </h3>
          <p className="mb-4 text-sm">
            O Hub responde a comandos lógicos emitidos pelos agentes (no texto). Os agentes
            devem usar a sintaxe abaixo para manipular o estado da aplicação.
          </p>
          <div className="bg-zinc-900 rounded-xl p-4 text-sm text-zinc-300 font-mono shadow-inner border border-zinc-800 space-y-3">
            <CmdRow cmd="/criar_tarefa" args={'"Título" "Descrição" "Prazo"'} desc="Cria nova task no painel central." />
            <CmdRow cmd="/concluir_tarefa" args={'"ID"'} desc="Marca a tarefa do ID como concluída." />
            <CmdRow cmd="/remover_tarefa" args={'"ID"'} desc="Remove a tarefa pelo ID." />
            <CmdRow cmd="/analisar_dados" args={'{"key":"value"} "Categoria"'} desc="Salva JSON em cache categorizado." />
            <CmdRow cmd="/limpar_dados" args="" desc="Reseta dados analíticos temporários." />
            <CmdRow cmd="/gerar_relatorio" args={'"Conteúdo" "Formato"'} desc="Adiciona relatório consolidado." />
          </div>
        </section>

        <section>
          <h3 className="text-lg font-bold text-zinc-900 flex items-center gap-2 mb-4">
            <Code className="w-5 h-5 text-indigo-600" aria-hidden="true" /> 2. API Tools
          </h3>
          <p className="mb-4 text-sm">
            Toda ferramenta no backend pode ser chamada via{' '}
            <code className="bg-zinc-100 px-1 rounded">/use_tool nome {'{"args":...}'}</code>.
            O backend executa e retorna a saída JSON no feed.
          </p>
          <div className="bg-zinc-50 border border-zinc-200 rounded-xl p-4 shadow-sm">
            <p className="text-sm font-semibold mb-2">Tools com backend (Express + Ollama local):</p>
            <ul className="text-xs space-y-1.5 font-mono">
              <li><b className="text-indigo-600">get_current_time</b> {'{}'}</li>
              <li><b className="text-indigo-600">calculate_math</b> {'{ "expression": "2 + 2" }'}</li>
              <li><b className="text-indigo-600">store_memory</b> {'{ "key": "x", "value": "y" }'}</li>
              <li><b className="text-indigo-600">retrieve_memory</b> {'{ "key": "x" }'}</li>
              <li><b className="text-indigo-600">github_list_repos</b> e <b className="text-indigo-600">github_create_issue</b></li>
            </ul>
          </div>
        </section>

        <section>
          <h3 className="text-lg font-bold text-zinc-900 flex items-center gap-2 mb-4">
            <Code className="w-5 h-5 text-indigo-600" aria-hidden="true" /> 3. Quantum Analytical Engine (client-side)
          </h3>
          <p className="mb-4 text-sm">
            Cinco análises em TypeScript puro executando no navegador (funcionam no Vercel sem backend). Use o botão{' '}
            <Paperclip className="inline w-3 h-3 mx-1" aria-hidden="true" /> para carregar CSV/JSON;
            o dataset é guardado em <code className="bg-zinc-100 px-1 rounded">dataCache[arquivo]</code>.
          </p>
          <div className="bg-zinc-50 border border-zinc-200 rounded-xl p-4 shadow-sm space-y-3">
            <Tool name="analyze_descriptive" args='{ "data": <obj|array> }' desc="count, mean, std, min, p25, p50, p75, max por coluna." />
            <Tool name="analyze_predictive" args='{ "data": <obj|array>, "target_column": "y" }' desc="Regressão linear multivariada. target_column obrigatória." />
            <Tool name="detect_anomalies" args='{ "data": <obj|array> }' desc="z-score multivariado, |z| > 2.5." />
            <Tool name="optimize_linear" args="{}" desc="Programação linear (exemplo: min 2x+3y s.t. x+y≥10, x+2y≥15)." />
            <Tool name="recommend_stack" args="{}" desc="Stack tecnológica recomendada." />
          </div>
        </section>

        <section>
          <h3 className="text-lg font-bold text-zinc-900 flex items-center gap-2 mb-4">
            <Settings className="w-5 h-5 text-indigo-600" aria-hidden="true" /> 4. Gateway Externo (NullClaw)
          </h3>
          <p className="mb-4 text-sm">
            Webhook autenticado por <code className="bg-zinc-100 px-1 rounded">Bearer &lt;TOKEN&gt;</code>{' '}
            (código de pareamento). Payload:
          </p>
          <pre className="text-xs bg-zinc-900 text-zinc-300 p-3 rounded-lg font-mono overflow-x-auto">
{`{
  "message": "conteúdo da prompt",
  "history": [contextos],
  "agent_id": "identificador opcional"
}`}
          </pre>
        </section>
      </div>
    </Modal>
  );
}

function CmdRow({ cmd, args, desc }: { cmd: string; args: string; desc: string }) {
  return (
    <div>
      <span className="text-emerald-400 font-bold">{cmd}</span>
      {args && <> {args}</>}
      <p className="text-zinc-500 mt-1 ml-4 text-xs font-sans">{desc}</p>
    </div>
  );
}

function Tool({ name, args, desc }: { name: string; args: string; desc: string }) {
  return (
    <div>
      <code className="text-indigo-600 font-bold">{name}</code>{' '}
      <code className="text-zinc-700 text-xs">{args}</code>
      <p className="text-zinc-500 text-xs mt-1">{desc}</p>
    </div>
  );
}
