// QuantumAnalyticalEngine — porte do manual Python para TypeScript puro.
// 5 análises: descritiva, preditiva, anomalias, otimizacao, software.
// Sem dependências Python: substitui pandas/sklearn/scipy por implementações nativas + libs npm leves.

import MultivariateLinearRegression from 'ml-regression-multivariate-linear';
import lpSolver from 'javascript-lp-solver';

export type AnalysisType = 'descritiva' | 'preditiva' | 'anomalias' | 'otimizacao' | 'software';

export type ColumnarData = Record<string, number[]>;
export type RowData = Array<Record<string, number>>;

export interface AnalysisInput {
  data?: ColumnarData | RowData;
  analysisType: AnalysisType;
  targetColumn?: string;
}

export interface AnalysisResult {
  analysis_type: AnalysisType;
  input_rows: number;
  input_columns: string[];
  analysis_result: Record<string, unknown>;
}

// --- normalização ---

function toColumnar(data: ColumnarData | RowData | undefined): ColumnarData {
  if (!data) return {};
  if (Array.isArray(data)) {
    if (data.length === 0) return {};
    const cols: ColumnarData = {};
    for (const key of Object.keys(data[0])) cols[key] = [];
    for (const row of data) {
      for (const key of Object.keys(cols)) {
        const v = (row as Record<string, unknown>)[key];
        cols[key].push(typeof v === 'number' ? v : Number(v));
      }
    }
    return cols;
  }
  // Garantir que todas colunas sejam arrays de number
  const out: ColumnarData = {};
  for (const [k, arr] of Object.entries(data)) {
    out[k] = (arr as unknown[]).map((v) => (typeof v === 'number' ? v : Number(v)));
  }
  return out;
}

function rowCount(cols: ColumnarData): number {
  const keys = Object.keys(cols);
  if (keys.length === 0) return 0;
  return cols[keys[0]].length;
}

function numericColumns(cols: ColumnarData): string[] {
  return Object.keys(cols).filter((k) => cols[k].every((v) => Number.isFinite(v)));
}

// --- 1. Descritiva ---

function quantile(sorted: number[], q: number): number {
  if (sorted.length === 0) return NaN;
  const idx = (sorted.length - 1) * q;
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);
  if (lo === hi) return sorted[lo];
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (idx - lo);
}

function descriptive(cols: ColumnarData): Record<string, unknown> {
  const summary: Record<string, Record<string, number>> = {};
  for (const col of numericColumns(cols)) {
    const arr = cols[col];
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
      max: sorted[n - 1]
    };
  }
  return {
    shape: [rowCount(cols), Object.keys(cols).length],
    columns: Object.keys(cols),
    summary_stats: summary
  };
}

// --- 2. Preditiva (regressão linear multivariada) ---

function predictive(cols: ColumnarData, targetColumn: string | undefined): Record<string, unknown> {
  if (!targetColumn || !(targetColumn in cols)) {
    throw new Error("Erro_Alvo: 'target_column' ausente ou invalida para analise preditiva.");
  }
  const numCols = numericColumns(cols);
  if (!numCols.includes(targetColumn)) {
    throw new Error("Erro_Tipo_Alvo: 'target_column' deve ser do tipo numerico.");
  }
  const featureCols = numCols.filter((c) => c !== targetColumn);
  if (featureCols.length === 0) {
    throw new Error('Erro_Dimensionalidade: Variaveis independentes insuficientes.');
  }

  const n = rowCount(cols);
  const X: number[][] = [];
  const y: number[][] = [];
  for (let i = 0; i < n; i++) {
    const row = featureCols.map((c) => cols[c][i]);
    if (row.some((v) => !Number.isFinite(v)) || !Number.isFinite(cols[targetColumn][i])) continue;
    X.push(row);
    y.push([cols[targetColumn][i]]);
  }
  if (X.length === 0) {
    throw new Error('Erro_Dimensionalidade: Sem linhas validas apos remover NaN.');
  }

  const model = new MultivariateLinearRegression(X, y, { intercept: true });
  // Em ml-regression-multivariate-linear, weights = [[w1],[w2],...,[wn],[intercept]] quando intercept=true
  const weights = model.weights;
  const coefficients: Record<string, number> = {};
  featureCols.forEach((c, i) => {
    coefficients[c] = round(weights[i][0]);
  });
  const intercept = round(weights[weights.length - 1][0]);

  const samplePredictions = model.predict(X.slice(0, 10)).map((row) => round(row[0]));

  return {
    model: 'LinearRegression',
    coefficients,
    intercept,
    sample_predictions: samplePredictions
  };
}

