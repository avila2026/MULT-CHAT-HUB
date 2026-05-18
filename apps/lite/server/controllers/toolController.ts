import { Request, Response } from 'express';
import { Octokit } from '@octokit/rest';
import { executeAnalysis, AnalysisType } from '../../src/lib/analyticalEngine.js';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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
    description: 'Estatísticas descritivas (count, mean, std, min, p25, p50, p75, max) por coluna numérica. Parâmetros: { "data": object|array } onde data é {col: number[]} ou [{col:val,...}][...]',
    parameters: { data: 'object' }
  },
  {
    name: 'analyze_predictive',
    description: 'Regressão linear multivariada. Treina sobre todas as colunas numéricas exceto target_column e retorna coeficientes + 10 predições. Parâmetros: { "data": object|array, "targ[...]',
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
    description: 'Audita trecho de código por vulnerabilidades: segredos hardcoded, uso de eval/Function, prototype pollution, deserialização insegura. Parâmetros: { "code": "string", "langua[...]',
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
  { type: 'SQL Injection', re: /('|"|;|--|\/\*|\*\/|xp_|UNION\s+SELECT|DROP\s+TABLE|INSERT\s+INTO|DELETE\s+FROM|UPDATE\s+\w+\s+SET)/i, severity: 'CRÍTICO', description: 'Padrão de injeção SQL[...]' },
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
  { type: 'Prototype Pollution', re: /__proto__|constructor\s*\[|prototype\s*\[/, severity: 'ALTO', cve_ref: 'CWE-1321', description: 'Possível prototype pollution via acesso a __proto__ ou cons[...]' },
  { type: 'Deserialização Insegura', re: /JSON\.parse\s*\([^)]*req\.|unserialize\(|pickle\.loads/, severity: 'ALTO', cve_ref: 'CWE-502', description: 'Deserialização de dados não confiáveis[...]' },
  { type: 'SQL Concatenado', re: /["']\s*\+\s*(req\.|params\.|query\.|body\.)/, severity: 'CRÍTICO', cve_ref: 'CWE-89', description: 'Construção de query SQL por concatenação com input do us[...]' },
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

// --- Segurança / validação básica e provenance ---
const MAX_PAYLOAD_BYTES = 256 * 1024; // 256 KB
const MAX_ROWS = 20000; // limite preventivo para análises pesadas
const PROVENANCE_DIR = path.resolve(__dirname, '..', '..', 'data');
const PROVENANCE_FILE = path.join(PROVENANCE_DIR, 'provenance.jsonl');

export const SENSITIVE_PATTERNS = [
  /token/i,
  /password/i,
  /secret/i,
  /api_?key/i,
  /auth/i,
  /credential/i,
  /private_?key/i,
  /bearer/i,
];

export function maskSensitive(obj: unknown): unknown {
  if (obj === null || obj === undefined) return obj;
  if (typeof obj === 'string') {
    if (SENSITIVE_PATTERNS.some((re) => re.test(obj)) && obj.length > 8) {
      return `${obj.slice(0, 4)}****${obj.slice(-4)}`;
    }
    return obj;
  }
  if (Array.isArray(obj)) {
    return obj.map((v) => maskSensitive(v));
  }
  if (typeof obj === 'object') {
    const masked: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj)) {
      if (SENSITIVE_PATTERNS.some((re) => re.test(key))) {
        const v = value as string;
        if (typeof v === 'string' && v.length > 4) {
          masked[key] = `${v.slice(0, 2)}****${v.slice(-2)}`;
        } else {
          masked[key] = '****';
        }
      } else {
        masked[key] = maskSensitive(value);
      }
    }
    return masked;
  }
  return obj;
}

export function ensureProvenanceDir() {
  if (!fs.existsSync(PROVENANCE_DIR)) {
    fs.mkdirSync(PROVENANCE_DIR, { recursive: true });
  }
}

export function hashObject(obj: unknown) {
  const s = JSON.stringify(obj, Object.keys(obj as any).sort());
  return crypto.createHash('sha256').update(s).digest('hex');
}

export function recordProvenance(entry: Record<string, unknown>) {
  try {
    ensureProvenanceDir();
    const clean = maskSensitive(entry) as Record<string, unknown>;
    const line = JSON.stringify(clean) + '\n';
    fs.appendFileSync(PROVENANCE_FILE, line, { encoding: 'utf8' });
  } catch (err) {
    console.error('Falha ao gravar provenance:', err);
  }
}

export function sizeOf(obj: unknown) {
  try {
    return Buffer.byteLength(JSON.stringify(obj), 'utf8');
  } catch {
    return Infinity;
  }
}

export function validateArgsByMetadata(toolName: string, args: any): { ok: boolean; error?: string } {
  const meta = availableTools.find((t) => t.name === toolName);
  if (!meta) return { ok: false, error: 'Ferramenta desconhecida.' };
  const expected = (meta as any).parameters ?? {};
  for (const [k, typ] of Object.entries(expected)) {
    if (!(k in args)) return { ok: false, error: `Parâmetro obrigatório ausente: ${k}` };
    const v = args[k];
    if (typ === 'string' && typeof v !== 'string') return { ok: false, error: `Parâmetro ${k} precisa ser string.` };
    if (typ === 'object' && (v === null || typeof v !== 'object')) return { ok: false, error: `Parâmetro ${k} precisa ser objeto.` };
  }
  return { ok: true };
}

export const handleToolExecution = async (req: Request, res: Response) => {
  const { toolName, args } = req.body;

  if (!toolName || !args) {
    return res.status(400).json({ error: 'toolName e args são obrigatórios.' });
  }

  // Payload size check
  const payloadSize = sizeOf(args);
  if (payloadSize > MAX_PAYLOAD_BYTES) {
    return res.status(413).json({ error: `Payload muito grande (${payloadSize} bytes). Máx ${MAX_PAYLOAD_BYTES} bytes.` });
  }

  // Basic schema validation using availableTools metadata
  const validation = validateArgsByMetadata(toolName, args);
  if (!validation.ok) {
    return res.status(400).json({ error: `Validação de parâmetros falhou: ${validation.error}` });
  }

  console.log(`[Tool Executor Backend] Ferramenta: ${toolName}`);

  const provenanceBase = {
    timestamp: new Date().toISOString(),
    tool: toolName,
    args_hash: hashObject(args),
    args_summary: typeof args === 'object' ? Object.keys(args) : typeof args
  } as Record<string, unknown>;

  try {
    if (toolName === 'github_list_repos') {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10_000);
      const response = await octokit.rest.repos.listForUser({
        username: args.username,
        per_page: 5,
        sort: 'updated',
        request: { signal: (controller as any).signal }
      });
      clearTimeout(timeout);
      const repos = response.data.map((repo: any) => repo.name).join(', ');
      const result = { result: `Últimos 5 repositórios públicos de ${args.username}: [${repos || 'Nenhum'}]` };
      recordProvenance({ ...provenanceBase, result_hash: hashObject(result), result });
      return res.json(result);
    }

    if (toolName === 'github_create_issue') {
      const response = await octokit.rest.issues.create({
        owner: args.owner,
        repo: args.repo,
        title: args.title,
        body: args.body
      });
      const result = { result: `Issue "${args.title}" criada com sucesso em ${args.owner}/${args.repo}! Link: ${response.data.html_url}` };
      recordProvenance({ ...provenanceBase, result_hash: hashObject(result), result });
      return res.json(result);
    }

    if (toolName === 'get_current_time') {
      const now = new Date();
      const result = { result: `A data e hora atual no servidor longo é: ${now.toLocaleString('pt-BR')}` };
      recordProvenance({ ...provenanceBase, result_hash: hashObject(result), result });
      return res.json(result);
    }

    if (toolName === 'calculate_math') {
       try {
         const resultVal = safeEval(String(args.expression));
         const result = { result: `O resultado de ${args.expression} é ${resultVal}` };
         recordProvenance({ ...provenanceBase, result_hash: hashObject(result), result });
         return res.json(result);
       } catch(e: any) {
         const errRes = { error: `Expressão matemática inválida: ${String(args.expression)}` };
         recordProvenance({ ...provenanceBase, error: String(e), result_hash: hashObject(errRes), result: errRes });
         return res.status(400).json(errRes);
       }
    }

    if (toolName === 'store_memory') {
       memoryStore[args.key] = args.value;
       const result = { result: `Valor salvo com sucesso na chave '${args.key}'.` };
       recordProvenance({ ...provenanceBase, result_hash: hashObject(result), result });
       return res.json(result);
    }

    if (toolName === 'retrieve_memory') {
       const val = memoryStore[args.key];
       const result = val ? { result: `Memória na chave '${args.key}': ${val}` } : { result: `Não encontrei nada salvo com a chave '${args.key}'.` };
       recordProvenance({ ...provenanceBase, result_hash: hashObject(result), result });
       return res.json(result);
    }

    if (toolName in ANALYSIS_TOOL_MAP) {
      // Validate data size/shape to avoid blocking CPU for too long
      const data = args.data;
      // Basic row count estimation
      let rows = 0;
      if (Array.isArray(data)) rows = data.length;
      else if (data && typeof data === 'object') {
        const first = Object.values(data)[0];
        if (Array.isArray(first)) rows = first.length;
      }
      if (rows > MAX_ROWS) {
        return res.status(413).json({ error: `Dataset muito grande (${rows} linhas). Máx suportado: ${MAX_ROWS}.` });
      }

      try {
        const result = executeAnalysis({
          data: args.data,
          analysisType: ANALYSIS_TOOL_MAP[toolName],
          targetColumn: args.target_column
        });
        recordProvenance({ ...provenanceBase, result_hash: hashObject(result), result });
        return res.json({ result, analysis: result });
      } catch (err: any) {
        const isValidation = typeof err.message === 'string' && err.message.startsWith('Erro_');
        recordProvenance({ ...provenanceBase, error: String(err), result_hash: hashObject({ error: String(err) }) });
        return res.status(isValidation ? 400 : 500).json({ error: err.message || 'Falha na análise.' });
      }
    }

    if (toolName === 'scan_text_threats') {
      const resultStr = scanTextThreats(String(args.text ?? ''));
      const result = { result: resultStr };
      recordProvenance({ ...provenanceBase, result_hash: hashObject(result), result });
      return res.json(result);
    }

    if (toolName === 'analyze_code_security') {
      const resultStr = analyzeCodeSecurity(String(args.code ?? ''), String(args.language ?? 'unknown'));
      const result = { result: resultStr };
      recordProvenance({ ...provenanceBase, result_hash: hashObject(result), result });
      return res.json(result);
    }

    if (toolName === 'generate_security_report') {
      const resultStr = generateSecurityReport(String(args.findings ?? ''));
      const result = { result: resultStr };
      recordProvenance({ ...provenanceBase, result_hash: hashObject(result), result });
      return res.json(result);
    }

    return res.status(404).json({ error: 'Ferramenta não encontrada ou não habilitada no backend.' });
  } catch (error: any) {
    console.error(`Erro ao executar ferramenta ${toolName}:`, error);
    recordProvenance({ ...provenanceBase, error: String(error), result_hash: hashObject({ error: String(error) }) });
    return res.status(500).json({ error: error.message });
  }
};
