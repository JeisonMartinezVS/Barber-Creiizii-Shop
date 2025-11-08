// Import the functions you need from the SDKs you need
import { initializeApp } from 'firebase/app'
import { getAnalytics } from 'firebase/analytics'
import { getFirestore } from 'firebase/firestore'
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: 'AIzaSyBBZ1qQeounICe9xC9NTbVNqK3hcOxdrxc',
  authDomain: 'barber-creiizii-shop.firebaseapp.com',
  projectId: 'barber-creiizii-shop',
  storageBucket: 'barber-creiizii-shop.firebasestorage.app',
  messagingSenderId: '439116492645',
  appId: '1:439116492645:web:3a3fe22e9baf899f6e7b8c',
  measurementId: 'G-BNR9QWM97R',
}

// Initialize Firebase
const app = initializeApp(firebaseConfig)
export const db = getFirestore(app)
const analytics = getAnalytics(app)
