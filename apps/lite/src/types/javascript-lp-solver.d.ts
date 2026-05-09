declare module 'javascript-lp-solver' {
  interface LPModel {
    optimize: string;
    opType: 'min' | 'max';
    constraints: Record<string, { min?: number; max?: number; equal?: number }>;
    variables: Record<string, Record<string, number>>;
    ints?: Record<string, boolean>;
  }

  interface LPResult {
    feasible: boolean;
    result: number;
    [variable: string]: number | boolean;
  }

  function Solve(model: LPModel): LPResult;
}
