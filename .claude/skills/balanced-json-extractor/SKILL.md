---
name: balanced-json-extractor
description: Use quando precisar extrair um objeto JSON balanceado de uma string mista (ex: output de LLM contendo "/use_tool foo {\"data\":{\"x\":[1,2]}}"), respeitando JSON aninhado, strings escapadas e contagem de chaves.
allowed-tools: Read, Write, Edit
---

# balanced-json-extractor

Extrai a primeira ocorrência de um objeto JSON balanceado a partir de um índice em uma string. Alternativa segura ao regex ingênuo `\{[^}]+\}` que falha com JSON aninhado.

## API

```ts
function extractBalancedJson(
  text: string,
  start: number
): { json: string; end: number } | null;
```

- `text` — string completa.
- `start` — índice onde o `{` deve estar. Se `text[start] !== '{'` retorna `null`.
- Retorno: `{json}` é a substring contendo o JSON (com chaves), `end` é o índice **logo após** o `}` de fechamento. `null` se chaves desbalanceadas.

## Source

```ts
// balanced-json-extractor.ts
export function extractBalancedJson(
  text: string,
  start: number,
): { json: string; end: number } | null {
  if (text[start] !== '{') return null;
  let depth = 0;
  let inStr = false;
  let escape = false;
  for (let i = start; i < text.length; i++) {
    const c = text[i];
    if (escape) { escape = false; continue; }
    if (c === '\\') { escape = true; continue; }
    if (c === '"') { inStr = !inStr; continue; }
    if (inStr) continue;
    if (c === '{') depth++;
    else if (c === '}') {
      depth--;
      if (depth === 0) return { json: text.slice(start, i + 1), end: i + 1 };
    }
  }
  return null;
}
```

## Adaptation hints

- **Não valida JSON**: a função apenas conta chaves e respeita strings/escapes. Para validar use `JSON.parse(extracted.json)` em try/catch.
- **Suporte a `[]`**: para arrays JSON balanceados (`{ … } [ … ]`), generalize: aceitar `start` apontando para `{` ou `[`, contar ambos os pares e empilhar fechamento esperado. Cabe ~20 linhas extras.
- **Múltiplos JSONs**: chame em loop incrementando `start = result.end` até não achar mais.
- **Performance**: O(n) sobre `text.length - start`. Para textos > 10MB, considerar parser streaming.

## Example

Caso típico: parser de comandos slash de LLM com JSON aninhado.

```ts
const text = 'Resposta /use_tool analyze_predictive {"data":{"x":[1,2,3]},"target_column":"y"}';
const match = text.match(/\/use_tool\s+([a-zA-Z_0-9]+)\s+/);
if (match && match.index !== undefined) {
  const jsonStart = match.index + match[0].length;
  const extracted = extractBalancedJson(text, jsonStart);
  if (extracted) {
    const args = JSON.parse(extracted.json);
    // args = { data: { x: [1,2,3] }, target_column: 'y' }
  }
}
```

## Origin

Extraída de [`src/context/ChatContext.tsx`](https://github.com/avila2026/MULT-CHAT-HUB/blob/main/src/context/ChatContext.tsx), função `extractBalancedJson`.
