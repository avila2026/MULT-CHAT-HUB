---
name: slash-command-parser
description: Use quando construir um chatbot/CLI web onde o LLM (ou o usuário) emite comandos prefixados com `/` (ex: `/criar_tarefa "X" "Y"`, `/use_tool foo {json}`) e o app precisa interpretá-los e executar handlers correspondentes.
allowed-tools: Read, Write, Edit
---

# slash-command-parser

Sistema de parser + dispatcher de comandos slash em chats LLM. Detecta padrões como `/<nome> <args>` em respostas textuais do modelo e roteia para handlers registrados.

Suporta 3 formatos de argumentos:
1. **Strings entre aspas** — `/criar_tarefa "Título" "Desc" "Prazo"` → `["Título", "Desc", "Prazo"]`
2. **JSON balanceado** — `/use_tool nome {"data": {...}}` → `{ data: {...} }` (depende da skill `balanced-json-extractor`)
3. **Sem args** — `/limpar_dados` → `[]`

## API

```ts
type Handler<TArgs = any> = (args: TArgs, raw: string) => Promise<void> | void;

type CommandPattern =
  | { type: 'no-args'; name: string }
  | { type: 'strings'; name: string; arity: number }
  | { type: 'json'; name: string };

class SlashCommandRouter {
  register(pattern: CommandPattern, handler: Handler): void;
  /** Detecta TODOS os comandos no texto e dispara handlers em ordem. */
  dispatch(text: string): Promise<void>;
}
```

## Source

```ts
// slash-command-parser.ts
import { extractBalancedJson } from './balanced-json-extractor';

export type Handler<T = any> = (args: T, raw: string) => Promise<void> | void;

export type CommandPattern =
  | { type: 'no-args'; name: string }
  | { type: 'strings'; name: string; arity: number }
  | { type: 'json'; name: string };

export class SlashCommandRouter {
  private handlers = new Map<string, { pattern: CommandPattern; fn: Handler }>();

  register(pattern: CommandPattern, fn: Handler) {
    this.handlers.set(pattern.name, { pattern, fn });
  }

  async dispatch(text: string): Promise<void> {
    for (const [name, { pattern, fn }] of this.handlers) {
      if (!text.includes(`/${name}`)) continue;
      try {
        if (pattern.type === 'no-args') {
          await fn([], `/${name}`);
        } else if (pattern.type === 'strings') {
          // ex: /criar_tarefa "a" "b" "c" — captura `arity` strings
          const quoted = '\\s+"([^"]+)"'.repeat(pattern.arity);
          const re = new RegExp(`/${name}${quoted}`);
          const m = text.match(re);
          if (m) await fn(m.slice(1), m[0]);
        } else if (pattern.type === 'json') {
          const re = new RegExp(`/${name}\\s+`);
          const m = re.exec(text);
          if (m && m.index !== undefined) {
            const start = m.index + m[0].length;
            const extracted = extractBalancedJson(text, start);
            if (extracted) {
              const args = JSON.parse(extracted.json);
              await fn(args, text.slice(m.index, extracted.end));
            }
          }
        }
      } catch (err) {
        console.error(`[SlashCommandRouter] handler "${name}" falhou:`, err);
      }
    }
  }
}
```

## Uso

```ts
import { SlashCommandRouter } from './slash-command-parser';

const router = new SlashCommandRouter();

router.register(
  { type: 'strings', name: 'criar_tarefa', arity: 3 },
  async ([titulo, desc, prazo]) => {
    addTask({ titulo, desc, prazo });
  }
);

router.register(
  { type: 'json', name: 'use_tool' },
  async (args) => {
    const { toolName, ...rest } = args;
    await fetch('/api/tools/execute', {
      method: 'POST',
      body: JSON.stringify({ toolName, args: rest }),
    });
  }
);

router.register(
  { type: 'no-args', name: 'limpar_dados' },
  () => clearCache()
);

// Em algum lugar onde chega a resposta do LLM:
await router.dispatch(llmResponseText);
```

## Adaptation hints

- **Encoded args (URL/base64)**: adicionar pattern `type: 'encoded'` com decoder customizável.
- **Múltiplas chamadas do mesmo comando**: o `dispatch` atual chama 1× por comando. Para suportar várias instâncias do mesmo comando no texto, trocar `text.match` por `matchAll` + loop.
- **Validação de schema**: integrar `zod` no `register` para validar `args` antes de chamar `fn`.
- **Logging/telemetry**: envolver `await fn(...)` em wrapper de timing/erro.
- **Help auto-gerado**: iterar `handlers` e gerar uma tabela markdown a partir dos `pattern.name` + descrição opcional.

## Dependências

- Skill [`balanced-json-extractor`](../balanced-json-extractor/SKILL.md) para `type: 'json'`. Copie ambos os arquivos em projetos que usem comandos com payload JSON.

## Origin

Extraída de [`src/context/ChatContext.tsx`](https://github.com/avila2026/MULT-CHAT-HUB/blob/main/src/context/ChatContext.tsx), função `processCommands` (~110 linhas). Refactor moderado: parser puro separado de side effects (state setters do React), tornando-o reutilizável em outros frameworks (Vue, Solid, Node CLI).
