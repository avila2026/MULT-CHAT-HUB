---
name: csv-numeric-parser
description: Use quando precisar parsear CSV simples para formato colunar numérico (Record<string, number[]>) sem dependências externas — ideal para upload de datasets em apps de análise.
allowed-tools: Read, Write, Edit
---

# csv-numeric-parser

Parser CSV inline (~30 linhas) que converte texto CSV em formato colunar numérico, descartando colunas que não contenham nenhum valor numérico. Substitui dependências como `papaparse` quando o caso de uso é apenas dados tabulares numéricos.

## API

```ts
function parseCsv(text: string): Record<string, number[]>;
function splitCsvLine(line: string): string[];
```

- `parseCsv` lança se o CSV está vazio, só tem cabeçalho ou não tem nenhuma coluna numérica.
- Retorno: `{ col1: [n1, n2, ...], col2: [...] }`. Valores não-numéricos viram `NaN` (e a coluna é mantida se ao menos 1 valor for `Number.isFinite`).

## Source

```ts
// csv-numeric-parser.ts
export function parseCsv(text: string): Record<string, number[]> {
  const lines = text
    .replace(/\r\n/g, '\n')
    .split('\n')
    .filter((l) => l.trim().length > 0);
  if (lines.length < 2) throw new Error('CSV vazio ou apenas com cabeçalho.');
  const headers = splitCsvLine(lines[0]);
  const cols: Record<string, number[]> = {};
  headers.forEach((h) => { cols[h] = []; });
  for (let i = 1; i < lines.length; i++) {
    const values = splitCsvLine(lines[i]);
    headers.forEach((h, idx) => {
      const raw = values[idx] ?? '';
      const num = Number(raw);
      cols[h].push(Number.isFinite(num) && raw !== '' ? num : NaN);
    });
  }
  // Filtra colunas sem nenhum valor numérico
  const out: Record<string, number[]> = {};
  for (const [k, arr] of Object.entries(cols)) {
    if (arr.some((v) => Number.isFinite(v))) out[k] = arr;
  }
  if (Object.keys(out).length === 0) throw new Error('CSV sem colunas numéricas.');
  return out;
}

export function splitCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') { inQuotes = !inQuotes; continue; }
    if (ch === ',' && !inQuotes) { out.push(cur.trim()); cur = ''; continue; }
    cur += ch;
  }
  out.push(cur.trim());
  return out;
}
```

## Limitações conhecidas (vs RFC 4180)

1. **Aspas escapadas duplicadas** (`""`): não suporta. Para CSVs com aspas internas escapadas, substitua pela `papaparse`.
2. **Delimitador fixo `,`**: não auto-detecta `;` ou `\t`. Aceitar `delimiter` como parâmetro se necessário.
3. **BOM UTF-8**: header com BOM (`﻿`) é mantido na chave da coluna. Pré-processar com `text.replace(/^﻿/, '')` se for problema.
4. **Escape de quebra de linha dentro de aspas**: não suporta. Linhas multi-line dentro de campo viram registros separados (incorretos).

Para 95% dos uploads em apps web (datasets numéricos exportados de planilhas), funciona.

## Adaptation hints

- **Strings (não-numéricas)**: troque `cols[h].push(...NaN)` por `cols[h].push(raw)` e tipe como `Record<string, string[]>`. Útil para dados categóricos.
- **Detecção automática de delimitador**: snippet de 3 linhas — testar quais entre `[',', ';', '\t']` produzem mais colunas na primeira linha.
- **Streaming**: para arquivos > 50MB, usar `ReadableStream<Uint8Array>` + `TextDecoderStream` e processar linha-a-linha.

## Example

```ts
import { parseCsv } from './csv-numeric-parser';

const text = `nome,idade,salario
Alice,30,5000
Bob,25,4000
Carol,35,6500`;

const cols = parseCsv(text);
// cols = {
//   idade: [30, 25, 35],
//   salario: [5000, 4000, 6500]
// }
// (coluna 'nome' descartada — sem valores numéricos)
```

Em React, integrar com `<input type="file">`:

```tsx
async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
  const file = e.target.files?.[0];
  if (!file) return;
  const text = await file.text();
  try {
    const data = parseCsv(text);
    setDataset(data);
  } catch (err) {
    alert(`Erro: ${(err as Error).message}`);
  }
}
```

## Origin

Extraída de [`src/context/ChatContext.tsx`](https://github.com/avila2026/MULT-CHAT-HUB/blob/main/src/context/ChatContext.tsx), funções `parseCsv` e `splitCsvLine` (`uploadDataset`).
