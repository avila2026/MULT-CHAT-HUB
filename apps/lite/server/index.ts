import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import apiRoutes from './routes/api.js';

// Carrega as variaveis de ambiente, caso estejam no .env.local ou .env
dotenv.config({ path: '.env.local' });
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Registro das rotas da API Proxy
app.use('/api', apiRoutes);

app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'Backend proxy is running.' });
});

app.listen(PORT, () => {
  console.log(`[Express Backend] Rodando em http://localhost:${PORT}`);
});
