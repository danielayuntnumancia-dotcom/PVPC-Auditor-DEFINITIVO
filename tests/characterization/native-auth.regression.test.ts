import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { createRequire } from 'node:module';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const require = createRequire(import.meta.url);
const temporary = mkdtempSync(path.join(tmpdir(), 'pvpc-native-auth-'));
const output = path.join(temporary, 'firebase.cjs');

before(async () => {
  await build({ entryPoints: [path.join(root, 'src/firebase.ts')], outfile: output, bundle: true,
    platform: 'node', format: 'cjs', define: { 'import.meta.env': '{}' }, logLevel: 'silent',
    plugins: [{ name: 'firebase-platform-fixture', setup(builder) {
      builder.onResolve({ filter: /^(firebase\/|@capacitor\/core|@capacitor-firebase\/authentication)/ }, args => ({ path: args.path, namespace: 'fixture' }));
      builder.onLoad({ filter: /.*/, namespace: 'fixture' }, args => ({ contents: {
        'firebase/app': 'export const getApps=()=>[];export const getApp=()=>({});export const initializeApp=()=>({});',
        'firebase/app-check': 'export class ReCaptchaEnterpriseProvider{};export const initializeAppCheck=()=>{globalThis.__nativeAuthFixture.appCheckCalls++;};',
        'firebase/auth': `
          const fixture=()=>globalThis.__nativeAuthFixture;
          export const getAuth=()=>({currentUser:null});
          export class GoogleAuthProvider {setCustomParameters(){} static credential(token){return {token};}}
          export const signInWithCredential=async (_,credential)=>{fixture().credential=credential;return {user:{uid:'owner'}};};
          export const signInWithPopup=async()=>({user:{uid:'owner'}});
          export const signOut=async()=>{fixture().events.push('web-signout');};`,
        'firebase/firestore': 'export const getFirestore=()=>({});export const doc=()=>({});export const getDocFromServer=async()=>({});',
        '@capacitor/core': 'export const Capacitor={isNativePlatform:()=>globalThis.__nativeAuthFixture.native};',
        '@capacitor-firebase/authentication': `export const FirebaseAuthentication={
          signInWithGoogle:async()=>({credential:globalThis.__nativeAuthFixture.googleCredential}),
          signOut:async()=>{const f=globalThis.__nativeAuthFixture;f.events.push('native-signout');if(f.failNativeSignout)throw new Error('native failure');}
        };`
      }[args.path]!, loader: 'js' }));
    }}] });
});

after(() => {
  if (path.dirname(temporary) !== path.resolve(tmpdir()) || !path.basename(temporary).startsWith('pvpc-native-auth-')) throw new Error('Unexpected native-auth test directory');
  rmSync(temporary, { recursive: true, force: true });
  delete (globalThis as any).__nativeAuthFixture;
  delete (globalThis as any).window;
});

function load(native = true, options: Record<string, unknown> = {}) {
  const fixture = { native, appCheckCalls: 0, events: [] as string[], googleCredential: { idToken: 'test-google-id-token' }, ...options };
  (globalThis as any).__nativeAuthFixture = fixture;
  (globalThis as any).window = {};
  delete require.cache[output];
  return { fixture, api: require(output) };
}

test('Android signs into the JS session with the native Google credential and closes both sessions', async () => {
  const { fixture, api } = load();
  assert.equal((await api.loginWithGoogle()).user.uid, 'owner');
  assert.deepEqual((fixture as any).credential, { token: 'test-google-id-token' });
  assert.equal(fixture.appCheckCalls, 0, 'The browser reCAPTCHA provider must not run in the native WebView');
  await api.logoutUser();
  assert.deepEqual(fixture.events, ['native-signout', 'web-signout']);
});

test('Android rejects missing Google credentials and clears the JS session even if native sign-out fails', async () => {
  const { fixture, api } = load(true, { googleCredential: {}, failNativeSignout: true });
  await assert.rejects(api.loginWithGoogle(), /Google/);
  await assert.rejects(api.logoutUser(), /native failure/);
  assert.deepEqual(fixture.events, ['native-signout', 'web-signout']);
});

test('web keeps its reCAPTCHA provider and web sign-out flow', async () => {
  const { fixture, api } = load(false);
  assert.equal(fixture.appCheckCalls, 1);
  await api.logoutUser();
  assert.deepEqual(fixture.events, ['web-signout']);
});
