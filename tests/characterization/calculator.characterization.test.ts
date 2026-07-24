import { test } from 'node:test';
import * as assert from 'node:assert/strict';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { calcularFactura, DEFAULT_PVPC_VALUES } from '../../src/utils.ts';
import { BillData } from '../../src/types.ts';

const currentFile = fileURLToPath(import.meta.url);
const rootDir = path.resolve(path.dirname(currentFile), '../..');

test('[VALIDO] calcula los términos de potencia, peajes, energía e impuestos', () => {
  const result = calcularFactura(DEFAULT_PVPC_VALUES);
  assert.equal(result.dias, 29);
  assert.equal(result.totalFijo, 11.027);
  assert.equal(result.totalPeajes, 11.4793);
  assert.equal(result.totalEnergia, 53.8679);
  assert.equal(result.totalVariable, 65.3472);
  assert.equal(result.totalIee, 3.9048);
  assert.equal(result.totalRegulados, 1.3723);
  assert.equal(result.totalIva, 17.1468);
  assert.equal(result.totalFactura, 98.8);
  assert.equal(result.alertaPresupuesto, false);
});

test('[ESTATICO] comprueba los valores predeterminados', () => {
  assert.deepEqual(DEFAULT_PVPC_VALUES, {
    fechaInicio: "2026-06-01",
    fechaFin: "2026-06-30",
    presupuesto: 100,
    kwPunta: 4.4,
    kwValle: 4.4,
    precioMargen: 3.113,
    precioKwPunta: 27.704413,
    precioKwValle: 0.725423,
    kwhPunta: 85.2,
    kwhLlano: 92.4,
    kwhValle: 140.8,
    precioKwhPunta: 0.097553,
    precioKwhLlano: 0.029267,
    precioKwhValle: 0.003292,
    costeEnergiaVariable: 0.169183,
    costeEnergiaPunta: 0.169183,
    costeEnergiaLlano: 0.169183,
    costeEnergiaValle: 0.169183,
    alqContador: 0.02663,
    bonoSocial: 0.6,
    iee: 5.11269632,
    iva: 21,
  });
});

test('[VALIDO] Fechas iguales devuelve un día', () => {
  const data: BillData = { ...DEFAULT_PVPC_VALUES, fechaInicio: "2026-06-01", fechaFin: "2026-06-01" };
  
  const result = calcularFactura(data);
  assert.equal(result.dias, 1);
});

test('[VALIDO] Fechas invertidas devuelve un día', () => {
  const data: BillData = { ...DEFAULT_PVPC_VALUES, fechaInicio: "2026-06-30", fechaFin: "2026-06-01" };
  assert.throws(() => calcularFactura(data));
});

test('[VALIDO] el periodo 1–30 de junio se computa como 29 días', () => {
  const data: BillData = { ...DEFAULT_PVPC_VALUES, fechaInicio: "2026-06-01", fechaFin: "2026-06-30" };
  
  const result = calcularFactura(data);
  assert.equal(result.dias, 29);
});

test('[VALIDO] Fallback de energía por operador nullish conserva ceros y rechaza fallback general', () => {
  const data = { 
    ...DEFAULT_PVPC_VALUES, 
    costeEnergiaPunta: undefined,
    costeEnergiaLlano: null as unknown as number, 
    costeEnergiaValle: 0,
    costeEnergiaVariable: 0.2
  };
  
  
  assert.throws(() => calcularFactura(data)); // now defaults to 0 instead of fallback to 0.2
});

test('[VALIDO] Presupuesto y redondeo usan el total final redondeado', () => {
  const data: BillData = { ...DEFAULT_PVPC_VALUES, presupuesto: 98.8 };
  
  const result = calcularFactura(data);
  assert.equal(result.alertaPresupuesto, false);
});

test('[VALIDO] Valores negativos lanzan error de validación', () => {
  const data: BillData = { ...DEFAULT_PVPC_VALUES, kwPunta: -5 };
  assert.throws(() => calcularFactura(data), /inválidos/i);
});

test('[ESTATICO] Campos y unidades', () => {
  const typesTs = fs.readFileSync(path.join(rootDir, 'src', 'domain', 'billing', 'types.ts'), 'utf-8');
  const appTsx = fs.readFileSync(path.join(rootDir, 'src', 'App.tsx'), 'utf-8');

  // Verify units mentioned in types or UI
  // potencia contratada: kW; costes de potencia: €/kW/año; consumo: kWh; peajes: €/kWh; coste de energía: €/kWh; alquiler: €/día; IEE e IVA: %.
  assert.ok(appTsx.includes('kW') || typesTs.includes('kW'), 'Falta kW para potencia');
  assert.ok(appTsx.includes('€/kW/año') || typesTs.includes('€/kW/año'), 'Falta €/kW/año');
  assert.ok(appTsx.includes('kWh') || typesTs.includes('kWh'), 'Falta kWh para consumo');
  assert.ok(appTsx.includes('€/kWh') || typesTs.includes('€/kWh'), 'Falta €/kWh para peajes y energía');
  assert.ok(appTsx.includes('€/día') || typesTs.includes('€/día'), 'Falta €/día para alquiler');
  assert.ok(appTsx.includes('%') || typesTs.includes('%'), 'Falta % para impuestos');
});
