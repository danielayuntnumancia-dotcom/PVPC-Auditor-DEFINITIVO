# Security Specification - PVPC Auditor V4

This specification outlines the Zero-Trust security architecture for the PVPC Auditor V4 Firestore database.

## 1. Data Invariants

1. **User Ownership Invariant**: A user can only access, write, edit, or delete their own active bill data, history logs, sources/scanned documents, or chat histories. No cross-tenant reads or writes are permitted.
2. **Valid ID Invariant**: All document IDs (e.g., `entryId`, `sourceId`, `chatId`) must match a strict alphanumeric pattern (`^[a-zA-Z0-9_\-]+$`) and have a maximum size of 128 characters.
3. **Verified Email Invariant**: Any user performing standard write operations must be authenticated with a verified email address (`request.auth.token.email_verified == true`).
4. **Active Bill Shape Invariant**: Active bill configuration must match the schema boundaries of `BillData` (i.e. numbers must be strictly positive, strings bounded).
5. **Timestamp Immutability Invariant**: History and source entries cannot have their creation dates altered once written.

---

## 2. The "Dirty Dozen" Malicious Payloads

The following 12 payloads attempt to breach the boundaries of Identity, Integrity, or State. All must be rejected with `PERMISSION_DENIED`.

### Attack 1: User Impersonation (Cross-User Write)
*   **Target Path**: `/users/victim_user_abc/profile/billData`
*   **Actor**: `attacker_user_123` (Verified email: `true`)
*   **Payload**: Valid `BillData` object.
*   **Breach**: Attempting to overwrite another user's private data.

### Attack 2: Unauthenticated Write to Profile
*   **Target Path**: `/users/victim_user_abc/profile/billData`
*   **Actor**: Unauthenticated
*   **Payload**: Valid `BillData` object.
*   **Breach**: Writing data without any credentials.

### Attack 3: Poisoned Document ID
*   **Target Path**: `/users/user_123/history/poisoned_id$$_invalid_chars`
*   **Actor**: `user_123` (Verified email: `true`)
*   **Payload**: Valid `HistoryEntry` object.
*   **Breach**: Injecting malicious query strings or symbols in the document ID path variable.

### Attack 4: Document ID Bloating (Denial of Wallet)
*   **Target Path**: `/users/user_123/history/[extremely-long-string-1000-chars]`
*   **Actor**: `user_123` (Verified email: `true`)
*   **Payload**: Valid `HistoryEntry` object.
*   **Breach**: Attempting database resource/wallet exhaustion via excessive document ID length.

### Attack 5: Unverified User Write
*   **Target Path**: `/users/user_123/profile/billData`
*   **Actor**: `user_123` (Verified email: `false`)
*   **Payload**: Valid `BillData` object.
*   **Breach**: Writing to the database using an unverified account.

### Attack 6: Cross-User History Append
*   **Target Path**: `/users/victim_user_abc/history/entry_999`
*   **Actor**: `attacker_user_123` (Verified email: `true`)
*   **Payload**: Valid `HistoryEntry` object.
*   **Breach**: Injecting custom simulated histories into another user's panel.

### Attack 7: Schema Violating Entry (Missing Required Fields)
*   **Target Path**: `/users/user_123/history/entry_001`
*   **Actor**: `user_123` (Verified email: `true`)
*   **Payload**:
    ```json
    {
      "id": "entry_001",
      "dateStr": "17/07/2026",
      "timestamp": 1784287166000
    }
    ```
*   **Breach**: Creating a corrupted database entry with missing `billData` and `results`.

### Attack 8: Self-Assigned Privilege Escalation
*   **Target Path**: `/users/user_123/profile/billData`
*   **Actor**: `user_123` (Verified email: `true`)
*   **Payload**:
    ```json
    {
      "fechaInicio": "2026-06-01",
      "fechaFin": "2026-06-30",
      "kwPunta": 4.4,
      "kwValle": 4.4,
      "kwhPunta": 100,
      "kwhLlano": 100,
      "kwhValle": 100,
      "role": "admin",
      "isAdmin": true
    }
    ```
*   **Breach**: Injecting role/admin flags into the state.

