import { initializeApp, getApp, getApps, type FirebaseApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, type Auth, type UserInfo } from 'firebase/auth';
import { getFirestore, doc, getDocFromServer, type Firestore } from 'firebase/firestore';
import firebaseConfigJson from './firebase-applet-config.json';

interface FirebaseConfig {
  apiKey?: string;
  authDomain?: string;
  projectId?: string;
  storageBucket?: string;
  messagingSenderId?: string;
  appId?: string;
  measurementId?: string;
  firestoreDatabaseId?: string;
}

const firebaseEnvConfig: FirebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
  firestoreDatabaseId: import.meta.env.VITE_FIREBASE_FIRESTORE_DATABASE_ID,
};

const firebaseConfig: FirebaseConfig = {
  ...firebaseConfigJson,
  ...Object.fromEntries(
    Object.entries(firebaseEnvConfig).filter(([, value]) => value !== undefined && value !== '')
  ),
};

// Safe checking if config is populated
export const isFirebaseConfigured = !!(firebaseConfig && firebaseConfig.apiKey && firebaseConfig.projectId);

let app: FirebaseApp | undefined;
let dbInstance: Firestore | null = null;
let authInstance: Auth | null = null;

if (isFirebaseConfigured) {
  try {
    app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
    // CRITICAL: Must use firestoreDatabaseId if provided, or default database
    dbInstance = getFirestore(app, firebaseConfig.firestoreDatabaseId || '(default)');
    authInstance = getAuth(app);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("Error initializing Firebase:", msg);
  }
}

export const db = dbInstance;
export const auth = authInstance;

// Auth Provider
export const googleProvider = isFirebaseConfigured ? new GoogleAuthProvider() : null;

// Validate Connection (from Firebase Integration guidelines)
export async function testConnection() {
  if (!isFirebaseConfigured || !db) return;
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes('the client is offline')) {
      console.error("Please check your Firebase configuration.");
    }
  }
}

if (isFirebaseConfigured) {
  testConnection();
}

// --- ERROR HANDLING PRIMITIVES ---
export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const currentAuth = authInstance;
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: currentAuth?.currentUser?.uid || null,
      email: currentAuth?.currentUser?.email || null,
      emailVerified: currentAuth?.currentUser?.emailVerified || null,
      isAnonymous: currentAuth?.currentUser?.isAnonymous || null,
      tenantId: currentAuth?.currentUser?.tenantId || null,
      providerInfo: currentAuth?.currentUser?.providerData?.map((provider: UserInfo) => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error details: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// --- PERSISTENCE HELPER FUNCTIONS ---

export async function loginWithGoogle() {
  if (!isFirebaseConfigured || !authInstance || !googleProvider) {
    throw new Error("Firebase is not fully configured yet.");
  }
  return signInWithPopup(authInstance, googleProvider);
}

export async function logoutUser() {
  if (!authInstance) return;
  return signOut(authInstance);
}
