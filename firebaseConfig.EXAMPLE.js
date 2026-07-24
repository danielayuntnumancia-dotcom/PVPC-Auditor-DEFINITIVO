// EJEMPLO: firebaseConfig.js - Con valores completados
// Este es un ejemplo de cómo debe verse tu firebaseConfig.js después de agregar tu API Key

import { initializeApp } from "https://www.gstatic.com/firebasejs/11.1.0/firebase-app.js";
import { getAuth, GoogleAuthProvider } from "https://www.gstatic.com/firebasejs/11.1.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/11.1.0/firebase-firestore.js";

// Firebase Configuration - EJEMPLO CON VALORES
// Reemplaza los valores YOUR_* con los valores reales de tu proyecto
const firebaseConfig = {
  apiKey: "AIzaSyDxxxxxxxxxxxxxxxxxxx-xxxxxxx", // ← Tu API Key real va aquí
  authDomain: "gen-lang-client-0735328299.firebaseapp.com",
  projectId: "gen-lang-client-0735328299",
  storageBucket: "gen-lang-client-0735328299.appspot.com",
  messagingSenderId: "302419656848",
  appId: "1:302419656848:web:xxxxxxxxxxxxxxxxxx" // ← Opcional: Tu App ID si lo tienes
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase Authentication
export const auth = getAuth(app);

// Initialize Cloud Firestore
export const db = getFirestore(app);

// Initialize Google Auth Provider
export const provider = new GoogleAuthProvider();

// Configure the Google provider
provider.addScope('profile');
provider.addScope('email');

export { app };
