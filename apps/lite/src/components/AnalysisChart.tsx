import React from 'react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
  ScatterChart, Scatter, ZAxis,
  ComposedChart, Line, Legend
} from 'recharts';
import { AnalysisResult } from '../types';

interface Props {
  result: AnalysisResult;
}

export default function AnalysisChart({ result }: Props) {
  switch (result.analysis_type) {
    case 'descritiva':
      return <DescriptiveChart result={result} />;
    case 'preditiva':
      return <PredictiveChart result={result} />;
    case 'anomalias':
      return <AnomaliesChart result={result} />;
    case 'otimizacao':
      return <OptimizationCard result={result} />;
    case 'software':
      return <StackCard result={result} />;
    default:
      return null;
  }
}

function DescriptiveChart({ result }: Props) {
  const stats = (result.analysis_result.summary_stats as Record<string, Record<string, number>>) || {};
  const data = Object.entries(stats).map(([col, s]) => ({
    column: col,
    mean: s.mean,
    std: s.std,
    min: s.min,
    max: s.max
  }));
  if (data.length === 0) return null;
  return (
    <div className="mt-3 bg-white border border-zinc-200 rounded-lg p-3">
      <p className="text-xs font-semibold text-zinc-600 mb-2">Médias e desvio-padrão por coluna</p>
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" />
          <XAxis dataKey="column" stroke="#52525b" fontSize={11} />
          <YAxis stroke="#52525b" fontSize={11} />
          <Tooltip />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          <Bar dataKey="mean" fill="#6366f1" name="Média" />
          <Bar dataKey="std" fill="#10b981" name="Desvio-padrão" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function PredictiveChart({ result }: Props) {
  const ar = result.analysis_result as Record<string, any>;
  const preds: number[] = ar.sample_predictions || [];
  const data = preds.map((p, i) => ({ idx: i, prediction: p }));
  return (
    <div className="mt-3 bg-white border border-zinc-200 rounded-lg p-3">
      <p className="text-xs font-semibold text-zinc-600 mb-1">Regressão linear · intercept = {ar.intercept}</p>
      <p className="text-[11px] text-zinc-500 mb-2">
        Coeficientes: {Object.entries(ar.coefficients || {}).map(([k, v]) => `${k}=${v}`).join(', ') || '—'}
      </p>
      {data.length > 0 && (
        <ResponsiveContainer width="100%" height={200}>
          <ComposedChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" />
            <XAxis dataKey="idx" stroke="#52525b" fontSize={11} label={{ value: 'Linha', position: 'insideBottom', offset: -2, fontSize: 10 }} />
            <YAxis stroke="#52525b" fontSize={11} />
            <Tooltip />
            <Line type="monotone" dataKey="prediction" stroke="#6366f1" strokeWidth={2} dot name="Predição" />
          </ComposedChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}

function AnomaliesChart({ result }: Props) {
  const ar = result.analysis_result as Record<string, any>;
  const samples: Array<Record<string, any>> = ar.anomaly_samples || [];
  const data = samples.map((s) => ({ idx: s.row_index, z: s.max_z }));
  return (
    <div className="mt-3 bg-white border border-zinc-200 rounded-lg p-3">
      <p className="text-xs font-semibold text-zinc-600 mb-2">
        {ar.anomalies_found} anomalia(s) em {ar.total_rows} linhas (limiar |z| &gt; {ar.threshold_z})
      </p>
      {data.length > 0 ? (
        <ResponsiveContainer width="100%" height={200}>
          <ScatterChart>
            <CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" />
            <XAxis type="number" dataKey="idx" name="Linha" stroke="#52525b" fontSize={11} />
            <YAxis type="number" dataKey="z" name="|z| máx." stroke="#52525b" fontSize={11} />
            <ZAxis range={[60, 60]} />
            <Tooltip cursor={{ strokeDasharray: '3 3' }} />
            <Scatter data={data} fill="#ef4444" />
          </ScatterChart>
        </ResponsiveContainer>
      ) : (
        <p className="text-xs text-zinc-500 italic">Nenhuma anomalia encontrada.</p>
      )}
    </div>
  );
}

function OptimizationCard({ result }: Props) {
  const ar = result.analysis_result as Record<string, any>;
  return (
    <div className="mt-3 bg-white border border-zinc-200 rounded-lg p-3 text-xs">
      <p className="font-semibold text-zinc-700 mb-1">Problema: {ar.problem}</p>
      <p>
        <span className="text-zinc-500">Status:</span> <span className={ar.success ? 'text-emerald-600' : 'text-red-600'}>{ar.status}</span>
      </p>
      {ar.success && (
        <>
          <p><span className="text-zinc-500">Valores ótimos:</span> [{(ar.optimal_values || []).join(', ')}]</p>
          <p><span className="text-zinc-500">Custo mínimo:</span> {ar.minimum_cost}</p>
        </>
      )}
    </div>
  );
}

function StackCard({ result }: Props) {
  const ar = result.analysis_result as Record<string, any>;
  const stack: string[] = ar.recommended_stack || [];
  const usage = (ar.tool_usage as Record<string, string>) || {};
  return (
    <div className="mt-3 bg-white border border-zinc-200 rounded-lg p-3 text-xs space-y-2">
      <div>
        <p className="font-semibold text-zinc-700 mb-1">Stack recomendada:</p>
        <div className="flex flex-wrap gap-1">
          {stack.map((s) => (
            <span key={s} className="px-2 py-0.5 bg-indigo-100 text-indigo-800 rounded font-mono text-[10px]">{s}</span>
          ))}
        </div>
      </div>
      <div>
        <p className="font-semibold text-zinc-700 mb-1">Uso por área:</p>
        <ul className="space-y-0.5">
          {Object.entries(usage).map(([k, v]) => (
            <li key={k}><span className="text-zinc-500">{k}:</span> {v}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}
