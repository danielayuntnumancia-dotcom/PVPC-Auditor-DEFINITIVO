import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';
import React, { act, useState } from 'react';
import { create, type ReactTestRenderer } from 'react-test-renderer';
import { createRequire } from 'node:module';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { AppScreen } from '../../src/hooks/useAndroidBack';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const require = createRequire(import.meta.url);
const temporary = mkdtempSync(path.join(tmpdir(), 'pvpc-android-back-'));
let useAndroidBack: typeof import('../../src/hooks/useAndroidBack').useAndroidBack;
let renderer: ReactTestRenderer | undefined;
let fixture: { platform: string; exits: number; listeners: Map<string, Function> };
const calculator: AppScreen = { section: 'calculadora', historyEntryId: null };

before(async () => {
  (globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
  const output = path.join(temporary, 'back.cjs');
  await build({ entryPoints: [path.join(root, 'src/hooks/useAndroidBack.ts')], outfile: output,
    bundle: true, platform: 'node', format: 'cjs', logLevel: 'silent',
    plugins: [{ name: 'native-app-events', setup(builder) {
      builder.onResolve({ filter: /^react$/ }, () => ({ path: require.resolve('react'), external: true }));
      builder.onResolve({ filter: /^@capacitor\/(app|core)$/ }, args => ({ path: args.path, namespace: 'fixture' }));
      builder.onLoad({ filter: /.*/, namespace: 'fixture' }, args => ({ contents: args.path.endsWith('/core')
        ? 'export const Capacitor={getPlatform:()=>globalThis.__androidBackFixture.platform};'
        : `export const App={
          addListener:async(name,callback)=>{const f=globalThis.__androidBackFixture;f.listeners.set(name,callback);
            return {remove:async()=>{if(f.listeners.get(name)===callback)f.listeners.delete(name);}};},
          exitApp:async()=>{globalThis.__androidBackFixture.exits++;}
        };`, loader: 'js' }));
    }}] });
  useAndroidBack = require(output).useAndroidBack;
});

after(() => {
  if (path.dirname(temporary) !== path.resolve(tmpdir()) || !path.basename(temporary).startsWith('pvpc-android-back-')) throw new Error('Unexpected test directory');
  rmSync(temporary, { recursive: true, force: true });
  delete (globalThis as any).__androidBackFixture;
});

function Harness({ initialScreen = calculator, session = 'owner' }: { initialScreen?: AppScreen; session?: string | null }) {
  const [screen, setScreen] = useState(initialScreen);
  const [modal, setModal] = useState(false);
  const notice = useAndroidBack(screen, setScreen, () => {
    if (!modal) return false;
    setModal(false);
    return true;
  }, session);
  return React.createElement('output', { screen, notice, modal, navigate: setScreen, openModal: () => setModal(true) });
}

async function mount(initialScreen = calculator, platform = 'android') {
  fixture = { platform, exits: 0, listeners: new Map() };
  (globalThis as any).__androidBackFixture = fixture;
  await act(async () => { renderer = create(React.createElement(Harness, { initialScreen })); });
}
const state = () => renderer!.root.findByType('output').props;
const navigate = async (screen: AppScreen) => { await act(async () => { state().navigate(screen); }); };
const back = async () => { await act(async () => { fixture.listeners.get('backButton')!({ canGoBack: false }); }); };
const unmount = async () => { if (renderer) await act(async () => { renderer!.unmount(); renderer = undefined; }); };

test('atrás recorre las pantallas y facturas anteriores hasta la calculadora sin salir', async () => {
  try {
    await mount();
    await navigate({ section: 'comparador', historyEntryId: null });
    await navigate({ section: 'historial', historyEntryId: 'bill-one' });
    await navigate({ section: 'historial', historyEntryId: 'bill-two' });
    await back(); assert.equal(state().screen.historyEntryId, 'bill-one');
    await back(); assert.equal(state().screen.section, 'comparador');
    await back(); assert.equal(state().screen.section, 'calculadora');
    assert.equal(fixture.exits, 0);
    assert.equal(state().notice, null);
  } finally { await unmount(); }
});

test('sin pantalla anterior se vuelve a la calculadora', async () => {
  try {
    await mount({ section: 'comparador', historyEntryId: null });
    await back();
    assert.deepEqual(state().screen, calculator);
    assert.equal(fixture.exits, 0);
  } finally { await unmount(); }
});

test('en calculadora se avisa primero y se sale solo con un segundo atrás dentro de dos segundos', async () => {
  const original = Date.now;
  let now = 1000;
  Date.now = () => now;
  try {
    await mount();
    await back();
    assert.match(state().notice, /salir/);
    assert.equal(fixture.exits, 0);
    now += 500;
    await back();
    assert.equal(fixture.exits, 1);
  } finally { Date.now = original; await unmount(); }
});

test('la confirmación de salida caduca y se reinicia al navegar', async () => {
  const original = Date.now;
  let now = 1000;
  Date.now = () => now;
  try {
    await mount();
    await back();
    now += 2500;
    await back();
    assert.equal(fixture.exits, 0);
    await navigate({ section: 'comparador', historyEntryId: null });
    await back();
    await back();
    assert.equal(fixture.exits, 0, 'Returning to the calculator must require two new Back gestures');
    assert.match(state().notice, /salir/);
  } finally { Date.now = original; await unmount(); }
});

test('atrás cierra un diálogo antes de navegar o contar una salida', async () => {
  try {
    await mount();
    await act(async () => { state().openModal(); });
    await back();
    assert.equal(state().modal, false);
    assert.equal(state().notice, null);
    assert.equal(fixture.exits, 0);
    await back();
    assert.match(state().notice, /salir/);
    assert.equal(fixture.exits, 0);
  } finally { await unmount(); }
});

test('pasar la app a segundo plano cancela una salida pendiente', async () => {
  try {
    await mount();
    await back();
    await act(async () => { fixture.listeners.get('appStateChange')!({ isActive: false }); });
    assert.equal(state().notice, null);
    await back();
    assert.equal(fixture.exits, 0);
  } finally { await unmount(); }
});

test('cambiar de sesión borra la navegación anterior y desmontar retira los listeners', async () => {
  try {
    await mount();
    await navigate({ section: 'comparador', historyEntryId: null });
    await navigate({ section: 'historial', historyEntryId: 'bill-one' });
    await act(async () => { renderer!.update(React.createElement(Harness, { session: 'other-owner' })); });
    await back();
    assert.deepEqual(state().screen, calculator);
    await unmount();
    assert.equal(fixture.listeners.size, 0);
  } finally { await unmount(); }
});

test('en navegador no se registran acciones de salida nativas', async () => {
  try {
    await mount(calculator, 'web');
    assert.equal(fixture.listeners.size, 0);
    assert.equal(state().notice, null);
  } finally { await unmount(); }
});
