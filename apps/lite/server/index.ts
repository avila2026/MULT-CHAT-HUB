import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import apiRoutes from './routes/api.js';

// Carrega as variaveis de ambiente, caso estejam no .env.local ou .env
dotenv.config({ path: '.env.local' });
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Permite apenas origens localhost em desenvolvimento e o próprio app Electron (file://)
const ALLOWED_ORIGINS = [
  'http://localhost:5173',
  'http://localhost:4173',
  `http://localhost:${PORT}`,
  'file://',
];
app.use(cors({
  origin: (origin: string | undefined, cb: (err: Error | null, allow?: boolean) => void) => {
    if (!origin || ALLOWED_ORIGINS.some((o) => origin.startsWith(o))) cb(null, true);
    else cb(new Error(`CORS bloqueado: ${origin}`));
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
