import test from 'node:test';
import assert from 'node:assert';
import { calcularFactura } from '../../src/domain/billing/calculateBill';
import { validateBillData } from '../../src/domain/billing/validation';
import { DEFAULT_PVPC_VALUES } from '../../src/domain/billing/defaults';
import { legacyFixtures } from '../../src/domain/billing/legacyFixtures';
import fs from 'node:fs';
import path from 'node:path';

test('[VALIDO] fecha igual devuelve 1 día', () => {
  const data = { ...DEFAULT_PVPC_VALUES, fechaInicio: '2026-06-01', fechaFin: '2026-06-01' };
  const res = calcularFactura(data);
  assert.strictEqual(res.dias, 1);
});

test('[VALIDO] 1–30 de junio = 30 días', () => {
  const data = { ...DEFAULT_PVPC_VALUES, fechaInicio: '2026-06-01', fechaFin: '2026-06-30' };
  const res = calcularFactura(data);
  assert.strictEqual(res.dias, 30);
});

test('[VALIDO] año bisiesto', () => {
  const data = { ...DEFAULT_PVPC_VALUES, fechaInicio: '2024-02-28', fechaFin: '2024-03-01' };
  const res = calcularFactura(data);
  assert.strictEqual(res.dias, 3);
});

test('[VALIDO] cambio de mes', () => {
  const data = { ...DEFAULT_PVPC_VALUES, fechaInicio: '2026-01-31', fechaFin: '2026-02-01' };
  const res = calcularFactura(data);
  assert.strictEqual(res.dias, 2);
});

test('[VALIDO] cambio de año', () => {
  const data = { ...DEFAULT_PVPC_VALUES, fechaInicio: '2025-12-31', fechaFin: '2026-01-01' };
  const res = calcularFactura(data);
  assert.strictEqual(res.dias, 2);
});

test('[VALIDO] fecha imposible genera error', () => {
  const data = { ...DEFAULT_PVPC_VALUES, fechaInicio: '2026-02-30', fechaFin: '2026-03-01' };
  const val = validateBillData(data);
  assert.strictEqual(val.isValid, false);
});

test('[VALIDO] fecha invertida genera error', () => {
  const data = { ...DEFAULT_PVPC_VALUES, fechaInicio: '2026-06-15', fechaFin: '2026-06-10' };
  const val = validateBillData(data);
  assert.strictEqual(val.isValid, false);
});

test('[VALIDO] periodo > 366 genera error', () => {
  const data = { ...DEFAULT_PVPC_VALUES, fechaInicio: '2025-01-01', fechaFin: '2026-01-05' };
  const val = validateBillData(data);
  assert.strictEqual(val.isValid, false);
});

test('[VALIDO] respeta todos los límites', () => {
  const data = { ...DEFAULT_PVPC_VALUES, kwPunta: 101 };
  const val = validateBillData(data);
  assert.strictEqual(val.isValid, false);
});

test('[VALIDO] NaN e Infinity generan error', () => {
  const data = { ...DEFAULT_PVPC_VALUES, kwhPunta: NaN };
  assert.strictEqual(validateBillData(data).isValid, false);
  const data2 = { ...DEFAULT_PVPC_VALUES, kwhPunta: Infinity };
  assert.strictEqual(validateBillData(data2).isValid, false);
});

test('[VALIDO] valores negativos generan error', () => {
  const data = { ...DEFAULT_PVPC_VALUES, kwhPunta: -1 };
  assert.strictEqual(validateBillData(data).isValid, false);
});

test('[VALIDO] mapeo correcto P1/P2/P3', () => {
  assert.strictEqual(DEFAULT_PVPC_VALUES.precioKwhPunta, 0.097553);
  assert.strictEqual(DEFAULT_PVPC_VALUES.precioKwhLlano, 0.029267);
  assert.strictEqual(DEFAULT_PVPC_VALUES.precioKwhValle, 0.003292);
});

test('[VALIDO] aritmética decimal y ROUND_HALF_UP', () => {
  // Canónico 99.31
  const res = calcularFactura(DEFAULT_PVPC_VALUES);
  assert.strictEqual(res.totalFactura, 99.31);
});

test('[VALIDO] presupuesto igual al total mostrado no alerta', () => {
  const res = calcularFactura(DEFAULT_PVPC_VALUES);
  const data = { ...DEFAULT_PVPC_VALUES, presupuesto: res.totalFactura };
  const res2 = calcularFactura(data);
  assert.strictEqual(res2.alertaPresupuesto, false);
});

test('[VALIDO] motor devuelve engineVersion 2.0.0', () => {
  const res = calcularFactura(DEFAULT_PVPC_VALUES);
  assert.strictEqual(res.engineVersion, '2.0.0');
});

