import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import apiRoutes from './routes/api.js';
// Carrega as variaveis de ambiente, caso estejam no .env.local ou .env
dotenv.config({ path: '.env.local' });
dotenv.config();
var app = express();
var PORT = process.env.PORT || 3000;
app.use(cors());
app.use(express.json());
// Registro das rotas da API Proxy
app.use('/api', apiRoutes);
app.get('/health', function (req, res) {
    res.json({ status: 'ok', message: 'Backend proxy is running.' });
});
app.listen(PORT, function () {
    console.log("[Express Backend] Rodando em http://localhost:".concat(PORT));
});
