// Smoke tests para o QuantumAnalyticalEngine
// Execute: pnpm --filter @mch/lite test
import { executeAnalysis } from './analyticalEngine';

const DATA = {
  x: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
  y: [2, 4, 5, 4, 5, 7, 8, 9, 10, 12],
  z: [10, 9, 8, 7, 6, 5, 4, 3, 2, 1],
};

function assert(condition: boolean, msg: string) {
  if (!condition) throw new Error(`FAIL: ${msg}`);
  console.log(`  ✓ ${msg}`);
}

function run(name: string, fn: () => void) {
  try {
    fn();
    console.log(`[PASS] ${name}`);
  } catch (e) {
    console.error(`[FAIL] ${name}: ${(e as Error).message}`);
    process.exitCode = 1;
  }
}

// 1. Análise descritiva
run('descritiva — shape, colunas, summary_stats, range, cv', () => {
  const r = executeAnalysis({ data: DATA, analysisType: 'descritiva' });
  assert(r.analysis_type === 'descritiva', 'analysis_type correto');
  assert(r.input_rows === 10, 'input_rows = 10');
  const res = r.analysis_result as Record<string, unknown>;
  const stats = res['summary_stats'] as Record<string, Record<string, number>>;
  assert(typeof stats['x']['mean'] === 'number', 'mean de x é número');
  assert(stats['x']['min'] === 1, 'min de x = 1');
  assert(stats['x']['max'] === 10, 'max de x = 10');
  assert(stats['x']['count'] === 10, 'count de x = 10');
  assert(typeof stats['x']['range'] === 'number', 'range de x é número');
  assert(typeof stats['x']['cv'] === 'number', 'cv de x é número');
});

// 2. Análise preditiva
run('preditiva — coeficientes, r2, rmse e sample_predictions', () => {
  const r = executeAnalysis({ data: DATA, analysisType: 'preditiva', targetColumn: 'y' });
  assert(r.analysis_type === 'preditiva', 'analysis_type correto');
  const res = r.analysis_result as Record<string, unknown>;
  assert(typeof res['coefficients'] === 'object', 'coefficients é objeto');
  assert(Array.isArray(res['sample_predictions']), 'sample_predictions é array');
  assert((res['sample_predictions'] as number[]).length > 0, 'sample_predictions não vazia');
  assert(typeof res['r2'] === 'number', 'r2 é número');
  assert(typeof res['rmse'] === 'number', 'rmse é número');
});

// 3. Detecção de anomalias
run('anomalias — anomaly_samples e peak_column', () => {
  const r = executeAnalysis({ data: DATA, analysisType: 'anomalias' });
  assert(r.analysis_type === 'anomalias', 'analysis_type correto');
  const res = r.analysis_result as Record<string, unknown>;
  assert(typeof res['anomalies_found'] === 'number' && Array.isArray(res['anomaly_samples']),
    'resultado contém anomalies_found e anomaly_samples');
  const samples = res['anomaly_samples'] as Array<Record<string, unknown>>;
  if (samples.length > 0) {
    assert(typeof samples[0]['peak_column'] === 'string', 'primeira amostra tem peak_column');
    assert(typeof samples[0]['max_z'] === 'number', 'primeira amostra tem max_z');
  }
});

// 4. Otimização linear — solução conhecida (min 2x+3y s.t. x+y>=10, x+2y>=15)
run('otimizacao — min 2x+3y → feasible, custo=25', () => {
  const r = executeAnalysis({ analysisType: 'otimizacao' });
  assert(r.analysis_type === 'otimizacao', 'analysis_type correto');
  const res = r.analysis_result as Record<string, unknown>;
  assert(res['success'] === true, 'otimização feasible');
  const vals = res['optimal_values'] as Record<string, number>;
  assert(Math.abs(vals['x'] - 5) < 0.01, 'x ≈ 5');
  assert(Math.abs(vals['y'] - 5) < 0.01, 'y ≈ 5');
  assert(Math.abs((res['objective_value'] as number) - 25) < 0.01, 'custo ≈ 25');
});

// 4b. Otimização linear com modelo customizado
run('otimizacao custom — max lucro', () => {
  const r = executeAnalysis({
    analysisType: 'otimizacao',
    optimizationModel: {
      optimize: 'lucro',
      opType: 'max',
      constraints: { horas: { max: 8 }, material: { max: 10 } },
      variables: {
        prodA: { lucro: 5, horas: 2, material: 3 },
        prodB: { lucro: 4, horas: 1, material: 2 },
      },
    },
  });
  assert(r.analysis_type === 'otimizacao', 'analysis_type correto');
  const res = r.analysis_result as Record<string, unknown>;
  assert(res['success'] === true, 'otimização custom feasible');
  assert(typeof res['optimal_values'] === 'object', 'optimal_values presente');
});

// 5. Recomendação de stack
run('software — recommended_stack não vazia', () => {
  const r = executeAnalysis({ analysisType: 'software' });
  assert(r.analysis_type === 'software', 'analysis_type correto');
  const res = r.analysis_result as Record<string, unknown>;
  assert(Array.isArray(res['recommended_stack']), 'recommended_stack é array');
  assert((res['recommended_stack'] as string[]).length > 0, 'stack não vazia');
});

// 6. Erros esperados — devem lançar com mensagem específica
run('preditiva sem target_column — lança Erro_Alvo', () => {
  let threw = false;
  try { executeAnalysis({ data: DATA, analysisType: 'preditiva' }); }
  catch (e) {
    threw = true;
    assert(e instanceof Error && /Erro_Alvo/.test(e.message), `mensagem deve conter Erro_Alvo, obteve: ${(e as Error).message}`);
  }
  assert(threw, 'erro lançado sem target_column');
});

run('descritiva com arrays vazios — lança Erro_Dimensionalidade', () => {
  let threw = false;
  try { executeAnalysis({ data: { x: [], y: [] }, analysisType: 'descritiva' }); }
  catch (e) {
    threw = true;
    assert(e instanceof Error && /Erro_Dimensionalidade/.test(e.message), `mensagem deve conter Erro_Dimensionalidade, obteve: ${(e as Error).message}`);
  }
  assert(threw, 'erro lançado com arrays vazios');
});
