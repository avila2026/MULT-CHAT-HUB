import { Request, Response } from 'express';
import { Octokit } from '@octokit/rest';
import { executeAnalysis, AnalysisType } from '../../src/lib/analyticalEngine.js';

// Avaliador matemático seguro sem usar Function() ou eval().
// Suporta: números, +, -, *, /, **, %, parênteses, operadores unários.
function safeEval(expr: string): number {
  const normalized = expr.replace(/\s+/g, '');
  // \*\* deve vir antes de \* para ser capturado como token único (expoente)
  const TOKEN_RE = /\d+\.?\d*|\.\d+|\*\*|[+\-\/*%()]/g;
  const matched = normalized.match(TOKEN_RE);
  if (!matched) throw new Error('Expressão vazia ou inválida.');
  // Rejeita se os tokens capturados não reconstituem a string inteira —
  // isso garante que caracteres não suportados (letras, ponto-e-vírgula,
  // colchetes…) causem erro em vez de serem silenciosamente descartados.
  if (matched.join('') !== normalized) throw new Error('Caracteres não suportados na expressão.');
  const tokens: string[] = matched;
  let pos = 0;

  function peek() { return tokens[pos]; }
  function consume() { return tokens[pos++]; }

  function parseExpr(): number { return parseAddSub(); }

  function parseAddSub(): number {
    let left = parseMulDiv();
    while (peek() === '+' || peek() === '-') {
      const op = consume();
      const right = parseMulDiv();
      left = op === '+' ? left + right : left - right;
    }
    return left;
  }

  function parseMulDiv(): number {
    let left = parsePow();
    while (peek() === '*' || peek() === '/' || peek() === '%') {
      const op = consume();
      const right = parsePow();
      if (op === '*') left *= right;
      else if (op === '/') { if (right === 0) throw new Error('Divisão por zero.'); left /= right; }
      else left %= right;
    }
    return left;
  }

  // Recursão direita garante associatividade à direita: 2**3**2 = 2**(3**2) = 512
  function parsePow(): number {
    const base = parseUnary();
    if (peek() === '**') { consume(); return Math.pow(base, parsePow()); }
    return base;
  }

  function parseUnary(): number {
    if (peek() === '-') { consume(); return -parsePrimary(); }
    if (peek() === '+') { consume(); return parsePrimary(); }
    return parsePrimary();
  }

  function parsePrimary(): number {
    const tok = peek();
    if (tok === '(') {
      consume();
      const val = parseExpr();
      if (consume() !== ')') throw new Error('Parêntese não fechado.');
      return val;
    }
    if (tok !== undefined && /^\d/.test(tok)) { consume(); return parseFloat(tok); }
    throw new Error(`Token inesperado: ${tok}`);
  }

  const result = parseExpr();
  if (pos !== tokens.length) throw new Error('Expressão mal formada.');
  if (!Number.isFinite(result)) throw new Error('Resultado inválido (infinito ou NaN).');
  return result;
}

// O Octokit lerá o token do seu .env (sem prefixo VITE_ — variável backend-only)
const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN || '' });

export const availableTools = [
  {
    name: 'github_list_repos',
    description: 'Lista os repositórios públicos do GitHub de um usuário. Parâmetros: { "username": "string" }',
    parameters: { username: 'string' }
  },
  {
    name: 'github_create_issue',
    description: 'Cria uma issue em um repositório. O token Github deve possuir permissões corretas! Parâmetros: { "owner": "string", "repo": "string", "title": "string", "body": "string" }',
    parameters: { owner: 'string', repo: 'string', title: 'string', body: 'string' }
  },
  {
    name: 'get_current_time',
    description: 'Retorna a data e hora atual do sistema local. Parâmetros: {}',
    parameters: {}
  },
  {
    name: 'calculate_math',
    description: 'Calcula uma expressão matemática simples. Parâmetros: { "expression": "string" }',
    parameters: { expression: 'string' }
  },
  {
    name: 'store_memory',
    description: 'Salva uma string curta em memória volátil associada a uma chave. Parâmetros: { "key": "string", "value": "string" }',
    parameters: { key: 'string', value: 'string' }
  },
  {
    name: 'retrieve_memory',
    description: 'Busca o valor salvo na memória volátil pela chave. Parâmetros: { "key": "string" }',
    parameters: { key: 'string' }
  },
  {
    name: 'analyze_descriptive',
    description: 'Estatísticas descritivas (count, mean, std, min, p25, p50, p75, max) por coluna numérica. Parâmetros: { "data": object|array } onde data é {col: number[]} ou [{col:val,...}].',
    parameters: { data: 'object' }
  },
  {
    name: 'analyze_predictive',
    description: 'Regressão linear multivariada. Treina sobre todas as colunas numéricas exceto target_column e retorna coeficientes + 10 predições. Parâmetros: { "data": object|array, "target_column": "string" }',
    parameters: { data: 'object', target_column: 'string' }
  },
  {
    name: 'detect_anomalies',
    description: 'Detecta anomalias via z-score multivariado (|z|>2.5 em qualquer feature). Retorna até 10 amostras anômalas. Parâmetros: { "data": object|array }',
    parameters: { data: 'object' }
  },
  {
    name: 'optimize_linear',
    description: 'Resolve problema de otimização linear (exemplo padrão: minimizar 2x+3y s.t. x+y>=10, x+2y>=15). Parâmetros: {}',
    parameters: {}
  },
  {
    name: 'recommend_stack',
    description: 'Retorna stack tecnológica recomendada para projetos analíticos. Parâmetros: {}',
    parameters: {}
  }
];

// Dicionário simples em memória RAM (volátil com o servidor backend)
const memoryStore: Record<string, string> = {};

const ANALYSIS_TOOL_MAP: Record<string, AnalysisType> = {
  analyze_descriptive: 'descritiva',
  analyze_predictive: 'preditiva',
  detect_anomalies: 'anomalias',
  optimize_linear: 'otimizacao',
  recommend_stack: 'software'
};

export const handleToolExecution = async (req: Request, res: Response) => {
  const { toolName, args } = req.body;

  if (!toolName || !args) {
    return res.status(400).json({ error: 'toolName e args são obrigatórios.' });
  }

  console.log(`[Tool Executor Backend] Ferramenta: ${toolName}`, args);

  try {
    if (toolName === 'github_list_repos') {
      const response = await octokit.rest.repos.listForUser({
        username: args.username,
        per_page: 5,
        sort: 'updated'
      });
      const repos = response.data.map((repo: any) => repo.name).join(', ');
      return res.json({ result: `Últimos 5 repositórios públicos de ${args.username}: [${repos || 'Nenhum'}]` });
    }

    if (toolName === 'github_create_issue') {
      const response = await octokit.rest.issues.create({
        owner: args.owner,
        repo: args.repo,
        title: args.title,
        body: args.body
      });
      return res.json({ result: `Issue "${args.title}" criada com sucesso em ${args.owner}/${args.repo}! Link: ${response.data.html_url}` });
    }

    if (toolName === 'get_current_time') {
      const now = new Date();
      return res.json({ result: `A data e hora atual no servidor longo é: ${now.toLocaleString('pt-BR')}` });
    }

    if (toolName === 'calculate_math') {
       try {
         const result = safeEval(String(args.expression));
         return res.json({ result: `O resultado de ${args.expression} é ${result}` });
       } catch(e) {
         return res.json({ result: `Expressão matemática inválida: ${args.expression}` });
       }
    }

    if (toolName === 'store_memory') {
       memoryStore[args.key] = args.value;
       return res.json({ result: `Valor salvo com sucesso na chave '${args.key}'.` });
    }

    if (toolName === 'retrieve_memory') {
       const val = memoryStore[args.key];
       if (val) {
         return res.json({ result: `Memória na chave '${args.key}': ${val}` });
       }
       return res.json({ result: `Não encontrei nada salvo com a chave '${args.key}'.` });
    }

    if (toolName in ANALYSIS_TOOL_MAP) {
      try {
        const result = executeAnalysis({
          data: args.data,
          analysisType: ANALYSIS_TOOL_MAP[toolName],
          targetColumn: args.target_column
        });
        return res.json({ result, analysis: result });
      } catch (err: any) {
        const isValidation = typeof err.message === 'string' && err.message.startsWith('Erro_');
        return res.status(isValidation ? 400 : 500).json({ error: err.message || 'Falha na análise.' });
      }
    }

    return res.status(404).json({ error: 'Ferramenta não encontrada ou não habilitada no backend.' });
  } catch (error: any) {
    console.error(`Erro ao executar ferramenta ${toolName}:`, error);
    return res.status(500).json({ error: error.message });
  }
};
