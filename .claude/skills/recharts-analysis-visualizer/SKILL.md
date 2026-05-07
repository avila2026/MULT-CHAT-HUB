---
name: recharts-analysis-visualizer
description: Use quando precisar renderizar gráficos inline em React baseados no tipo de análise quantitativa retornada (BarChart para descritiva, ComposedChart para regressão, ScatterChart para anomalias, cards para otimização/recomendação) usando recharts.
allowed-tools: Read, Write, Edit
---

# recharts-analysis-visualizer

Componente React que faz **switch sobre o tipo de análise** e renderiza o gráfico adequado via [recharts](https://recharts.org/). Pareado com a skill `quantum-analytical-engine`, mas funciona com qualquer estrutura semelhante.

## API

```tsx
import AnalysisChart from './AnalysisChart';

interface AnalysisResult {
  analysis_type: 'descritiva' | 'preditiva' | 'anomalias' | 'otimizacao' | 'software';
  input_rows: number;
  input_columns: string[];
  analysis_result: Record<string, unknown>;
}

<AnalysisChart result={analysisResult} />
```

Renderização por tipo:
- `descritiva` → `<BarChart>` de média + desvio-padrão por coluna.
- `preditiva` → `<ComposedChart>` com `<Line>` das predições + lista de coeficientes.
- `anomalias` → `<ScatterChart>` |z| × linha (vermelho).
- `otimizacao` → card de texto (problema, status, valores ótimos, custo).
- `software` → card com chips de stack + tabela de uso por área.

## Source

```tsx
// AnalysisChart.tsx
import React from 'react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
  ScatterChart, Scatter, ZAxis,
  ComposedChart, Line, Legend
} from 'recharts';

interface Props { result: AnalysisResult; }

export default function AnalysisChart({ result }: Props) {
  switch (result.analysis_type) {
    case 'descritiva': return <DescriptiveChart result={result} />;
    case 'preditiva':  return <PredictiveChart  result={result} />;
    case 'anomalias':  return <AnomaliesChart   result={result} />;
    case 'otimizacao': return <OptimizationCard result={result} />;
    case 'software':   return <StackCard        result={result} />;
    default: return null;
  }
}

function DescriptiveChart({ result }: Props) {
  const stats = (result.analysis_result.summary_stats as any) || {};
  const data = Object.entries(stats).map(([col, s]: any) => ({
    column: col, mean: s.mean, std: s.std, min: s.min, max: s.max,
  }));
  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="column" />
        <YAxis />
        <Tooltip />
        <Legend />
        <Bar dataKey="mean" fill="#6366f1" name="Média" />
        <Bar dataKey="std"  fill="#10b981" name="Desvio-padrão" />
      </BarChart>
    </ResponsiveContainer>
  );
}

function PredictiveChart({ result }: Props) {
  const ar = result.analysis_result as any;
  const data = (ar.sample_predictions || []).map((p: number, i: number) => ({ idx: i, prediction: p }));
  return (
    <ResponsiveContainer width="100%" height={200}>
      <ComposedChart data={data}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="idx" />
        <YAxis />
        <Tooltip />
        <Line type="monotone" dataKey="prediction" stroke="#6366f1" strokeWidth={2} dot name="Predição" />
      </ComposedChart>
    </ResponsiveContainer>
  );
}

function AnomaliesChart({ result }: Props) {
  const ar = result.analysis_result as any;
  const data = (ar.anomaly_samples || []).map((s: any) => ({ idx: s.row_index, z: s.max_z }));
  return (
    <ResponsiveContainer width="100%" height={200}>
      <ScatterChart>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis type="number" dataKey="idx" name="Linha" />
        <YAxis type="number" dataKey="z" name="|z|" />
        <ZAxis range={[60, 60]} />
        <Tooltip cursor={{ strokeDasharray: '3 3' }} />
        <Scatter data={data} fill="#ef4444" />
      </ScatterChart>
    </ResponsiveContainer>
  );
}

function OptimizationCard({ result }: Props) {
  const ar = result.analysis_result as any;
  return (
    <div style={{ padding: 12, border: '1px solid #ddd', borderRadius: 8 }}>
      <p><strong>Problema:</strong> {ar.problem}</p>
      <p>Status: <span style={{ color: ar.success ? 'green' : 'red' }}>{ar.status}</span></p>
      {ar.success && (
        <>
          <p>Valores ótimos: [{ar.optimal_values?.join(', ')}]</p>
          <p>Custo mínimo: {ar.minimum_cost}</p>
        </>
      )}
    </div>
  );
}

function StackCard({ result }: Props) {
  const ar = result.analysis_result as any;
  return (
    <div style={{ padding: 12 }}>
      <p><strong>Stack recomendada:</strong></p>
      <div>{(ar.recommended_stack || []).map((s: string) => <span key={s} style={{ marginRight: 6 }}>{s}</span>)}</div>
      <ul>{Object.entries(ar.tool_usage || {}).map(([k, v]) => <li key={k}>{k}: {String(v)}</li>)}</ul>
    </div>
  );
}
```

## Dependências npm

```bash
npm install recharts react
```

`recharts` v3+ é peer-compatible com React 18 e 19.

## Adaptation hints

- **Estilo Tailwind**: o snippet acima usa estilos inline para portabilidade. No projeto original, usa classes Tailwind (`bg-white`, `border-zinc-200`, `text-xs`, etc). Adapte conforme o design system do projeto destino.
- **Outros tipos de análise**: para adicionar `classificacao`, `clusterizacao`, etc., adicione case no `switch` e crie subcomponente com chart adequado (PieChart para distribuição de classes, ScatterChart com cores por cluster, etc).
- **Escalabilidade**: `ResponsiveContainer` adapta ao container pai. Para charts em grid responsivo, envolver em `<div className="grid grid-cols-1 md:grid-cols-2 gap-4">`.
- **Acessibilidade**: recharts renderiza SVG, gera ARIA básico via `accessibilityLayer` (true por default em v3). Para descrições explícitas, adicionar `<title>` e `<desc>` filhos.
- **Dark mode**: recharts não tem theme nativo. Passar cores de gráfico via CSS vars: `stroke="var(--chart-primary)"`, `fill="var(--chart-accent)"`.

## Origin

Extraído de [`src/components/AnalysisChart.tsx`](https://github.com/avila2026/MULT-CHAT-HUB/blob/main/src/components/AnalysisChart.tsx) (152 linhas).
