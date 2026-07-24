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

test('[VALIDO] POST /api/audit/pvpc sin fechas responde HTTP 400', async () => {
  const response = await fetch(`${BASE_URL}/api/audit/pvpc`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({})
  });
  assert.equal(response.status, 400);
  const data = await response.json();
  assert.equal(data.error, 'Faltan las fechas de inicio y fin.');
});

test('[VALIDO] POST /api/audit/scan-bill sin imagen responde HTTP 400', async () => {
  const response = await fetch(`${BASE_URL}/api/audit/scan-bill`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({})
  });
  assert.equal(response.status, 400);
  const data = await response.json();
  assert.equal(data.error, 'Falta la imagen de la factura.');
});

test('[VALIDO] POST /api/audit/compare-market sin consumos responde HTTP 400', async () => {
  const response = await fetch(`${BASE_URL}/api/audit/compare-market`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({})
  });
  assert.equal(response.status, 400);
  const data = await response.json();
  assert.equal(data.error, 'Faltan los datos de consumo promedio.');
});

test('[ESTATICO] rutas servidor', () => {
  const serverTs = fs.readFileSync(path.join(rootDir, 'server.ts'), 'utf-8');
  assert.ok(serverTs.includes('/api/audit/pvpc'));
  assert.ok(serverTs.includes('/api/audit/scan-bill'));
  assert.ok(serverTs.includes('/api/audit/compare-market'));
  assert.ok(serverTs.includes('/api/gemini/chat'));
});

test('[ESTATICO] límite de cuerpo', () => {
  const serverTs = fs.readFileSync(path.join(rootDir, 'server.ts'), 'utf-8');
  assert.ok(serverTs.includes('limit: "50mb"'));
});

test('[ESTATICO] seguridad', () => {
  const serverTs = fs.readFileSync(path.join(rootDir, 'server.ts'), 'utf-8');
  assert.equal(serverTs.includes('rateLimit'), false);
  assert.equal(serverTs.includes('requireAuth'), false);
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
