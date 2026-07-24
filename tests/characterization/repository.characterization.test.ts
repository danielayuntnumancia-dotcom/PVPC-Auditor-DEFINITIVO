import { test } from 'node:test';
import * as assert from 'node:assert/strict';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

const currentFile = fileURLToPath(import.meta.url);
const rootDir = path.resolve(path.dirname(currentFile), '../..');

test('[ESTATICO] lockfiles', () => {
  assert.equal(fs.existsSync(path.join(rootDir, 'package.json')), true, `Falta package.json en ${rootDir}`);
  assert.equal(fs.existsSync(path.join(rootDir, 'src', 'App.tsx')), true, `Falta src/App.tsx en ${rootDir}`);
  assert.equal(fs.existsSync(path.join(rootDir, 'bun.lock')), false, `bun.lock no debería existir en ${rootDir}`);
  assert.equal(fs.existsSync(path.join(rootDir, 'package-lock.json')), true, `Falta package-lock.json en ${rootDir}`);
});

test('[ESTATICO] reglas Firestore', () => {
  assert.equal(fs.existsSync(path.join(rootDir, 'firestore.rules')), true);
  assert.equal(fs.existsSync(path.join(rootDir, 'DRAFT_firestore.rules')), true);
  const rules = fs.readFileSync(path.join(rootDir, 'firestore.rules'), 'utf-8');
  const draftRules = fs.readFileSync(path.join(rootDir, 'DRAFT_firestore.rules'), 'utf-8');
  assert.equal(rules, draftRules);
});

test('[ESTATICO] .env.example', () => {
  const envExample = fs.readFileSync(path.join(rootDir, '.env.example'), 'utf-8');
  assert.ok(!envExample.includes('AIza'), '.env.example contiene una clave que parece real');
});

test('[ESTATICO] capturas', () => {
  for (let i = 1; i <= 10; i++) {
    const filename = (i === 1) ? '01_calculadora_web_01.png' :
                     (i === 2) ? '02_calculadora_web_02.png' :
                     (i === 3) ? '03_asesor_ia_web_01_fuentes_desplegadas.png' :
                     (i === 4) ? '04_asesor_ia_web_02_fuentes_plegadas.png' :
                     (i === 5) ? '05_comparador_web_01.png' :
                     (i === 6) ? '06_comparador_web_02.png' :
                     (i === 7) ? '07_historial_facturas_web_01.png' :
                     (i === 8) ? '08_historial_facturas_web_02.png' :
                     (i === 9) ? '09_historial_simulaciones_web_01.png' :
                     '10_historial_simulaciones_web_02.png';
    assert.equal(fs.existsSync(path.join(rootDir, 'project-context', 'screenshots', filename)), true, `Falta ${filename}`);
  }
});

test('[ESTATICO] documentos vigentes', () => {
  assert.equal(fs.existsSync(path.join(rootDir, 'project-context', '00_INDICE.md')), true);
  assert.equal(fs.existsSync(path.join(rootDir, 'project-context', '01_INFORME_FUNCIONAL_V2.md')), true);
  assert.equal(fs.existsSync(path.join(rootDir, 'project-context', '02_DISENO_Y_PROTOTIPADO_V3.md')), true);
  assert.equal(fs.existsSync(path.join(rootDir, 'project-context', '03_ARQUITECTURA_E_IMPLEMENTACION_V3.md')), true);
  assert.equal(fs.existsSync(path.join(rootDir, 'project-context', '04_INVENTARIO_CAPTURAS_V1.md')), true);
  assert.equal(fs.existsSync(path.join(rootDir, 'project-context', '07_AUDITORIA_REPOSITORIO_POST_SANEAMIENTO_V2.md')), true);
  assert.equal(fs.existsSync(path.join(rootDir, 'project-context', '10_REPORTE_FASE_0_V2.md')), true);
  assert.equal(fs.existsSync(path.join(rootDir, 'project-context', '11_PROMPT_01_CARACTERIZACION_V1.md')), true);
});

test('[ESTATICO] archivos de producción', () => {
  assert.equal(fs.existsSync(path.join(rootDir, 'src', 'App.tsx')), true);
  assert.equal(fs.existsSync(path.join(rootDir, 'src', 'utils.ts')), true);
  assert.equal(fs.existsSync(path.join(rootDir, 'src', 'types.ts')), true);
  assert.equal(fs.existsSync(path.join(rootDir, 'server.ts')), true);
  
  // Extraidos
  assert.equal(fs.existsSync(path.join(rootDir, 'src', 'domain', 'billing', 'types.ts')), true);
  assert.equal(fs.existsSync(path.join(rootDir, 'src', 'domain', 'billing', 'defaults.ts')), true);
  assert.equal(fs.existsSync(path.join(rootDir, 'src', 'domain', 'billing', 'calculateBill.ts')), true);
  assert.equal(fs.existsSync(path.join(rootDir, 'src', 'domain', 'billing', 'index.ts')), true);
});

test('[ESTATICO] componentes residuales', () => {
  assert.equal(fs.existsSync(path.join(rootDir, 'src', 'components', 'BillOptimizer.tsx')), true);
  assert.equal(fs.existsSync(path.join(rootDir, 'src', 'components', 'ChatBot.tsx')), true);
  assert.equal(fs.existsSync(path.join(rootDir, 'src', 'components', 'Scanner.tsx')), true);
});

test('[ESTATICO] dependencias principales', () => {
  const pkg = JSON.parse(fs.readFileSync(path.join(rootDir, 'package.json'), 'utf-8'));
  assert.ok(pkg.dependencies['react']);
  assert.ok(pkg.dependencies['vite'] || pkg.devDependencies['vite']);
  assert.ok(pkg.dependencies['express']);
});
