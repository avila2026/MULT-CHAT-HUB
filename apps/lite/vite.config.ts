import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig } from 'vite';

export default defineConfig(({ mode }) => {
  // base relativa './' apenas no build do Electron (carrega via file://);
  // em web (Vercel/dev) usa '/' absoluto para evitar que sub-rotas
  // (e o SPA rewrite do vercel.json) quebrem o resolvimento de assets.
  const base = mode.startsWith('electron') ? './' : '/';
  return {
    base,
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR desabilitado via DISABLE_HMR=true (AI Studio).
      // Watch ficou desligado no projeto original para reduzir flicker.
      hmr: process.env.DISABLE_HMR !== 'true',
      proxy: {
        '/api': {
          target: 'http://localhost:3000',
          changeOrigin: true,
        },
      },
    },
    build: {
      // Code splitting: separa o bundle em chunks logicos para reduzir o
      // initial load. recharts/d3 e o engine analitico (ml-regression +
      // lp-solver) ficam em chunks proprios que so sao baixados quando
      // realmente necessarios.
      rollupOptions: {
        output: {
          manualChunks: {
            charts: ['recharts'],
            'analysis-engine': ['ml-regression-multivariate-linear', 'javascript-lp-solver'],
          },
        },
      },
    },
  };
});