### Attack 9: Large Payload Injection (Denial of Wallet)
*   **Target Path**: `/users/user_123/chats/msg_001`
*   **Actor**: `user_123` (Verified email: `true`)
*   **Payload**:
    ```json
    {
      "id": "msg_001",
      "role": "user",
      "content": "[5MB of repeating text]",
      "timestamp": "2026-07-17T04:19:02Z"
    }
    ```
*   **Breach**: Wallet exhaustion by storing oversized chat messages.

### Attack 10: Blanket Query Scraping (Insecure List)
*   **Target Path**: `/users` (Collection Group Query or blanket List)
*   **Actor**: `attacker_user_123`
*   **Action**: List `/users` collection without a specific user ID route.
*   **Breach**: Trying to query or browse other profiles.

### Attack 11: Cross-User Chat Hijacking
*   **Target Path**: `/users/victim_user_abc/chats/msg_999`
*   **Actor**: `attacker_user_123` (Verified email: `true`)
*   **Payload**: Valid `ChatMessage`.
*   **Breach**: Reading/writing messages inside another user's assistant history.

### Attack 12: Source File Spoofing (Orphan Data injection)
*   **Target Path**: `/users/victim_user_abc/sources/file_111`
*   **Actor**: `attacker_user_123` (Verified email: `true`)
*   **Payload**: Valid `SourceFile`.
*   **Breach**: Injecting malicious scanned invoices into another user's storage.

---

## 3. Test Suite (firestore.rules.test.ts)

A TypeScript-based test runner simulation using the `@firebase/rules-unit-testing` framework.

```typescript
import { initializeTestEnvironment, RulesTestEnvironment } from '@firebase/rules-unit-testing';
import { setDoc, doc, getDoc, collection, getDocs } from 'firebase/firestore';

let testEnv: RulesTestEnvironment;

describe('PVPC Auditor Firestore Security Rules', () => {
  beforeAll(async () => {
    testEnv = await initializeTestEnvironment({
      projectId: 'pvpc-auditor-v4',
      firestore: {
        rules: require('fs').readFileSync('firestore.rules', 'utf8'),
      },
    });
  });

  afterAll(async () => {
    await testEnv.cleanup();
  });

  beforeEach(async () => {
    await testEnv.clearFirestore();
  });

  it('Attack 1: Blocks cross-user writes', async () => {
    const context = testEnv.authenticatedContext('attacker_user_123', { email_verified: true });
    const db = context.firestore();
    const docRef = doc(db, 'users/victim_user_abc/profile/billData');
    await expect(setDoc(docRef, { kwPunta: 4.4 })).rejects.toThrow();
  });

  it('Attack 2: Blocks unauthenticated write', async () => {
    const context = testEnv.unauthenticatedContext();
    const db = context.firestore();
    const docRef = doc(db, 'users/victim_user_abc/profile/billData');
    await expect(setDoc(docRef, { kwPunta: 4.4 })).rejects.toThrow();
  });

  it('Attack 3: Blocks invalid document ID format', async () => {
    const context = testEnv.authenticatedContext('user_123', { email_verified: true });
    const db = context.firestore();
    const docRef = doc(db, 'users/user_123/history/poisoned_id$$');
    await expect(setDoc(docRef, { id: 'poisoned_id$$', dateStr: '17/07/2026' })).rejects.toThrow();
  });

  it('Attack 4: Blocks oversized document ID', async () => {
    const context = testEnv.authenticatedContext('user_123', { email_verified: true });
    const db = context.firestore();
    const giantId = 'a'.repeat(200);
    const docRef = doc(db, `users/user_123/history/${giantId}`);
    await expect(setDoc(docRef, { id: giantId, dateStr: '17/07/2026' })).rejects.toThrow();
  });

  it('Attack 5: Blocks write from unverified account', async () => {
    const context = testEnv.authenticatedContext('user_123', { email_verified: false });
    const db = context.firestore();
    const docRef = doc(db, 'users/user_123/profile/billData');
    await expect(setDoc(docRef, { kwPunta: 4.4 })).rejects.toThrow();
  });
});
```
