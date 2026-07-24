import { test } from 'node:test';
import * as assert from 'node:assert/strict';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

// Validamos tanto las importaciones antiguas como las nuevas para garantizar equivalencia
import { BillData as OldBillData, BillResults as OldBillResults } from '../../src/types';
import { DEFAULT_PVPC_VALUES as OldDefaults, calcularFactura as oldCalcularFactura } from '../../src/utils';

import { BillData as NewBillData, BillResults as NewBillResults } from '../../src/domain/billing/types';
import { DEFAULT_PVPC_VALUES as NewDefaults } from '../../src/domain/billing/defaults';
import { calcularFactura as newCalcularFactura } from '../../src/domain/billing/calculateBill';

const currentFile = fileURLToPath(import.meta.url);
const rootDir = path.resolve(path.dirname(currentFile), '../..');

test('[ESTATICO] existe la nueva estructura de dominio', () => {
  assert.ok(fs.existsSync(path.join(rootDir, 'src', 'domain', 'billing', 'types.ts')), 'Falta types.ts');
  assert.ok(fs.existsSync(path.join(rootDir, 'src', 'domain', 'billing', 'defaults.ts')), 'Falta defaults.ts');
  assert.ok(fs.existsSync(path.join(rootDir, 'src', 'domain', 'billing', 'calculateBill.ts')), 'Falta calculateBill.ts');
  assert.ok(fs.existsSync(path.join(rootDir, 'src', 'domain', 'billing', 'index.ts')), 'Falta index.ts');
});

test('[ESTATICO] src/types.ts reexporta BillData y BillResults', () => {
  const typesTs = fs.readFileSync(path.join(rootDir, 'src', 'types.ts'), 'utf-8');
  assert.ok(typesTs.includes("import type { BillData, BillResults } from './domain/billing'"), 'Falta importar BillData y BillResults');
  assert.ok(typesTs.includes("export type { BillData, BillResults }"), 'Falta reexportar BillData y BillResults');
});

test('[ESTATICO] src/utils.ts reexporta DEFAULT_PVPC_VALUES y calcularFactura', () => {
  const utilsTs = fs.readFileSync(path.join(rootDir, 'src', 'utils.ts'), 'utf-8');
  assert.ok(utilsTs.includes("export { DEFAULT_PVPC_VALUES, calcularFactura, validateBillData }"), 'Falta reexportar defaults y calcularFactura');
});

test('[ESTATICO] no existe una segunda implementación de calcularFactura', () => {
  const utilsTs = fs.readFileSync(path.join(rootDir, 'src', 'utils.ts'), 'utf-8');
  assert.ok(!utilsTs.includes('function calcularFactura'), 'calcularFactura no debe implementarse en utils.ts');
});

test('[ESTATICO] no existe una segunda definición de DEFAULT_PVPC_VALUES', () => {
  const utilsTs = fs.readFileSync(path.join(rootDir, 'src', 'utils.ts'), 'utf-8');
  assert.ok(!utilsTs.includes('DEFAULT_PVPC_VALUES: BillData = {'), 'DEFAULT_PVPC_VALUES no debe definirse en utils.ts');
});

test('[ESTATICO] no existen definiciones duplicadas de BillData o BillResults', () => {
  const typesTs = fs.readFileSync(path.join(rootDir, 'src', 'types.ts'), 'utf-8');
  assert.ok(!typesTs.includes('interface BillData {'), 'BillData no debe definirse en types.ts');
  assert.ok(!typesTs.includes('interface BillResults {'), 'BillResults no debe definirse en types.ts');
});

test('[VALIDO] importar desde la ruta histórica y desde la ruta de dominio produce el mismo objeto de defaults', () => {
  assert.deepStrictEqual(OldDefaults, NewDefaults, 'Los defaults importados difieren');
});

test('[VALIDO] ejecutar calcularFactura desde ambas rutas produce resultados idénticos para fixture predeterminado', () => {
  const newRes = newCalcularFactura(NewDefaults);
  const oldRes = oldCalcularFactura(NewDefaults);
  assert.deepStrictEqual(newRes, oldRes, "Los resultados difieren");
  
  // Resultados canónicos
  assert.equal(newRes.dias, 30);
  assert.equal(newRes.totalFijo, 11.4073);
  assert.equal(newRes.totalPeajes, 11.4793);
  assert.equal(newRes.totalEnergia, 53.8679);
  assert.equal(newRes.totalVariable, 65.3472);
  assert.equal(newRes.totalIee, 3.9242);
  assert.equal(newRes.totalRegulados, 1.3989);
  assert.equal(newRes.totalIva, 17.2363);
  assert.equal(newRes.totalFactura, 99.31);
  assert.equal(newRes.alertaPresupuesto, false);
});

test('[VALIDO] ejecutar calcularFactura desde ambas rutas produce resultados idénticos para fechas iguales', () => {
  const data = { ...NewDefaults, fechaInicio: '2026-06-01', fechaFin: '2026-06-01' };
  const newRes = newCalcularFactura(data);
  const oldRes = oldCalcularFactura(data);
  assert.deepStrictEqual(newRes, oldRes, "Los resultados difieren");
  assert.equal(newRes.dias, 1);
});

test('[VALIDO] ejecutar calcularFactura desde ambas rutas produce resultados idénticos para fechas invertidas', () => {
  const data = { ...NewDefaults, fechaInicio: '2026-06-05', fechaFin: '2026-06-01' };
  assert.throws(() => newCalcularFactura(data));
  assert.throws(() => oldCalcularFactura(data));
});

test('[VALIDO] ejecutar calcularFactura desde ambas rutas produce resultados idénticos para fallback nullish con cero', () => {
  const data = { ...NewDefaults, costeEnergiaPunta: 0, costeEnergiaLlano: 0, costeEnergiaValle: 0 };
  const newRes = newCalcularFactura(data);
  const oldRes = oldCalcularFactura(data);
  assert.deepStrictEqual(newRes, oldRes);
  assert.equal(newRes.totalEnergia, 0);
});

test('[VALIDO] ejecutar calcularFactura desde ambas rutas produce resultados idénticos para valor negativo', () => {
  const data = { ...NewDefaults, kwPunta: -4.4 };
  assert.throws(() => newCalcularFactura(data));
  assert.throws(() => oldCalcularFactura(data));
});

test('[VALIDO] ejecutar calcularFactura desde ambas rutas produce resultados idénticos para presupuesto igual al total visible', () => {
  const res = newCalcularFactura(NewDefaults);
  const data = { ...NewDefaults, presupuesto: res.totalFactura };
  const newRes = newCalcularFactura(data);
  const oldRes = oldCalcularFactura(data);
  assert.deepStrictEqual(newRes, oldRes);
  assert.equal(newRes.alertaPresupuesto, false);
});
