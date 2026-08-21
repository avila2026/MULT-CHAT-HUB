import { Router, Request, Response, NextFunction } from 'express';
import { handleChat, handleChatStream } from '../controllers/chatController.js';
import { handleToolExecution, availableTools } from '../controllers/toolController.js';
import { handleClaudeSecurityStream } from '../controllers/claudeSecurityController.js';

const router = Router();

export function getActivationSecret(): string {
  return process.env.APP_ACTIVATION_SECRET?.trim() ?? '';
}

export function requireActivationSecret(req: Request, res: Response, next: NextFunction) {
  const configuredSecret = getActivationSecret();
  if (!configuredSecret) {
    return res.status(503).json({ error: 'Backend activation secret is not configured.' });
  }

  const authHeader = req.get('authorization') ?? '';
  const bearerSecret = authHeader.match(/^Bearer\s+(.+)$/i)?.[1]?.trim();
  const headerSecret = req.get('x-mch-activation-secret')?.trim();
  const providedSecret = headerSecret || bearerSecret || '';

  if (providedSecret !== configuredSecret) {
    return res.status(401).json({ error: 'Invalid or missing activation secret.' });
  }

  return next();
}

// Sliding-window rate limit: 30 requests per minute per IP.
// Expired entries are pruned on each check to avoid unbounded Map growth.
const _rlMap = new Map<string, { count: number; resetAt: number }>();

function rateLimit(req: Request, res: Response, next: NextFunction) {
  const ip = req.ip ?? 'unknown';
  const now = Date.now();
  const entry = _rlMap.get(ip);

  if (!entry || now > entry.resetAt) {
    // Prune all expired entries on each new window to prevent memory leak
    for (const [key, val] of _rlMap) {
      if (now > val.resetAt) _rlMap.delete(key);
    }
    _rlMap.set(ip, { count: 1, resetAt: now + 60_000 });
    return next();
  }
  if (entry.count >= 30) {
    return res.status(429).json({ error: 'Muitas requisições. Tente novamente em 1 minuto.' });
  }
  entry.count++;
  return next();
}

// Public endpoint: /api/tools exposes only the static tool catalog needed to render
// the UI. It intentionally remains unauthenticated; tool execution is protected.
router.get('/tools', (_req, res) => {
  res.json(availableTools);
});

// All routes registered below this middleware require the activation secret via
// Authorization: Bearer <secret> or x-mch-activation-secret. /health is declared
// in server/index.ts outside /api and intentionally remains public for probes.
router.use(requireActivationSecret);

router.post('/chat', handleChat);
router.post('/chat/stream', rateLimit, handleChatStream);
router.post('/chat/claude-security', rateLimit, handleClaudeSecurityStream);
router.post('/tools/execute', rateLimit, handleToolExecution);

export default router;
