import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import apiRoutes from './routes/api.js';

// Carrega as variaveis de ambiente, caso estejam no .env.local ou .env
dotenv.config({ path: '.env.local' });
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Permite apenas origens localhost e o próprio app Electron.
// Electron via file:// envia Origin: null — tratado explicitamente abaixo.
const ALLOWED_ORIGINS = [
  'http://localhost:3001', // Vite dev server (pnpm dev)
  'http://localhost:5173', // Vite dev fallback
  'http://localhost:4173', // Vite preview
  `http://localhost:${PORT}`,
];
app.use(cors({
  origin: (origin: string | undefined, cb: (err: Error | null, allow?: boolean) => void) => {
    // origin === undefined  → same-origin / non-browser (curl, Electron ipcRenderer)
    // origin === 'null'     → Electron file:// pages send "Origin: null"
    if (!origin || origin === 'null' || ALLOWED_ORIGINS.some((o) => origin.startsWith(o))) {
      cb(null, true);
    } else {
      cb(new Error(`CORS bloqueado: ${origin}`));
    }
  },
}));
app.use(express.json({ limit: '1mb' }));

// Registro das rotas da API Proxy
app.use('/api', apiRoutes);

app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'Backend proxy is running.' });
});

app.listen(PORT, () => {
  console.log(`[Express Backend] Rodando em http://localhost:${PORT}`);
});
