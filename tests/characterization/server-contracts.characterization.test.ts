import { test } from 'node:test';
import * as assert from 'node:assert/strict';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

const PORT = 3000;
const BASE_URL = `http://127.0.0.1:${PORT}`;

const currentFile = fileURLToPath(import.meta.url);
const rootDir = path.resolve(path.dirname(currentFile), '../..');

test('[VALIDO] GET / responde HTTP 200 y contenido HTML', async () => {
  try {
    const response = await fetch(BASE_URL);
    assert.equal(response.status, 200);
    const text = await response.text();
    assert.ok(text.toLowerCase().includes('<html'));
  } catch (e) {
    assert.fail(`Servidor no disponible en ${BASE_URL}. Asegúrate de que npm run build y npm start o dev estén en ejecución.`);
  }
});

for (const route of ['/api/audit/pvpc', '/api/audit/scan-bill', '/api/audit/compare-market', '/api/gemini/chat']) {
  test(`[SEGURIDAD] POST ${route} sin sesi?n responde HTTP 401`, async () => {
    const response = await fetch(`${BASE_URL}${route}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}'
    });
    assert.equal(response.status, 401);
  });
}

test('[ESTATICO] rutas servidor', () => {
  const serverTs = fs.readFileSync(path.join(rootDir, 'server.ts'), 'utf-8');
  assert.ok(serverTs.includes('/api/audit/pvpc'));
  assert.ok(serverTs.includes('/api/audit/scan-bill'));
  assert.ok(serverTs.includes('/api/audit/compare-market'));
  assert.ok(serverTs.includes('/api/gemini/chat'));
});

test('[ESTATICO] límite de cuerpo', () => {
  const serverTs = fs.readFileSync(path.join(rootDir, 'server.ts'), 'utf-8');
  const security = fs.readFileSync(path.join(rootDir, 'functions/security.ts'), 'utf-8');
  assert.ok(security.includes("limit: '10mb'"));
});

test('[ESTATICO] seguridad', () => {
  const serverTs = fs.readFileSync(path.join(rootDir, 'server.ts'), 'utf-8');
  assert.ok(serverTs.includes('configureApiSecurity'));
  assert.ok(serverTs.includes('verifyIdToken(token, true)'));
});

test('[ESTATICO] fallback PVPC', () => {
  const serverTs = fs.readFileSync(path.join(rootDir, 'server.ts'), 'utf-8');
  assert.ok(serverTs.includes('DEMO_PVPC_DATA') || serverTs.includes('primavera') || serverTs.includes('verano'), 'Falta fallback PVPC');
});

test('[ESTATICO] fallback de mercado', () => {
  const serverTs = fs.readFileSync(path.join(rootDir, 'server.ts'), 'utf-8');
  assert.ok(serverTs.includes('Octopus 3') || serverTs.includes('fallbackOffers'), 'Falta fallback de mercado');
});

test('[DEFECTO_CONOCIDO] el escáner contiene una plantilla ficticia de respaldo', () => {
  const serverTs = fs.readFileSync(path.join(rootDir, 'server.ts'), 'utf-8');
  assert.ok(serverTs.includes('kwPunta: 4.4'));
  assert.ok(serverTs.includes('kwValle: 4.4'));
  assert.ok(serverTs.includes('kwhPunta: 100'));
  assert.ok(serverTs.includes('kwhLlano: 120'));
  assert.ok(serverTs.includes('kwhValle: 140'));
  assert.ok(serverTs.includes('costeTotal: 65.42'));
  assert.ok(serverTs.includes('plantilla de factura promedio'));
  assert.ok(serverTs.includes('return res.json(defaultParsedData)'));
});

test('[ESTATICO] fallback del chat', () => {
  const serverTs = fs.readFileSync(path.join(rootDir, 'server.ts'), 'utf-8');
  assert.ok(serverTs.includes('Lo siento') || serverTs.includes('fallback') || serverTs.includes('offline'), 'Falta fallback local del chat');
});

test('[VALIDO] REE dispone de timeout: 6000', () => {
  const serverTs = fs.readFileSync(path.join(rootDir, 'server.ts'), 'utf-8');
  assert.ok(serverTs.includes('timeout(6000)') || serverTs.includes('timeout: 6000'), 'Falta timeout de 6000 para REE');
});

test('[DEFECTO_CONOCIDO] Gemini no dispone de cancelación o timeout explícito', () => {
  const serverTs = fs.readFileSync(path.join(rootDir, 'server.ts'), 'utf-8');
  assert.ok(serverTs.includes('generateContent'), 'Debe existir llamada a generateContent');
  
  const generateContentCalls = serverTs.split('generateContent({').slice(1);
  assert.ok(generateContentCalls.length > 0, 'Debe haber llamadas a generateContent');
  
  for (const call of generateContentCalls) {
    const callBody = call.split('});')[0];
    assert.ok(!callBody.includes('AbortController'), 'No debe existir AbortController en llamadas Gemini');
    assert.ok(!callBody.includes('AbortSignal.timeout'), 'No debe existir AbortSignal.timeout en llamadas Gemini');
    assert.ok(!callBody.includes('signal:'), 'No debe existir señal de cancelación aplicada a las llamadas Gemini');
  }
});
