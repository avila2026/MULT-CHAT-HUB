---
name: quantum-analytical-engine
description: Use quando precisar de 5 análises quantitativas locais (estatística descritiva, regressão linear preditiva, detecção de anomalias por z-score, otimização linear, recomendação de stack) executadas no browser ou Node, sem Python e sem chamadas de rede.
allowed-tools: Read, Write, Edit, Bash
---

# quantum-analytical-engine

Engine analítico em **TypeScript puro** com 5 análises completas. Roda offline em qualquer ambiente JavaScript (Browser, Node, Deno, Edge runtime). Substitui a necessidade de backend Python (pandas/sklearn/scipy) para casos de uso típicos de análise exploratória.

## Análises

| Tipo | Lib usada | Saída |
|------|-----------|-------|
| `descritiva` | nativa | count, mean, std, min, p25, p50, p75, max por coluna |
| `preditiva` | `ml-regression-multivariate-linear` | coeficientes, intercept, 10 predições amostrais |
| `anomalias` | nativa (z-score) | total_rows, anomalies_found, threshold, amostras |
| `otimizacao` | `javascript-lp-solver` | optimal_values, minimum_cost, status |
| `software` | nativa (estático) | recomendação de stack |

## API

```ts
type AnalysisType = 'descritiva' | 'preditiva' | 'anomalias' | 'otimizacao' | 'software';

interface AnalysisInput {
  data?: Record<string, number[]> | Array<Record<string, number>>;
  analysisType: AnalysisType;
  targetColumn?: string;
}

interface AnalysisResult {
  analysis_type: AnalysisType;
  input_rows: number;
  input_columns: string[];
  analysis_result: Record<string, unknown>;
}

function executeAnalysis(input: AnalysisInput): AnalysisResult;
```

Erros de validação têm mensagens prefixadas com `Erro_*`:
- `Erro_Alvo`, `Erro_Tipo_Alvo` — `target_column` ausente/inválida.
- `Erro_Dimensionalidade` — features insuficientes ou matriz vazia.
- `Erro_Roteamento` — `analysisType` desconhecido.

## Source

O código completo (~270 linhas) está em [`src/lib/analyticalEngine.ts`](https://github.com/avila2026/MULT-CHAT-HUB/blob/main/src/lib/analyticalEngine.ts) e cobre:

```ts
// Imports
import MultivariateLinearRegression from 'ml-regression-multivariate-linear';
import lpSolver from 'javascript-lp-solver';

// Aceita formato colunar OU array de objetos
function toColumnar(data): Record<string, number[]>;

// 1. Descritiva: count/mean/std/quartis
function descriptive(cols): Record<string, unknown>;

// 2. Preditiva: regressão linear multivariada com intercept
function predictive(cols, targetColumn): Record<string, unknown>;

// 3. Anomalias: z-score multivariado |z| > 2.5 em qualquer feature
function anomalies(cols): Record<string, unknown>;

// 4. Otimização: programação linear (exemplo padrão min 2x+3y s.t. ...)
function optimization(): Record<string, unknown>;

// 5. Stack: retorno fixo
function softwareRecommendation(): Record<string, unknown>;

// Entrada principal: roteia por analysisType
export function executeAnalysis(input: AnalysisInput): AnalysisResult;
```

Copie o arquivo completo de `src/lib/analyticalEngine.ts` para o projeto destino.

## Dependências npm

```bash
npm install ml-regression-multivariate-linear javascript-lp-solver
```

- `ml-regression-multivariate-linear` (~30KB, puro JS, browser-safe).
- `javascript-lp-solver` (~50KB, puro JS; Vite externaliza `fs`/`child_process` que não são usados pelo `Solve()`).

## Adaptation hints

- **Algoritmo de anomalia**: a implementação é z-score por feature (`|z| > 2.5` em qualquer dimensão). Para Mahalanobis multivariado real (correlações entre features), substituir por `ml-distance-mahalanobis`. Para Isolation Forest, usar `isolation-forest-asw`.
- **Otimização customizada**: o exemplo padrão (`min 2x+3y s.t. x+y>=10, x+2y>=15`) é hardcoded. Para aceitar `c`, `A`, `b` como input, modifique `optimization()` para construir o `model` do lp-solver dinamicamente:
  ```ts
  function optimization(c: number[], A: number[][], b: number[]) {
    const variables: any = {};
    c.forEach((coef, i) => { variables[`x${i}`] = { cost: coef }; });
    const constraints: any = {};
    A.forEach((row, j) => {
      constraints[`c${j}`] = { min: b[j] };
      row.forEach((val, i) => { variables[`x${i}`][`c${j}`] = val; });
    });
    const result = lpSolver.Solve({ optimize: 'cost', opType: 'min', constraints, variables });
    // ...
  }
  ```
- **Predição**: `MultivariateLinearRegression` aceita `intercept: false` para regressão sem intercept. Para regressão polinomial, pré-processar features com `x^2`, `x*y`, etc.
- **Mais tipos**: adicionar `'classificacao'` (logistic regression via `ml-logistic-regression`), `'clusterizacao'` (k-means via `ml-kmeans`), `'series_temporais'` (suavização exponencial nativa).

## Verificação matemática (smoke tests)

Após copiar e instalar deps:

```ts
// 1. Descritiva
const d = executeAnalysis({ analysisType: 'descritiva', data: { x: [1,2,3,4,5,6,7,8,9,10] } });
console.assert(d.analysis_result.summary_stats.x.mean === 5.5);

// 2. Preditiva (sintética: y = 5*x1 + 100*x2)
const p = executeAnalysis({
  analysisType: 'preditiva',
  data: { x1: [1000,1500,2000,2500,3000], x2: [50,65,80,95,120], y: [10000,14000,18000,22000,27000] },
  targetColumn: 'y',
});
console.assert(p.analysis_result.coefficients.x1 === 5);
console.assert(p.analysis_result.coefficients.x2 === 100);

// 3. Anomalia
const a = executeAnalysis({ analysisType: 'anomalias', data: { v: [1,2,3,2,1,2,3,1,2,100,3,2,1] } });
console.assert(a.analysis_result.anomalies_found === 1);

// 4. Otimização
const o = executeAnalysis({ analysisType: 'otimizacao' });
console.assert(o.analysis_result.optimal_values[0] === 5);
console.assert(o.analysis_result.minimum_cost === 25);
```

## Origin

Implementação original em [`src/lib/analyticalEngine.ts`](https://github.com/avila2026/MULT-CHAT-HUB/blob/main/src/lib/analyticalEngine.ts). Porte do `QuantumAnalyticalEngine` Python (pandas/sklearn/scipy) para TypeScript puro feito no PR #2 do MULT-CHAT-HUB.