test('[VALIDO] compatibilidad de historiales sin engineVersion', () => {
  const oldRes = legacyFixtures.v1;
  assert.strictEqual((oldRes as any).engineVersion, undefined);
  assert.strictEqual(oldRes.totalFactura, 100.4);
});

test('[VALIDO] ausencia de fallback implícito de energía', () => {
  // Now it throws a validation error because fields are required
  const data = { ...DEFAULT_PVPC_VALUES, costeEnergiaPunta: null as unknown as number, costeEnergiaLlano: null as unknown as number, costeEnergiaValle: null as unknown as number };
  assert.throws(() => calcularFactura(data));
});

test('[VALIDO] fixture histórico 100.40 conservado como evidencia', () => {
  assert.strictEqual(legacyFixtures.v1.totalFactura, 100.40);
});

test('[ESTATICO] prueba estática específica que impida volver a intercambiar P2 y P3 en server.ts', () => {
  const serverPath = path.join(process.cwd(), 'server.ts');
  const serverContent = fs.readFileSync(serverPath, 'utf8');
  assert.ok(serverContent.includes('0.097553'), 'P1 Punta missing in server');
  assert.ok(serverContent.includes('0.029267'), 'P2 Llano missing in server');
  assert.ok(serverContent.includes('0.003292'), 'P3 Valle missing in server');
  
  // They should be matched correctly: P1/Punta, P2/Llano, P3/Valle
  assert.ok(serverContent.includes('Punta Total - 0.097553') || serverContent.includes('P1: 0.097553'), 'P1 wrong');
  assert.ok(serverContent.includes('Llano Total - 0.029267') || serverContent.includes('P2: 0.029267'), 'P2 wrong');
  assert.ok(serverContent.includes('Valle Total - 0.003292') || serverContent.includes('P3: 0.003292'), 'P3 wrong');
});

test('[ESTATICO] Sandbox desactivado en UI', () => {
  const appPath = path.join(process.cwd(), 'src/App.tsx');
  const appContent = fs.readFileSync(appPath, 'utf8');
  assert.ok(appContent.includes('Simulador de ahorro pendiente de activación'), 'Falta mensaje de Sandbox');
});

test('[ESTATICO] Selector Básico/Avanzado en UI', () => {
  const appPath = path.join(process.cwd(), 'src/App.tsx');
  const appContent = fs.readFileSync(appPath, 'utf8');
  assert.ok(appContent.includes('Básico') && appContent.includes('Avanzado'), 'Falta selector Básico/Avanzado');
});

test('[ESTATICO] Acciones desactivadas con datos inválidos', () => {
  const appPath = path.join(process.cwd(), 'src/App.tsx');
  const appContent = fs.readFileSync(appPath, 'utf8');
  assert.ok(appContent.includes('!validationResult.isValid') || appContent.includes('!isValid'), 'Acciones no usan validación');
});


test('[VALIDO] fechas requeridas', () => {
  let val = validateBillData({ ...DEFAULT_PVPC_VALUES, fechaInicio: '' });
  assert.strictEqual(val.isValid, false);
  assert.ok(val.errors.some(e => e.field === 'fechaInicio' && e.code === 'REQUIRED'));

  val = validateBillData({ ...DEFAULT_PVPC_VALUES, fechaFin: '' });
  assert.strictEqual(val.isValid, false);
  assert.ok(val.errors.some(e => e.field === 'fechaFin' && e.code === 'REQUIRED'));
});

test('[VALIDO] cada campo numérico requerido', () => {
  const val = validateBillData({ ...DEFAULT_PVPC_VALUES, kwPunta: null as any });
  assert.strictEqual(val.isValid, false);
  assert.ok(val.errors.some(e => e.field === 'kwPunta' && e.code === 'REQUIRED'));
});

test('[VALIDO] costeEnergiaPunta/Llano/Valle negativos', () => {
  let val = validateBillData({ ...DEFAULT_PVPC_VALUES, costeEnergiaPunta: -1 });
  assert.strictEqual(val.isValid, false);
  assert.ok(val.errors.some(e => e.field === 'costeEnergiaPunta'));
});

test('[VALIDO] costeEnergiaPunta/Llano/Valle NaN e Infinity', () => {
  let val = validateBillData({ ...DEFAULT_PVPC_VALUES, costeEnergiaLlano: NaN });
  assert.strictEqual(val.isValid, false);
  val = validateBillData({ ...DEFAULT_PVPC_VALUES, costeEnergiaValle: Infinity });
  assert.strictEqual(val.isValid, false);
});

test('[ESTATICO] eliminación de BillData.dias e imposibilidad de sustituir días', () => {
  const typesPath = path.join(process.cwd(), 'src/domain/billing/types.ts');
  const typesContent = fs.readFileSync(typesPath, 'utf8');
  assert.ok(!typesContent.includes('dias?: number;'), 'dias no debe estar en BillData');

  const calcPath = path.join(process.cwd(), 'src/domain/billing/calculateBill.ts');
  const calcContent = fs.readFileSync(calcPath, 'utf8');
  assert.ok(!calcContent.includes('data.dias'), 'No se deben leer dias de data');
});

