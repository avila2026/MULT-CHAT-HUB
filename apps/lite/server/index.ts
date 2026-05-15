import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import apiRoutes from './routes/api.js';

dotenv.config({ path: '.env.local' });
dotenv.config();

// ── Activation guard ──────────────────────────────────────────────────────────
// Server refuses to start if APP_ACTIVATION_SECRET is not set.
// Store the real value in apps/lite/.env.local (gitignored — never commit it).
if (!process.env.APP_ACTIVATION_SECRET) {
  console.error(JSON.stringify({
    ts: new Date().toISOString(),
    level: 'ERROR',
    msg: 'server_activation_failed',
    detail: 'APP_ACTIVATION_SECRET não configurada. Crie apps/lite/.env.local com o valor correto.',
  }));
  process.exit(1);
}

const app = express();
const PORT = process.env.PORT || 3000;
const OLLAMA_HOST = process.env.OLLAMA_HOST || 'http://localhost:11434';

// ── Structured request logger ─────────────────────────────────────────────────
app.use((req: Request, _res: Response, next: NextFunction) => {
  (req as Request & { id: string; t0: number }).id = crypto.randomUUID().slice(0, 8);
  (req as Request & { id: string; t0: number }).t0 = Date.now();
  next();
});

app.use((req: Request, res: Response, next: NextFunction) => {
  res.on('finish', () => {
    const r = req as Request & { id: string; t0: number };
    const entry = {
      ts: new Date().toISOString(),
      level: res.statusCode >= 500 ? 'ERROR' : res.statusCode >= 400 ? 'WARN' : 'INFO',
      reqId: r.id,
      method: req.method,
      path: req.path,
      status: res.statusCode,
      durationMs: Date.now() - r.t0,
    };
    console.log(JSON.stringify(entry));
  });
  next();
});

// ── CORS ──────────────────────────────────────────────────────────────────────
// Electron via file:// envia Origin: null — tratado explicitamente abaixo.
const ALLOWED_ORIGINS = [
  'http://localhost:3001', // Vite dev server
  'http://localhost:5173', // Vite dev fallback
  'http://localhost:4173', // Vite preview
  `http://localhost:${PORT}`,
];
app.use(cors({
  origin: (origin: string | undefined, cb: (err: Error | null, allow?: boolean) => void) => {
    if (!origin || origin === 'null' || ALLOWED_ORIGINS.some((o) => origin.startsWith(o))) {
      cb(null, true);
    } else {
      cb(new Error(`CORS bloqueado: ${origin}`));
    }
  },
}));

app.use(express.json({ limit: '1mb' }));

// ── Routes ────────────────────────────────────────────────────────────────────
app.use('/api', apiRoutes);

// ── Health (pinga Ollama ao vivo) ─────────────────────────────────────────────
app.get('/health', async (_req: Request, res: Response) => {
  const t0 = Date.now();
  let ollamaStatus: 'ok' | 'error' = 'error';
  let ollamaDetail = '';
  try {
    const r = await fetch(`${OLLAMA_HOST}/api/tags`, { signal: AbortSignal.timeout(3000) });
    if (r.ok) {
      ollamaStatus = 'ok';
    } else {
      ollamaDetail = `HTTP ${r.status}`;
    }
  } catch (e) {
    ollamaDetail = e instanceof Error ? e.message : String(e);
  }
  const healthy = ollamaStatus === 'ok';
  res.status(healthy ? 200 : 503).json({
    status: healthy ? 'ok' : 'degraded',
    backend: 'ok',
    ollama: ollamaStatus,
    ollamaHost: OLLAMA_HOST,
    ...(ollamaDetail ? { ollamaDetail } : {}),
    uptimeS: Math.floor(process.uptime()),
    checkMs: Date.now() - t0,
  });
});

app.listen(PORT, () => {
  console.log(JSON.stringify({
    ts: new Date().toISOString(),
    level: 'INFO',
    msg: 'server_started',
    port: PORT,
    ollamaHost: OLLAMA_HOST,
  }));
});
