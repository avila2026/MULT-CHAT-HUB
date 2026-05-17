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
  },
  {
    name: 'scan_text_threats',
    description: 'Analisa texto em busca de padrões de ameaça: SQL injection, XSS, path traversal, command injection, LDAP injection. Parâmetros: { "text": "string" }',
    parameters: { text: 'string' }
  },
  {
    name: 'analyze_code_security',
    description: 'Audita trecho de código por vulnerabilidades: segredos hardcoded, uso de eval/Function, prototype pollution, deserialização insegura. Parâmetros: { "code": "string", "language": "string" }',
    parameters: { code: 'string', language: 'string' }
  },
  {
    name: 'generate_security_report',
    description: 'Consolida achados de segurança em relatório estruturado com severity, cve_ref e recomendação. Parâmetros: { "findings": "string" }',
    parameters: { findings: 'string' }
  }
];

// Dicionário simples em memória RAM (volátil com o servidor backend)
const memoryStore: Record<string, string> = {};

// --- Ferramentas de cibersegurança (análise local, sem chamada externa) ---

interface ThreatFinding {
  type: string;
  pattern: string;
  severity: 'CRÍTICO' | 'ALTO' | 'MÉDIO' | 'BAIXO';
  description: string;
}

const THREAT_PATTERNS: Array<{ type: string; re: RegExp; severity: ThreatFinding['severity']; description: string }> = [
  { type: 'SQL Injection', re: /('|"|;|--|\/\*|\*\/|xp_|UNION\s+SELECT|DROP\s+TABLE|INSERT\s+INTO|DELETE\s+FROM|UPDATE\s+\w+\s+SET)/i, severity: 'CRÍTICO', description: 'Padrão de injeção SQL detectado' },
  { type: 'XSS', re: /<script[\s\S]*?>|javascript:|on\w+\s*=|<img[^>]+src\s*=\s*["']?javascript/i, severity: 'CRÍTICO', description: 'Padrão de Cross-Site Scripting detectado' },
  { type: 'Path Traversal', re: /(\.\.[/\\]){2,}|%2e%2e[%2f%5c]/i, severity: 'ALTO', description: 'Tentativa de path traversal detectada' },
  { type: 'Command Injection', re: /[;&|`$]\s*(rm|wget|curl|bash|sh|nc|ncat|python|perl|ruby|php)\b/i, severity: 'CRÍTICO', description: 'Padrão de injeção de comando detectado' },
  { type: 'LDAP Injection', re: /[)(|&!*\\]/i, severity: 'MÉDIO', description: 'Possível injeção LDAP com caracteres especiais' },
  { type: 'NoSQL Injection', re: /\$where|\$ne|\$gt|\$regex|\$or|\$and/i, severity: 'ALTO', description: 'Padrão de injeção NoSQL detectado' },
  { type: 'Template Injection', re: /\{\{.*?\}\}|\{%.*?%\}|\$\{.*?\}/i, severity: 'ALTO', description: 'Possível injeção de template detectada' },
];

function scanTextThreats(text: string): string {
  const findings: ThreatFinding[] = [];
  for (const { type, re, severity, description } of THREAT_PATTERNS) {
    const match = text.match(re);
    if (match) {
      findings.push({ type, pattern: match[0].slice(0, 40), severity, description });
    }
  }
  if (findings.length === 0) {
    return JSON.stringify({ status: 'LIMPO', message: 'Nenhuma ameaça detectada no texto analisado.', findings: [] }, null, 2);
  }
  return JSON.stringify({ status: 'AMEAÇAS DETECTADAS', total: findings.length, findings }, null, 2);
}

const CODE_VULN_PATTERNS: Array<{ type: string; re: RegExp; severity: ThreatFinding['severity']; cve_ref: string; description: string }> = [
  { type: 'Eval Inseguro', re: /\beval\s*\(|\bnew\s+Function\s*\(/, severity: 'CRÍTICO', cve_ref: 'CWE-95', description: 'eval() ou new Function() permite execução arbitrária de código' },
  { type: 'Segredo Hardcoded', re: /(password|secret|api_?key|token|pwd)\s*[:=]\s*["'][^"']{4,}/i, severity: 'CRÍTICO', cve_ref: 'CWE-798', description: 'Credencial em texto plano no código' },
  { type: 'Prototype Pollution', re: /__proto__|constructor\s*\[|prototype\s*\[/, severity: 'ALTO', cve_ref: 'CWE-1321', description: 'Possível prototype pollution via acesso a __proto__ ou constructor' },
  { type: 'Deserialização Insegura', re: /JSON\.parse\s*\([^)]*req\.|unserialize\(|pickle\.loads/, severity: 'ALTO', cve_ref: 'CWE-502', description: 'Deserialização de dados não confiáveis' },
  { type: 'SQL Concatenado', re: /["']\s*\+\s*(req\.|params\.|query\.|body\.)/, severity: 'CRÍTICO', cve_ref: 'CWE-89', description: 'Construção de query SQL por concatenação com input do usuário' },
  { type: 'innerHTML Inseguro', re: /\.innerHTML\s*=|\.outerHTML\s*=|document\.write\s*\(/, severity: 'ALTO', cve_ref: 'CWE-79', description: 'Escrita direta em innerHTML pode causar XSS' },
  { type: 'Random Inseguro', re: /Math\.random\(\)/, severity: 'MÉDIO', cve_ref: 'CWE-338', description: 'Math.random() não é criptograficamente seguro para tokens/senhas' },
];

function analyzeCodeSecurity(code: string, language: string): string {
  const findings = CODE_VULN_PATTERNS
    .filter(({ re }) => re.test(code))
    .map(({ type, severity, cve_ref, description }) => ({ type, severity, cve_ref, description }));

  if (findings.length === 0) {
    return JSON.stringify({ status: 'SEM VULNERABILIDADES DETECTADAS', language, findings: [] }, null, 2);
  }
  return JSON.stringify({ status: 'VULNERABILIDADES ENCONTRADAS', language, total: findings.length, findings }, null, 2);
}

function generateSecurityReport(findings: string): string {
  const timestamp = new Date().toLocaleString('pt-BR');
  const lines = findings.split('\n').filter(Boolean);
  const report = {
    titulo: 'Relatório de Segurança — MULT-CHAT-HUB',
    gerado_em: timestamp,
    total_achados: lines.length,
    resumo_executivo: `${lines.length} achado(s) de segurança identificado(s) na análise. Revisão imediata recomendada para itens com severity CRÍTICO ou ALTO.`,
    achados: lines.map((l, i) => ({ id: i + 1, descricao: l })),
    recomendacoes_gerais: [
      'Aplicar princípio do menor privilégio em todas as operações',
      'Validar e sanitizar todos os inputs nas fronteiras do sistema',
      'Utilizar prepared statements para queries SQL',
      'Manter dependências atualizadas (OWASP Dependency-Check)',
      'Habilitar Content-Security-Policy no servidor HTTP',
    ]
  };
  return JSON.stringify(report, null, 2);
}

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

    if (toolName === 'scan_text_threats') {
      return res.json({ result: scanTextThreats(String(args.text ?? '')) });
    }

    if (toolName === 'analyze_code_security') {
      return res.json({ result: analyzeCodeSecurity(String(args.code ?? ''), String(args.language ?? 'unknown')) });
    }

    if (toolName === 'generate_security_report') {
      return res.json({ result: generateSecurityReport(String(args.findings ?? '')) });
    }

    return res.status(404).json({ error: 'Ferramenta não encontrada ou não habilitada no backend.' });
  } catch (error: any) {
    console.error(`Erro ao executar ferramenta ${toolName}:`, error);
    return res.status(500).json({ error: error.message });
  }
};
