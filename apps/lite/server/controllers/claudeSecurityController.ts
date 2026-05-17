import Anthropic from '@anthropic-ai/sdk';
import type { Request, Response } from 'express';

const SECURITY_SYSTEM_PROMPT = `Você é o Agente de Cibersegurança do MULT-CHAT-HUB, especialista sênior em segurança da informação.

Suas competências incluem:
- Análise de vulnerabilidades e CVEs (OWASP Top 10, CWE)
- Pentest: reconhecimento, exploração e pós-exploração (contexto defensivo)
- Auditoria de código-fonte (SQL injection, XSS, SSRF, RCE, path traversal, IDOR)
- Hardening de servidores, APIs e aplicações web
- Análise de headers HTTP, configurações TLS/SSL e políticas de CORS
- Modelagem de ameaças (STRIDE, PASTA)
- Conformidade: LGPD, PCI-DSS, ISO 27001, SOC 2

Sempre responda em português brasileiro de forma técnica e estruturada.
Quando identificar vulnerabilidades, forneça: severity (CRÍTICO/ALTO/MÉDIO/BAIXO), CVE/CWE de referência e recomendação de mitigação.
Nunca forneça código malicioso pronto para uso — foque em explicação educacional e defensive security.`;

const CLAUDE_SECURITY_TIMEOUT_MS = 60_000;

let anthropicClient: Anthropic | null = null;

function getClient(): Anthropic {
  if (!anthropicClient) {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) throw new Error('ANTHROPIC_API_KEY não configurado. Adicione ao .env.local do backend.');
    anthropicClient = new Anthropic({ apiKey });
  }
  return anthropicClient;
}

interface HistoryMessage { role: 'user' | 'assistant'; content: string }

export const handleClaudeSecurityStream = async (req: Request, res: Response) => {
  const { input, history = [] } = req.body as { input: string; history: HistoryMessage[] };

  if (!input?.trim()) {
    return res.status(400).json({ error: 'Campo input é obrigatório.' });
  }

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders();

  const send = (payload: object) => res.write(`data: ${JSON.stringify(payload)}\n\n`);

  let clientGone = false;
  const controller = new AbortController();
  const timeoutHandle = setTimeout(() => controller.abort(), CLAUDE_SECURITY_TIMEOUT_MS);

  req.on('close', () => {
    clientGone = true;
    controller.abort();
    clearTimeout(timeoutHandle);
  });

  try {
    const client = getClient();

    const messages: HistoryMessage[] = [
      ...((history as HistoryMessage[]).slice(-20).filter((m) => m.role === 'user' || m.role === 'assistant')),
      { role: 'user', content: input },
    ];

    const tokens: string[] = [];

    const stream = await client.messages.stream({
      model: 'claude-sonnet-4-6',
      max_tokens: 4096,
      system: SECURITY_SYSTEM_PROMPT,
      messages,
    });

    for await (const event of stream) {
      if (clientGone) break;
      if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
        const token = event.delta.text;
        tokens.push(token);
        send({ token });
      }
    }

    if (!clientGone) {
      clearTimeout(timeoutHandle);
      send({ done: true, text: tokens.join('') });
      res.end();
    }
  } catch (err: unknown) {
    clearTimeout(timeoutHandle);
    if (clientGone) return res.end();
    const isTimeout = err instanceof Error && err.name === 'AbortError';
    const msg = isTimeout
      ? `Claude API não respondeu em ${CLAUDE_SECURITY_TIMEOUT_MS / 1000}s. Verifique sua conexão.`
      : (err instanceof Error ? err.message : 'Erro interno no Agente de Cibersegurança.');
    send({ error: msg });
    res.end();
  }
};
