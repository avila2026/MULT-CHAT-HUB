// Parser CSV simples — suporta aspas em campos, separador vírgula.
export function parseCsv(text: string): Record<string, number[]> {
  const lines = text.replace(/\r\n/g, '\n').split('\n').filter((l) => l.trim().length > 0);
  if (lines.length < 2) throw new Error('CSV vazio ou apenas com cabeçalho.');
  const headers = splitCsvLine(lines[0]);
  const cols: Record<string, number[]> = {};
  headers.forEach((h) => { cols[h] = []; });
  for (let i = 1; i < lines.length; i++) {
    const values = splitCsvLine(lines[i]);
    headers.forEach((h, idx) => {
      const raw = values[idx] ?? '';
      const num = Number(raw);
      cols[h].push(Number.isFinite(num) && raw !== '' ? num : NaN);
    });
  }
  const out: Record<string, number[]> = {};
  for (const [k, arr] of Object.entries(cols)) {
    if (arr.some((v) => Number.isFinite(v))) out[k] = arr;
  }
  if (Object.keys(out).length === 0) throw new Error('CSV sem colunas numéricas.');
  return out;
}

function splitCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') { inQuotes = !inQuotes; continue; }
    if (ch === ',' && !inQuotes) { out.push(cur.trim()); cur = ''; continue; }
    cur += ch;
  }
  out.push(cur.trim());
  return out;
}

// Extrai o JSON balanceado a partir do índice — retorna {json, end} ou null.
export function extractBalancedJson(text: string, start: number): { json: string; end: number } | null {
  if (text[start] !== '{') return null;
  let depth = 0;
  let inStr = false;
  let escape = false;
  for (let i = start; i < text.length; i++) {
    const c = text[i];
    if (escape) { escape = false; continue; }
    if (c === '\\') { escape = true; continue; }
    if (c === '"') { inStr = !inStr; continue; }
    if (inStr) continue;
    if (c === '{') depth++;
    else if (c === '}') {
      depth--;
      if (depth === 0) return { json: text.slice(start, i + 1), end: i + 1 };
    }
  }
  return null;
}

// Gera um ID único de mensagem.
export function newMsgId(): string {
  return typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}
