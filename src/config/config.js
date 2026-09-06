// src/config/config.js
import { reactive } from 'vue'
import { doc, onSnapshot } from 'firebase/firestore'
import { db } from './firebase'

// Configuración reactiva global (default values para evitar errores)
export const globalConfig = reactive({
  titulo: 'Cargando...',
  color: '#000',
  apiUrl: '',
  loaded: false,
})

// Inicializar el listener de Firestore
export function initConfig() {
  const docRef = doc(db, 'config', 'OyLV1NlzkMr1UMS2yisf')

  onSnapshot(
    docRef,
    (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data()
        Object.assign(globalConfig, data, { loaded: true })
        console.log('✅ Config actualizada en tiempo real:', data)
      } else {
        console.warn('⚠️ No se encontró el documento de configuración')
      }
    },
    (err) => console.error('❌ Error escuchando Firestore:', err),
  )
}
