import { before, after, test } from 'node:test';
import { readFileSync } from 'node:fs';
import { initializeTestEnvironment, assertFails, assertSucceeds, type RulesTestEnvironment } from '@firebase/rules-unit-testing';
import { doc, setDoc, getDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import { DEFAULT_PVPC_VALUES, calcularFactura } from '../../src/domain/billing';

let env: RulesTestEnvironment;
const claims = { email: 'daniel.ayuntnumancia@gmail.com', email_verified: true };
before(async () => {
  env = await initializeTestEnvironment({ projectId: 'demo-pvpc-security',
    firestore: { host: '127.0.0.1', port: 8088, rules: readFileSync('firestore.rules', 'utf8') } });
});
after(async () => { await env?.cleanup(); });

test('owner profile succeeds; anonymous, unverified and cross-user accesses fail', async () => {
  const db = env.authenticatedContext('owner', claims).firestore();
  const path = 'users/owner/profile/billData';
  await assertSucceeds(setDoc(doc(db, path), DEFAULT_PVPC_VALUES));
  await assertSucceeds(getDoc(doc(db, path)));
  for (const other of [env.unauthenticatedContext(), env.authenticatedContext('owner', { ...claims, email_verified: false }),
    env.authenticatedContext('owner', { ...claims, email: 'other@example.com' }), env.authenticatedContext('intruder', claims)]) {
    await assertFails(getDoc(doc(other.firestore(), path)));
    await assertFails(setDoc(doc(other.firestore(), path), DEFAULT_PVPC_VALUES));
  }
  await assertFails(setDoc(doc(db, path), { ...DEFAULT_PVPC_VALUES, role: 'admin', isAdmin: true }));
});

test('history enforces matching document ID, valid bill shape and immutable timestamp', async () => {
  const db = env.authenticatedContext('owner', claims).firestore();
  const entry = { id: 'entry1', dateStr: '06/11/2026', timestamp: 123,
    billData: DEFAULT_PVPC_VALUES, results: calcularFactura(DEFAULT_PVPC_VALUES), tipo: 'simulacion' };
  const ref = doc(db, 'users/owner/history/entry1');
  await assertSucceeds(setDoc(ref, entry));
  await assertSucceeds(updateDoc(ref, { dateStr: '07/11/2026' }));
  await assertFails(updateDoc(ref, { timestamp: 456 }));
  await assertFails(setDoc(doc(db, 'users/owner/history/mismatched'), entry));
  await assertFails(setDoc(doc(db, 'users/owner/history/invalid'), { id: 'invalid', timestamp: 123 }));
  await assertSucceeds(deleteDoc(ref));
});

test('sources and chat preserve IDs and timestamps; oversized messages fail', async () => {
  const db = env.authenticatedContext('owner', claims).firestore();
  for (const [collection, record] of [
    ['sources', { id: 'record', name: 'factura.pdf', timestamp: 123, explanation: 'Factura', parsedData: {} }],
    ['chats', { id: 'record', role: 'user', content: 'hola', timestamp: '10:00', citations: [] }]
  ] as const) {
    const ref = doc(db, `users/owner/${collection}/record`);
    await assertSucceeds(setDoc(ref, record));
    await assertFails(setDoc(doc(db, `users/owner/${collection}/mismatch`), record));
    await assertFails(updateDoc(ref, { timestamp: collection === 'chats' ? '11:00' : 456 }));
    await assertSucceeds(deleteDoc(ref));
  }
  await assertFails(setDoc(doc(db, 'users/owner/chats/large'), { id: 'large', role: 'user', content: 'x'.repeat(50001), timestamp: '10:00' }));
});