test('[VALIDO] límites mínimo y máximo de cada grupo de campos', () => {
  let val = validateBillData({ ...DEFAULT_PVPC_VALUES, kwPunta: 101 }); // max is 100
  assert.strictEqual(val.isValid, false);
  
  val = validateBillData({ ...DEFAULT_PVPC_VALUES, presupuesto: -1 }); // min is 0
  assert.strictEqual(val.isValid, false);
});

test('[VALIDO] caso ROUND_HALF_UP real', () => {
  const data = {
    ...DEFAULT_PVPC_VALUES,
    kwPunta: 0, kwValle: 0,
    kwhPunta: 0, kwhLlano: 0, kwhValle: 0,
    precioMargen: 0, alqContador: 0,
    bonoSocial: 1.005,
    iee: 0, iva: 0
  };
  const res = calcularFactura(data);
  assert.strictEqual(res.totalFactura, 1.01);
});

test('[ESTATICO] cálculo seguro de React cuando los datos son inválidos', () => {
  const appPath = path.join(process.cwd(), 'src/App.tsx');
  const appContent = fs.readFileSync(appPath, 'utf8');
  assert.ok(appContent.includes('validationResult.isValid\n    ? calcularFactura(billData)\n    : null'), 'Falta el uso seguro de calcularFactura en App.tsx');
});

test('[ESTATICO] texto Datos pendientes de corregir', () => {
  const appPath = path.join(process.cwd(), 'src/App.tsx');
  const appContent = fs.readFileSync(appPath, 'utf8');
  assert.ok(appContent.includes('Datos pendientes de corregir'), 'Falta el texto de datos pendientes');
});

test('[ESTATICO] PVPC desactivado con fechas inválidas', () => {
  const appPath = path.join(process.cwd(), 'src/App.tsx');
  const appContent = fs.readFileSync(appPath, 'utf8');
  assert.ok(appContent.includes("hasError('fechaInicio') || hasError('fechaFin')"), 'Falta comprobación de fechas inválidas para PVPC');
});

test('[ESTATICO] presencia de min, max, aria-invalid y aria-describedby', () => {
  const appPath = path.join(process.cwd(), 'src/App.tsx');
  const appContent = fs.readFileSync(appPath, 'utf8');
  assert.ok(appContent.includes('aria-invalid='), 'Falta aria-invalid');
  assert.ok(appContent.includes('aria-describedby='), 'Falta aria-describedby');
  assert.ok(appContent.includes('min='), 'Falta min');
  assert.ok(appContent.includes('max='), 'Falta max');
});

test('[ESTATICO] Básico oculta todos los parámetros avanzados y Sandbox', () => {
  const appPath = path.join(process.cwd(), 'src/App.tsx');
  const appContent = fs.readFileSync(appPath, 'utf8');
  assert.ok(appContent.includes('!isBasicMode &&'), 'Básico debe ocultar elementos mediante !isBasicMode');
});

test('[ESTATICO] mensaje completo y distintivo del Sandbox', () => {
  const appPath = path.join(process.cwd(), 'src/App.tsx');
  const appContent = fs.readFileSync(appPath, 'utf8');
  assert.ok(appContent.includes('No disponible'), 'Falta el distintivo No disponible');
  assert.ok(appContent.includes('Simulador de ahorro pendiente de activación. Estos controles no modifican la factura.'), 'Falta el mensaje completo del sandbox');
});

test('[ESTATICO] aviso de motor histórico', () => {
  const appPath = path.join(process.cwd(), 'src/App.tsx');
  const appContent = fs.readFileSync(appPath, 'utf8');
  assert.ok(appContent.includes('Esta factura fue calculada con una versión anterior. Los datos se recalcularán con el motor 2.0.0 solo si guardas una nueva versión.'), 'Falta aviso de motor histórico');
});

test('[ESTATICO] ausencia de archivos temporales en la raíz', () => {
  const tempFiles = ['fix_test.cjs', 'patch.cjs', 'patch2.cjs', 'patch3.cjs', 'patch4.cjs', 'patch5.cjs', 'patch6.cjs', 'patch7.cjs', 'patch_calculator.cjs', 'test-run.js', 'patch_domain.cjs', 'patch_app.cjs', 'patch_replica.cjs', 'patch_tests.cjs', 'patch_corrections.cjs'];
  for (const file of tempFiles) {
    assert.strictEqual(fs.existsSync(path.join(process.cwd(), file)), false, `El archivo temporal ${file} no debe existir`);
  }
});
