// Testes unitários de segurança e validação do toolController
// Executar: pnpm --filter @mch/lite exec tsx server/controllers/toolController.test.ts
import { maskSensitive, sizeOf, validateArgsByMetadata, hashObject } from './toolController.js';

function assert(condition: boolean, msg: string) {
  if (!condition) throw new Error(`FAIL: ${msg}`);
  console.log(`  ✓ ${msg}`);
}

function run(name: string, fn: () => void) {
  try {
    fn();
    console.log(`[PASS] ${name}`);
  } catch (e) {
    console.error(`[FAIL] ${name}: ${(e as Error).message}`);
    process.exitCode = 1;
  }
}

// =============================================
// 1. Payload acima de 256 KB → deve ser detectado
// =============================================
run('Payload > 256KB detectado por sizeOf()', () => {
  const bigArray = Array.from({ length: 30000 }, () => Math.random().toFixed(10));
  const payload = { toolName: 'analyze_descriptive', args: { data: { x: bigArray } } };
  const bytes = sizeOf(payload);
  assert(bytes > 256 * 1024, `bytes=${bytes} deve exceder 256KB`);
});

// =============================================
// 2. Parâmetro obrigatório ausente → falha de validação
// =============================================
run('Missing param em calculate_math → validateArgsByMetadata falha', () => {
  const r = validateArgsByMetadata('calculate_math', {});
  assert(r.ok === false, 'deve retornar ok=false');
  assert(/expression/.test(r.error || ''), `erro deve mencionar 'expression', foi: ${r.error}`);
});

run('Parâmetro com tipo incorreto → falha de validação', () => {
  const r = validateArgsByMetadata('calculate_math', { expression: 123 });
  assert(r.ok === false, 'deve retornar ok=false');
  assert(/string/.test(r.error || ''), `erro deve mencionar tipo string, foi: ${r.error}`);
});

// =============================================
// 3. calculate_math válido → passa na validação
// =============================================
run('calculate_math válido → validateArgsByMetadata passa', () => {
  const r = validateArgsByMetadata('calculate_math', { expression: '2+2' });
  assert(r.ok === true, 'deve retornar ok=true');
});

// =============================================
// 4. Segurança: maskSensitive → strings longas com padrões sensíveis são mascaradas
// =============================================
run('String sensível longa é mascarada', () => {
  const out = maskSensitive('sk-live-super-secret-token-99999') as string;
  assert(out.includes('****'), `deve conter ****, foi: ${out}`);
  assert(!out.includes('super-secret'), `não deve conter o segredo em texto plano`);
});

run('String sensível curta NÃO é mascarada (deixa passar)', () => {
  const out = maskSensitive('key') as string;
  assert(out === 'key', 'string curta deve permanecer intacta');
});

run('String NÃO sensível permanece intacta', () => {
  const out = maskSensitive('hello worlds normal text expression result') as string;
  assert(out === 'hello worlds normal text expression result', 'texto normal não deve ser alterado');
});

// =============================================
// 5. Segurança: maskSensitive → em objetos com chaves sensíveis
// =============================================
run('Objeto com chave "apiKey" tem valor mascarado', () => {
  const out = maskSensitive({ apiKey: 'super-secret-key-99999', name: 'teste' }) as Record<string, unknown>;
  const val = out.apiKey as string;
  assert(val.includes('****'), `apiKey deve ser mascarada, foi: ${val}`);
  assert(out.name === 'teste', 'chave normal deve permanecer intacta');
});

run('Objeto com chave "password" tem valor mascarado', () => {
  const out = maskSensitive({ password: 'mypassword12345', user: 'john' }) as Record<string, unknown>;
  const val = out.password as string;
  assert(val.includes('****'), `password deve ser mascarada, foi: ${val}`);
});

run('Objeto sem chaves sensíveis → mascarado recursivamente mas intacto', () => {
  const input = { data: { x: [1, 2, 3], y: [4, 5, 6] }, expression: '2+2' };
  const out = maskSensitive(input) as Record<string, unknown>;
  assert(JSON.stringify(out) === JSON.stringify(input), 'objeto sem sensíveis deve ser igual ao input');
});

// =============================================
// 6. Segurança: maskSensitive → arrays aninhados com valor sensível
// =============================================
run('Array com string sensível é mascarado', () => {
  const out = maskSensitive(['normal', 'sk-live-token-99999', 'ok']) as string[];
  assert(out[0] === 'normal', 'primeiro item intacto');
  assert(out[1].includes('****'), 'segundo item mascarado');
  assert(out[2] === 'ok', 'último item intacto');
});

// =============================================
// 7. hashObject → SHA-256 consistente
// =============================================
run('hashObject gera hashes determinísticos e com 64 hex chars', () => {
  const a = hashObject({ x: 1 });
  const b = hashObject({ x: 1 });
  assert(a === b, 'hash de objeto igual deve ser igual');
  assert(a.length === 64, `hash deve ter 64 chars, tem ${a.length}`);
  assert(/^[0-9a-f]{64}$/.test(a), 'hash deve ser hex');
});

run('hashObject é sensível à mudança de valor', () => {
  const a = hashObject({ x: 1 });
  const b = hashObject({ x: 2 });
  assert(a !== b, 'hash de objetos diferentes devem diferir');
});

console.log('\n=== Controller Security Tests ===');
console.log('Executando 13 testes de segurança e validação...\n');