import { getAuth } from 'firebase/auth'
import { app } from './firebase'

// Separado de firebase.ts a propósito: solo lo importan el store de auth y
// las vistas del panel, que se cargan bajo demanda. El sitio público nunca
// descarga el SDK de Firebase Auth.
export const auth = getAuth(app)