// --- 3. Anomalias (z-score multivariado) ---

const ANOMALY_THRESHOLD = 2.5;

function anomalies(cols: ColumnarData): Record<string, unknown> {
  const numCols = numericColumns(cols);
  if (numCols.length === 0) {
    throw new Error('Erro_Dimensionalidade: Matriz numerica vazia, impossivel isolar anomalias.');
  }
  const n = rowCount(cols);

  const stats: Record<string, { mean: number; std: number }> = {};
  for (const c of numCols) {
    const arr = cols[c];
    const mean = arr.reduce((a, b) => a + b, 0) / n;
    const std = Math.sqrt(arr.reduce((acc, v) => acc + (v - mean) ** 2, 0) / Math.max(1, n - 1));
    stats[c] = { mean, std: std || 1 };
  }

  const anomalyRows: Array<Record<string, number | string>> = [];
  for (let i = 0; i < n; i++) {
    let isAnomaly = false;
    let maxZ = 0;
    for (const c of numCols) {
      const z = Math.abs((cols[c][i] - stats[c].mean) / stats[c].std);
      if (z > maxZ) maxZ = z;
      if (z > ANOMALY_THRESHOLD) isAnomaly = true;
    }
    if (isAnomaly) {
      const sample: Record<string, number | string> = { row_index: i, max_z: round(maxZ) };
      for (const c of numCols) sample[c] = cols[c][i];
      anomalyRows.push(sample);
    }
  }

  return {
    total_rows: n,
    anomalies_found: anomalyRows.length,
    threshold_z: ANOMALY_THRESHOLD,
    anomaly_samples: anomalyRows.slice(0, 10)
  };
}

// --- 4. Otimização linear ---

function optimization(): Record<string, unknown> {
  // Exemplo padrão do manual: minimizar 2x + 3y sujeito a x+y>=10, x+2y>=15, x,y>=0
  const model = {
    optimize: 'cost',
    opType: 'min',
    constraints: {
      c1: { min: 10 },
      c2: { min: 15 }
    },
    variables: {
      x: { cost: 2, c1: 1, c2: 1 },
      y: { cost: 3, c1: 1, c2: 2 }
    }
  };
  const result = lpSolver.Solve(model);
  const success = result.feasible === true;
  return {
    success,
    status: success ? 'Optimal' : 'Infeasible',
    optimal_values: success ? [round(result.x ?? 0), round(result.y ?? 0)] : null,
    minimum_cost: success ? round(result.result) : null,
    problem: 'min 2x + 3y  s.t.  x+y>=10, x+2y>=15, x,y>=0'
  };
}

// --- 5. Recomendação de stack ---

function softwareRecommendation(): Record<string, unknown> {
  return {
    recommended_stack: ['Node.js', 'TypeScript', 'Express', 'React', 'recharts', 'Ollama (LLM local)'],
    tool_usage: {
      data_processing: 'TypeScript nativo (Map/Reduce)',
      predictive_modeling: 'ml-regression-multivariate-linear',
      optimization: 'javascript-lp-solver',
      anomaly_detection: 'z-score multivariado',
      api_exposure: 'Express',
      ui: 'React + recharts',
      llm: 'Ollama local (fazendaavila2026/avila)'
    }
  };
}

// --- helpers ---

function round(n: number): number {
  if (!Number.isFinite(n)) return n;
  return Math.round(n * 1e6) / 1e6;
}

// --- entrada principal ---

export function executeAnalysis(input: AnalysisInput): AnalysisResult {
  const cols = toColumnar(input.data);
  const result: AnalysisResult = {
    analysis_type: input.analysisType,
    input_rows: rowCount(cols),
    input_columns: Object.keys(cols),
    analysis_result: {}
  };

  switch (input.analysisType) {
    case 'descritiva':
      result.analysis_result = descriptive(cols);
      break;
    case 'preditiva':
      result.analysis_result = predictive(cols, input.targetColumn);
      break;
    case 'anomalias':
      result.analysis_result = anomalies(cols);
      break;
    case 'otimizacao':
      result.analysis_result = optimization();
      break;
    case 'software':
      result.analysis_result = softwareRecommendation();
      break;
    default:
      throw new Error(`Erro_Roteamento: Tipo de analise '${input.analysisType}' desconhecido.`);
  }

  return result;
}
