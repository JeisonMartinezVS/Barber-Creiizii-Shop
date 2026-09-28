// Funciones de los SDK de Firebase que usa la app
import { initializeApp } from 'firebase/app'
import { getFirestore } from 'firebase/firestore'
// https://firebase.google.com/docs/web/setup#available-libraries

// Configuración web de Firebase (valores en el archivo .env).
// Desde el SDK v7.20.0, measurementId es opcional.
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
}

// Inicializa Firebase
export const app = initializeApp(firebaseConfig)
export const db = getFirestore(app)
// Firebase Auth vive en ./firebaseAuth.ts: solo lo usa el panel (/login y
// /dashboard), así el sitio público no descarga el SDK de autenticación.
