import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js";
import {
  getAuth,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  addDoc,
  collection,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  updateDoc,
  serverTimestamp,
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";
import {
  getStorage,
  ref,
  uploadBytes,
  getDownloadURL,
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-storage.js";
import {
  getFunctions,
  httpsCallableFromURL,
  httpsCallable,
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-functions.js";

/**
 * Config real
 */
export const firebaseConfig = {
  apiKey: "AIzaSyAOR0mDTR_MAULqNioSdgRH8IoDv_Lp4rI",
  authDomain: "ingenieria-sas.firebaseapp.com",
  projectId: "ingenieria-sas",
  storageBucket: "ingenieria-sas.firebasestorage.app",
  messagingSenderId: "856625753506",
  appId: "1:856625753506:web:68fbe9c28a79ee703756fb",
};

// ✅ 1) Inicializa app primero
export const app = initializeApp(firebaseConfig);

// ✅ 2) Luego servicios
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export const functions = getFunctions(app, "us-central1");

// ✅ 3) Callable por URL (para bootstrap)
export const callBootstrapAdmin = httpsCallableFromURL(
  functions,
  "https://us-central1-ingenieria-sas.cloudfunctions.net/bootstrapAdmin"
);

// Wrapper utilitario (lo que ya usabas)
export const fb = {
  // Auth
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,

  // Firestore
  doc,
  getDoc,
  setDoc,
  addDoc,
  collection,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  updateDoc,
  serverTimestamp,

  // Storage
  ref,
  uploadBytes,
  getDownloadURL,

  // Functions
  httpsCallable,
};

// (opcional) exponer en consola
window.fb = fb;
window.functions = functions;

// Export directo por si lo necesitas
export { httpsCallable };
