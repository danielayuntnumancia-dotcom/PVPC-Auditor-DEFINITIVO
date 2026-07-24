import { test } from 'node:test';
import * as assert from 'node:assert/strict';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

const currentFile = fileURLToPath(import.meta.url);
const rootDir = path.resolve(path.dirname(currentFile), '../..');

test('[ESTATICO] comprobaciones estáticas de interfaz en App.tsx', () => {
  const appTsx = fs.readFileSync(path.join(rootDir, 'src', 'App.tsx'), 'utf-8');

  // cuatro áreas
  assert.ok(appTsx.includes('Calculadora'), 'Falta Calculadora');
  assert.ok(appTsx.includes('Asesor IA'), 'Falta Asesor IA');
  assert.ok(appTsx.includes('Historial'), 'Falta Historial');
  assert.ok(appTsx.includes('Comparador'), 'Falta Comparador');

  // potencia Punta y Valle, unidades kW, costes en €/kW/año
  assert.ok(appTsx.includes('Punta'), 'Falta Punta');
  assert.ok(appTsx.includes('Valle'), 'Falta Valle');
  assert.ok(appTsx.includes('kW'), 'Falta kW');
  assert.ok(appTsx.includes('€/kW/año'), 'Falta €/kW/año');

  // consumos P1, P2 y P3 en kWh, peajes y energía en €/kWh
  assert.ok(appTsx.includes('kWh'), 'Falta kWh');
  assert.ok(appTsx.includes('P1'), 'Falta P1');
  assert.ok(appTsx.includes('P2'), 'Falta P2');
  assert.ok(appTsx.includes('P3'), 'Falta P3');
  assert.ok(appTsx.includes('€/kWh'), 'Falta €/kWh');

  // Guardar Simulación, Guardar Factura Oficial
  assert.ok(appTsx.includes('Guardar Simulación'), 'Falta Guardar Simulación');
  assert.ok(appTsx.includes('Guardar Factura Oficial'), 'Falta Guardar Factura Oficial');
  
  // Sandbox, réplica de factura
  assert.ok(appTsx.includes('Sandbox'), 'Falta Sandbox');
  assert.ok(appTsx.includes('Réplica de Factura') || appTsx.includes('Factura Desglosada'), 'Falta la etiqueta específica de la réplica');

  // panel Fuentes, estado plegado y desplegado, texto vertical FUENTES
  assert.ok(appTsx.includes('isSourcesCollapsed') || appTsx.includes('setIsSourcesCollapsed'), 'Falta variable de estado de plegado');
  assert.ok(appTsx.includes('FUENTES'), 'Falta texto vertical FUENTES');

  // componentes importados/usados
  assert.ok(appTsx.includes('<BillChart'), 'Falta uso de BillChart');
  assert.ok(appTsx.includes('<ComparisonChart'), 'Falta uso de ComparisonChart');
  assert.ok(appTsx.includes('<CustomDatePicker'), 'Falta uso de CustomDatePicker');

  // navegación escritorio y móvil
  assert.ok(appTsx.includes('md:flex') || appTsx.includes('hidden md:block'), 'Falta navegación de escritorio');
  assert.ok(appTsx.includes('md:hidden') || appTsx.includes('bottom-0'), 'Falta navegación móvil');
});

test('[ESTATICO] Historial y persistencia en App.tsx', () => {
  const appTsx = fs.readFileSync(path.join(rootDir, 'src', 'App.tsx'), 'utf-8');

  assert.ok(appTsx.includes('pvpc_bill_data'), 'Falta clave localStorage pvpc_bill_data');
  assert.ok(appTsx.includes('pvpc_history'), 'Falta clave localStorage pvpc_history');
  assert.ok(appTsx.includes('pvpc_sources'), 'Falta clave localStorage pvpc_sources');
  assert.ok(appTsx.includes('pvpc_chats'), 'Falta clave localStorage pvpc_chats');

  assert.ok(appTsx.includes('simulacion'), 'Falta tipo simulacion');
  assert.ok(appTsx.includes('oficial'), 'Falta tipo oficial');
  
  // acciones de cargar, editar y eliminar
  assert.ok(appTsx.includes('Cargar') || appTsx.includes('cargarFactura'), 'Falta acción cargar');
  assert.ok(appTsx.includes('Editar') || appTsx.includes('editarFactura'), 'Falta acción editar');
  assert.ok(appTsx.includes('Eliminar') || appTsx.includes('deleteBill'), 'Falta acción eliminar');
  
  // deduplicación por fecha (buscamos un findIndex o filter relacionado con fechas en saveBill)
  assert.ok(appTsx.includes("item.dateStr !== todayStr || item.tipo !== 'simulacion'"), 'Falta comprobación exacta de deduplicación');

  // Firestore
  assert.ok(appTsx.includes('users/'), 'Falta ruta Firestore users/');
  assert.ok(appTsx.includes('uid') || appTsx.includes('${user.uid}'), 'Falta ruta uid');
  assert.ok(appTsx.includes('/profile') || appTsx.includes('profile'), 'Falta ruta profile');
  assert.ok(appTsx.includes('/history') || appTsx.includes('history'), 'Falta ruta history');
  assert.ok(appTsx.includes('/sources') || appTsx.includes('sources'), 'Falta ruta sources');
  assert.ok(appTsx.includes('/chats') || appTsx.includes('chats'), 'Falta ruta chats');

  assert.ok(appTsx.includes('if (!historySnap.empty)'), 'Falta comportamiento cloud-wins');
  assert.ok(appTsx.includes('else if (history.length > 0)') || appTsx.includes('else if (history && history.length > 0)'), 'Falta comportamiento seed-local');
  
  // Ausencia de control de versiones y resolución de conflictos (caracterizado por omisión)
  assert.equal(appTsx.includes('conflictResolution'), false, 'Se encontró una lógica de resolución de conflictos inexistente originalmente');
  assert.equal(appTsx.includes('version:'), false, 'Se encontró una lógica de versionado inexistente originalmente');
});

test('[ESTATICO] Responsive en App.tsx', () => {
  const appTsx = fs.readFileSync(path.join(rootDir, 'src', 'App.tsx'), 'utf-8');
  assert.ok(appTsx.includes('flex-col md:flex-row') || appTsx.includes('flex-col lg:flex-row'), 'Faltan clases responsive principales flex-col a row');
});
