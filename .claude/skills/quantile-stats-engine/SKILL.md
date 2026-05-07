---
name: quantile-stats-engine
description: Use quando o usuário precisar de estatística descritiva (mean, std, min, max, p25, p50, p75, count) em arrays numéricos sem dependências externas — ideal para resumir colunas de datasets em dashboards ou relatórios.
allowed-tools: Read, Write, Edit
---

# quantile-stats-engine

Calcula estatísticas descritivas (count, mean, std, min, p25, p50, p75, max) por coluna numérica em **TypeScript puro**, sem qualquer dependência externa.

## API

```ts
type SummaryStats = {
  count: number;
  mean: number;
  std: number;       // desvio-padrão amostral (n-1)
  min: number;
  p25: number; p50: number; p75: number;
  max: number;
};

function summarizeColumns(data: Record<string, number[]>): {
  shape: [rows: number, cols: number];
  columns: string[];
  summary_stats: Record<string, SummaryStats>;
};

function quantile(sorted: number[], q: number): number;
```

## Source

```ts
// quantile-stats-engine.ts
function round(n: number): number {
  if (!Number.isFinite(n)) return n;
  return Math.round(n * 1e6) / 1e6;
}

export function quantile(sorted: number[], q: number): number {
  if (sorted.length === 0) return NaN;
  const idx = (sorted.length - 1) * q;
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);
  if (lo === hi) return sorted[lo];
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (idx - lo);
}

export function summarizeColumns(data: Record<string, number[]>) {
  const cols = Object.keys(data);
  const summary: Record<string, any> = {};
  let rowCount = 0;
  for (const col of cols) {
    const arr = data[col].filter((v) => Number.isFinite(v));
    rowCount = Math.max(rowCount, data[col].length);
    if (arr.length === 0) continue;
    const n = arr.length;
    const mean = arr.reduce((a, b) => a + b, 0) / n;
    const variance = arr.reduce((acc, v) => acc + (v - mean) ** 2, 0) / Math.max(1, n - 1);
    const sorted = [...arr].sort((a, b) => a - b);
    summary[col] = {
      count: n,
      mean: round(mean),
      std: round(Math.sqrt(variance)),
      min: sorted[0],
      p25: round(quantile(sorted, 0.25)),
      p50: round(quantile(sorted, 0.5)),
      p75: round(quantile(sorted, 0.75)),
      max: sorted[n - 1],
    };
  }
  return { shape: [rowCount, cols.length], columns: cols, summary_stats: summary };
}
```

## Adaptation hints

- **Quantile method**: implementação atual é "linear interpolation between closest ranks" (R-7, padrão pandas/numpy). Para outras convenções (R-1, R-6) ajustar `quantile()` conforme [Wikipedia: Quantile § Estimating quantiles from a sample](https://en.wikipedia.org/wiki/Quantile#Estimating_quantiles_from_a_sample).
- **Filter NaN**: `arr.filter(v => Number.isFinite(v))` exclui `NaN`/`Infinity` antes de calcular. Se quiser propagar `NaN` quando houver buracos, remover o filtro.
- **Std populacional**: trocar `Math.max(1, n - 1)` por `n` para variância populacional (vs amostral).
- **Mais quantis**: aceitar array de quantis: `function quantiles(sorted: number[], qs: number[]): number[]`.

## Example

```ts
import { summarizeColumns } from './quantile-stats-engine';

const result = summarizeColumns({
  revenue: [100, 200, 300, 400, 500],
  cost:    [ 50,  80, 120, 200, 300],
});

console.log(result.summary_stats.revenue);
// { count: 5, mean: 300, std: 158.114, min: 100, p25: 200, p50: 300, p75: 400, max: 500 }
```

## Origin

Extraída de [`src/lib/analyticalEngine.ts`](https://github.com/avila2026/MULT-CHAT-HUB/blob/main/src/lib/analyticalEngine.ts), funções `quantile` e `descriptive` (~30 linhas).
