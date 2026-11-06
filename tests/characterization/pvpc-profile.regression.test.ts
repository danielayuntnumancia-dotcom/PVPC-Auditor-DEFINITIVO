import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';
import React, { act } from 'react';
import { create, type ReactTestRenderer } from 'react-test-renderer';
import { createRequire } from 'node:module';
import { mkdtempSync, rmSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { DEFAULT_PVPC_VALUES } from '../../src/domain/billing/defaults';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const require = createRequire(import.meta.url);
const temporary = mkdtempSync(path.join(tmpdir(), 'pvpc-profile-tests-'));
let App: React.ComponentType;
let renderer: ReactTestRenderer | undefined;
let fixture: any;
let storage: Map<string, string>;

const firebase = `
export const auth = {}, db = {}, isFirebaseConfigured = true;
export const OperationType = {WRITE:'write',GET:'get',LIST:'list',DELETE:'delete'};
export const loginWithGoogle = async () => {};
export const logoutUser = async () => {};
export const handleFirestoreError = (error) => {throw error;};`;
const auth = `export function onAuthStateChanged(_,callback) {
 callback(globalThis.__pvpcProfileFixture.user); return () => {};
}`;
const firestore = `
export const doc = (...args) => args.slice(1).join('/');
export const collection = (...args) => args.slice(1).join('/');
export const getDoc = async () => ({exists:()=>true,data:()=>globalThis.__pvpcProfileFixture.bill});
export const getDocs = async (path) => path.endsWith('/tariffProfiles')
 ? {empty:false,forEach:fn=>globalThis.__pvpcProfileFixture.profiles.forEach(profile=>fn({data:()=>profile}))}
 : {empty:true,forEach:()=>{}};
export const setDoc = async () => {};
export const deleteDoc = async () => {};
export const writeBatch = () => ({delete:()=>{},commit:async()=>{}});`;

before(async () => {
  (globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
  const output = path.join(temporary, 'App.cjs');
  await build({
    entryPoints: [path.join(root, 'src/App.tsx')], outfile: output, bundle: true,
    platform: 'node', format: 'cjs', jsx: 'automatic', logLevel: 'silent',
    plugins: [{ name: 'isolated-ui-services', setup(builder) {
      builder.onResolve({ filter: /^react(?:\/.*)?$/ }, args => ({ path: require.resolve(args.path), external: true }));
      builder.onResolve({ filter: /^(?:\.\/firebase|\.\/api|firebase\/auth|firebase\/firestore|\.\/components\/(?:BillChart|ComparisonChart|CustomDatePicker))$/ }, args => ({ path: args.path, namespace: 'test-services' }));
      builder.onLoad({ filter: /.*/, namespace: 'test-services' }, args => ({ contents:
        args.path === './firebase' ? firebase : args.path === 'firebase/auth' ? auth :
        args.path === 'firebase/firestore' ? firestore : args.path === './api' ?
          `export const apiFetch=(...args)=>globalThis.__pvpcProfileFixture.api(...args);export const validateUpload=()=>null;` :
        args.path.endsWith('CustomDatePicker') ? `import React from 'react';export default props=>React.createElement('input',{...props,'data-testid':'billing-date'});` :
          'export default () => null;', loader: 'js' }));
      if (process.env.PVPC_PROFILE_SOURCE) {
        builder.onLoad({ filter: /[\\/]src[\\/]App\.tsx$/ }, () => ({ contents: readFileSync(process.env.PVPC_PROFILE_SOURCE!, 'utf8'), resolveDir: path.join(root, 'src'), loader: 'tsx' }));
      }
    }}]
  });
  App = require(output).default;
});

after(() => {
  if (path.dirname(temporary) !== path.resolve(tmpdir()) || !path.basename(temporary).startsWith('pvpc-profile-tests-')) throw new Error('Unexpected test directory');
  rmSync(temporary, { recursive: true, force: true });
  delete (globalThis as any).__pvpcProfileFixture;
});

const reply = (price: number) => ({ ok: true, json: async () => ({
  costeEnergiaPunta: price, costeEnergiaLlano: price, costeEnergiaValle: price, metodo: 'PVPC de prueba'
}) });

async function mount(profileId: string, api?: (...args: any[]) => Promise<any>) {
  const base = { ...DEFAULT_PVPC_VALUES, fechaInicio: '2026-06-01', fechaFin: '2026-06-30' };
  const profiles = [
    { ...base, id: 'pvpc-regulado', nombre: 'PVPC', comercializadora: '', modalidad: 'pvpc', timestamp: 0 },
    { ...base, id: 'libre', nombre: 'Contrato libre', comercializadora: 'Prueba', modalidad: 'fijo24h',
      peajesIncluidos: true, costeEnergiaPunta: 0.125, costeEnergiaLlano: 0.125, costeEnergiaValle: 0.125, timestamp: 1 }
  ];
  fixture = { user: { uid: 'owner', email: 'daniel.ayuntnumancia@gmail.com', emailVerified: true, displayName: 'Prueba' },
    profiles, bill: { ...base, perfilTarifaId: profileId, costeEnergiaPunta: profileId === 'libre' ? 0.125 : 0.1 }, calls: [] };
  fixture.api = (...args: any[]) => { fixture.calls.push(args); return api ? api(...args) : Promise.resolve(reply(0.9)); };
  (globalThis as any).__pvpcProfileFixture = fixture;
  storage = new Map([['pvpc_bill_data', JSON.stringify(fixture.bill)], ['pvpc_tariff_profiles', JSON.stringify(profiles)]]);
  (globalThis as any).localStorage = {
    getItem: (key: string) => storage.get(key) ?? null,
    setItem: (key: string, value: string) => storage.set(key, value),
    removeItem: (key: string) => storage.delete(key)
  };
  await act(async () => { renderer = create(React.createElement(App)); });
}

const text = () => JSON.stringify(renderer!.toJSON());
const bill = () => JSON.parse(storage.get('pvpc_bill_data')!);
const choose = async (id: string) => { await act(async () => {
  renderer!.root.findByProps({ 'aria-label': 'Seleccionar perfil de tarifa' }).props.onChange({ target: { value: id } });
}); };
const synchronize = () => renderer!.root.findAllByType('button').find(node =>
  node.findAllByType('span').some(span => span.props.children === 'Obtener Coste Real'))!;
const pause = async () => { await act(async () => { await new Promise(resolve => setTimeout(resolve, 650)); }); };
const unmount = async () => { if (renderer) await act(async () => { renderer!.unmount(); renderer = undefined; }); };

test('mercado libre oculta el bloque y no sincroniza al cambiar las fechas', async () => {
  try {
    await mount('libre');
    assert.ok(!text().includes('Obtener Coste Real'));
    await act(async () => { renderer!.root.findAllByProps({ 'data-testid': 'billing-date' })[0].props.onChange('2026-06-02'); });
    await pause();
    assert.equal(fixture.calls.length, 0);
    assert.equal(bill().costeEnergiaPunta, 0.125);
  } finally { await unmount(); }
});

test('PVPC permite sincronizar; cambiar a mercado libre retira también el mensaje de éxito', async () => {
  try {
    await mount('pvpc-regulado');
    await act(async () => { await synchronize().props.onClick(); });
    assert.equal(bill().costeEnergiaPunta, 0.9);
    assert.ok(text().includes('PVPC de prueba'));
    await choose('libre');
    assert.ok(!text().includes('PVPC de prueba'));
    assert.ok(!text().includes('Obtener Coste Real'));
    assert.equal(bill().costeEnergiaPunta, 0.125);
    await choose('pvpc-regulado');
    assert.ok(text().includes('Obtener Coste Real'));
  } finally { await unmount(); }
});

test('una respuesta PVPC tardía no sobrescribe los precios del mercado libre', async () => {
  let resolve!: (response: any) => void;
  try {
    await mount('pvpc-regulado', () => new Promise(done => { resolve = done; }));
    await act(async () => { void synchronize().props.onClick(); });
    const signal = fixture.calls[0][1].signal;
    await choose('libre');
    assert.equal(signal.aborted, true);
    // Deliberately resolve despite abort to exercise the stale-response guard too.
    await act(async () => { resolve(reply(0.9)); });
    assert.equal(bill().costeEnergiaPunta, 0.125);
    assert.ok(!text().includes('PVPC de prueba'));
  } finally { await unmount(); }
});

test('cambiar las fechas descarta la respuesta anterior y usa la del período nuevo', async () => {
  let resolve!: (response: any) => void;
  let count = 0;
  try {
    await mount('pvpc-regulado', () => ++count === 1 ? new Promise(done => { resolve = done; }) : Promise.resolve(reply(0.18)));
    await act(async () => { void synchronize().props.onClick(); });
    await act(async () => { renderer!.root.findAllByProps({ 'data-testid': 'billing-date' })[0].props.onChange('2026-06-02'); });
    await pause();
    assert.equal(bill().costeEnergiaPunta, 0.18);
    await act(async () => { resolve(reply(0.9)); });
    assert.equal(bill().costeEnergiaPunta, 0.18);
    assert.equal(bill().fechaInicio, '2026-06-02');
  } finally { await unmount(); }
});
