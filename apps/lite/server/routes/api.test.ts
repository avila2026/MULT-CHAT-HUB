import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import express from 'express';
import { requireActivationSecret } from './api.js';

interface JsonResponse {
  status: number;
  body: unknown;
}

function listen(app: express.Express): Promise<{ port: number; close: () => Promise<void> }> {
  return new Promise((resolve, reject) => {
    const server = app.listen(0, () => {
      const address = server.address();
      if (!address || typeof address === 'string') {
        reject(new Error('Unable to allocate test port'));
        return;
      }
      resolve({
        port: address.port,
        close: () => new Promise<void>((res, rej) => server.close((err) => (err ? rej(err) : res()))),
      });
    });
  });
}

async function request(port: number, path: string, headers: Record<string, string> = {}): Promise<JsonResponse> {
  const res = await fetch(`http://127.0.0.1:${port}${path}`, { headers });
  return { status: res.status, body: await res.json() };
}

async function run() {
  const startup = spawnSync(process.execPath, ['node_modules/tsx/dist/cli.mjs', 'server/index.ts'], {
    cwd: new URL('../../', import.meta.url),
    env: { ...process.env, APP_ACTIVATION_SECRET: '', PORT: '0' },
    encoding: 'utf8',
    timeout: 10_000,
  });
  assert.equal(startup.status, 1, 'server startup must exit non-zero without APP_ACTIVATION_SECRET');
  assert.match(startup.stderr, /missing_app_activation_secret|APP_ACTIVATION_SECRET/, 'startup error should explain missing secret');

  const previousSecret = process.env.APP_ACTIVATION_SECRET;
  process.env.APP_ACTIVATION_SECRET = 'test-secret';

  const app = express();
  app.get('/health', (_req, res) => res.json({ ok: true }));
  app.get('/api/tools', (_req, res) => res.json([{ name: 'public_catalog' }]));
  app.use('/api', requireActivationSecret);
  app.get('/api/protected', (_req, res) => res.json({ ok: true }));

  const server = await listen(app);
  try {
    const health = await request(server.port, '/health');
    assert.equal(health.status, 200, '/health should remain public');

    const tools = await request(server.port, '/api/tools');
    assert.equal(tools.status, 200, '/api/tools should remain public');

    const missing = await request(server.port, '/api/protected');
    assert.equal(missing.status, 401, 'missing activation secret should be rejected');

    const invalid = await request(server.port, '/api/protected', { 'x-mch-activation-secret': 'wrong' });
    assert.equal(invalid.status, 401, 'invalid activation secret should be rejected');

    const validHeader = await request(server.port, '/api/protected', { 'x-mch-activation-secret': 'test-secret' });
    assert.equal(validHeader.status, 200, 'valid x-mch-activation-secret should be accepted');

    const validBearer = await request(server.port, '/api/protected', { Authorization: 'Bearer test-secret' });
    assert.equal(validBearer.status, 200, 'valid Authorization bearer secret should be accepted');
  } finally {
    await server.close();
    if (previousSecret === undefined) {
      delete process.env.APP_ACTIVATION_SECRET;
    } else {
      process.env.APP_ACTIVATION_SECRET = previousSecret;
    }
  }
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
