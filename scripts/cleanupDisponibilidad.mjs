// Borra de la colección `disponibilidad` todos los horarios de días anteriores
// a hoy (hora de Colombia): ya no se pueden reservar, así que solo ocupan
// espacio. Las citas (colección `citas`) no se tocan, así que la agenda y los
// reportes siguen igual.
//
// Lo ejecuta GitHub Actions todos los días (.github/workflows/cleanup-disponibilidad.yml),
// así no hace falta el plan Blaze. También se puede correr a mano:
//   node scripts/cleanupDisponibilidad.mjs
//
// Credenciales (una de las dos):
//   - FIREBASE_SERVICE_ACCOUNT: el CONTENIDO del JSON de la cuenta de servicio
//     (así lo recibe GitHub Actions desde un secreto del repositorio).
//   - GOOGLE_APPLICATION_CREDENTIALS: la RUTA a ese JSON (para correrlo local).
//   El JSON se descarga en: Consola de Firebase > Configuración del proyecto >
//   Cuentas de servicio > Generar nueva clave privada. Nunca lo subas al repo.

import { readFileSync } from 'node:fs'
import { initializeApp, cert } from 'firebase-admin/app'
import { FieldValue, getFirestore } from 'firebase-admin/firestore'

const TIME_ZONE = 'America/Bogota'

function loadServiceAccount() {
  if (process.env.FIREBASE_SERVICE_ACCOUNT) return JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)
  if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    return JSON.parse(readFileSync(process.env.GOOGLE_APPLICATION_CREDENTIALS, 'utf-8'))
  }
  console.error('Falta FIREBASE_SERVICE_ACCOUNT o GOOGLE_APPLICATION_CREDENTIALS. Mira el inicio de este archivo.')
  process.exit(1)
}

initializeApp({ credential: cert(loadServiceAccount()) })
const db = getFirestore()

// `date` se guarda como "YYYY-MM-DD", así que comparar textos equivale a
// comparar fechas. en-CA formatea justo así.
const today = new Intl.DateTimeFormat('en-CA', { timeZone: TIME_ZONE }).format(new Date())

let deleted = 0
// Por tandas de 500 (el máximo de un lote de escritura).
for (;;) {
  const snapshot = await db.collection('disponibilidad').where('date', '<', today).limit(500).get()
  if (snapshot.empty) break
  const batch = db.batch()
  for (const d of snapshot.docs) batch.delete(d.ref)
  await batch.commit()
  deleted += snapshot.size
}

console.log(`disponibilidad: ${deleted} horarios anteriores a ${today} eliminados`)

// Constancia en la auditoría (el Admin SDK no pasa por las reglas de Firestore).
if (deleted > 0) {
  await db.collection('auditoria').add({
    at: FieldValue.serverTimestamp(),
    action: 'sistema.limpieza',
    category: 'sistema',
    summary: `Limpieza diaria: se borraron ${deleted} horarios de días anteriores a ${today}`,
    source: 'sistema',
    userAgent: 'GitHub Actions',
    actorType: 'sistema',
    actorUid: '',
    actorName: 'Limpieza automática',
    actorRole: 'sistema',
    citaId: '',
    customerName: '',
    customerPhone: '',
    barberoId: '',
    targetId: '',
    data: { deleted, before: today },
  })
}
