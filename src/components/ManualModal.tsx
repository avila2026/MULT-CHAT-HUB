import React from 'react';
import { X, BookOpen, Terminal, Code, Settings } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface ManualModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ManualModal({ isOpen, onClose }: ManualModalProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-zinc-900/40 backdrop-blur-sm z-40 transition-opacity"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[90vw] max-w-4xl max-h-[85vh] bg-white rounded-2xl shadow-2xl z-50 flex flex-col overflow-hidden border border-zinc-200"
          >
            <div className="flex items-center justify-between p-6 border-b border-zinc-200 bg-zinc-50">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-indigo-100 rounded-lg">
                  <BookOpen className="w-6 h-6 text-indigo-700" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-zinc-900">Manual de Instruções & APIs</h2>
                  <p className="text-sm text-zinc-500">Documentação para Agentes Multi-IA e NullClaw</p>
                </div>
              </div>
              <button 
                onClick={onClose}
                className="p-2 text-zinc-400 hover:bg-zinc-200 hover:text-zinc-600 rounded-full transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-8 text-zinc-700 space-y-8">
              <section>
                <h3 className="text-lg font-bold text-zinc-900 flex items-center gap-2 mb-4">
                  <Terminal className="w-5 h-5 text-indigo-600" /> 1. Overview de Comandos Internos
                </h3>
                <p className="mb-4">
                  O Hub ouve e responde ativamente a comandos lógicos gerados pelos agentes (via output do texto).
                  Os agentes deverão usar estes comandos de forma rigorosa na sintaxe proposta para manipular e modificar o estado da aplicação.
                </p>
                
                <div className="bg-zinc-900 rounded-xl p-4 text-sm text-zinc-300 font-mono shadow-inner border border-zinc-800">
                  <div className="mb-3">
                     <span className="text-emerald-400 font-bold">/criar_tarefa</span> "Título" "Descrição" "Prazo"
                     <p className="text-zinc-500 mt-1 ml-4 text-xs font-sans">Cria e acopla uma nova task no painel central do usuário.</p>
                  </div>
                  <div className="mb-3">
                     <span className="text-emerald-400 font-bold">/analisar_dados</span> {"{"}\"key\":\"value\"{"}"} "Categoria"
                     <p className="text-zinc-500 mt-1 ml-4 text-xs font-sans">Salva trechos valiosos JSON para uso em memória cache rápida.</p>
                  </div>
                  <div>
                     <span className="text-emerald-400 font-bold">/gerar_relatorio</span> "Conteudo finalizado em texto plano ou md" "Formato"
                     <p className="text-zinc-500 mt-1 ml-4 text-xs font-sans">Força um log report direto para o painel de relatórios consolidados.</p>
                  </div>
                </div>
              </section>

              <section>
                <h3 className="text-lg font-bold text-zinc-900 flex items-center gap-2 mb-4">
                  <Code className="w-5 h-5 text-indigo-600" /> 2. API Proxy Hub & Tools
                </h3>
                <p className="mb-4">
                   Toda ferramenta externa configurada no backend pode ser acionada remotamente pelos agentes utilizando o comando direto `use_tool`. O backend executa o código TS seguro e retorna a saída JSON no feed de conversa.
                </p>

                <div className="bg-zinc-50 border border-zinc-200 rounded-xl overflow-hidden mt-4 shadow-sm">
                  <div className="bg-zinc-200/50 p-3 font-mono text-xs border-b border-zinc-200 font-semibold text-zinc-700 flex justify-between">
                     <span>Acionamento de Tools</span>
                     <span className="px-2 py-0.5 bg-indigo-200 text-indigo-800 rounded">POST /api/tools/execute</span>
                  </div>
                  <div className="p-4">
                     <p className="text-sm font-semibold mb-2">Sintaxe de execução exigida para a LLM:</p>
                     <code className="block bg-zinc-900 text-zinc-300 p-3 rounded-lg text-sm font-mono whitespace-pre-wrap">
                       /use_tool nome_da_ferramenta {"{"}"param1": "valor"{"}"}
                     </code>
                     <p className="text-xs text-zinc-500 mt-3 pt-3 border-t border-zinc-200">Exemplo prático: <span className="font-mono text-zinc-700">/use_tool github_list_repos {"{"}"username": "zJeanx"{"}"}</span></p>
                  </div>
                </div>
              </section>

              <section>
                <h3 className="text-lg font-bold text-zinc-900 flex items-center gap-2 mb-4">
                  <Settings className="w-5 h-5 text-indigo-600" /> 3. Integração com Gateway Externo (NullClaw API)
                </h3>
                <p className="mb-4">
                  O NullClaw pode receber chamadas de eventos webhook padronizados baseados no `pairing code` de segurança, que autentica localmente chamadas locais ou com o servidor Zig.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                   <div className="bg-zinc-50 border border-zinc-200 p-4 rounded-xl shadow-sm">
                      <h4 className="font-bold text-indigo-900 text-sm mb-2 uppercase text-[10px]">Webhook Post Payload Requerido</h4>
                      <pre className="text-xs bg-white border border-zinc-200 p-2 rounded-lg text-zinc-600 font-mono">
{`{
  "message": "conteúdo da prompt",
  "history": [contextos],
  "agent_id": "identificador opcional"
}`}
                      </pre>
                   </div>
                   <div className="bg-zinc-50 border border-zinc-200 p-4 rounded-xl shadow-sm">
                      <h4 className="font-bold text-indigo-900 text-sm mb-2 uppercase text-[10px]">Autenticação</h4>
                      <p className="text-sm">
                        O Payload usa Authorization <code className="bg-white border rounded px-1">Bearer &lt;TOKEN&gt;</code> onde TOKEN é o código de pareamento configurado no painel de agentes. A injeção das Tools deve acontecer do lado do Zig caso chamadas de hardware e OS local sejam exigidas.
                      </p>
                   </div>
                </div>
              </section>
            </div>
            
            <div className="p-4 bg-zinc-50 border-t border-zinc-200 flex justify-end">
              <button 
                onClick={onClose}
                className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium transition-colors shadow-sm"
              >
                Entendi, fechar manual
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
