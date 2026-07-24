// Import Firebase modules
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.1.0/firebase-app.js";
import { getAuth, GoogleAuthProvider } from "https://www.gstatic.com/firebasejs/11.1.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/11.1.0/firebase-firestore.js";

// Firebase Configuration with provided credentials
const firebaseConfig = {
  apiKey: "AIzaSyBQtphxt8ayxbOCdD1NlqVWckZyTJBsnEI",
  authDomain: "gen-lang-client-0735328299.firebaseapp.com",
  projectId: "gen-lang-client-0735328299",
  storageBucket: "gen-lang-client-0735328299.appspot.com",
  messagingSenderId: "302419656848",
  appId: "1:302419656848:web:YOUR_APP_ID"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase Authentication and get a reference to the service
export const auth = getAuth(app);

// Initialize Cloud Firestore and get a reference to the service
export const db = getFirestore(app);

// Initialize Google Auth Provider
export const provider = new GoogleAuthProvider();

// Configure the Google provider
provider.addScope('profile');
provider.addScope('email');

export { app };
