// Ejecutar UNA sola vez, desde la raíz del proyecto:
//   node scripts/setAdminClaim.mjs
//
// Requisitos:
//   1. `npm install firebase-admin` (una vez, desde la raíz del proyecto)
//   2. Un JSON con la llave de una cuenta de servicio, descargado desde:
//      Consola de Firebase > Configuración del proyecto (engranaje) >
//      Cuentas de servicio > Generar nueva clave privada
//      Guárdalo FUERA del repositorio: da control total del proyecto.
//   3. Indicar la ruta de ese archivo en la variable de entorno
//      GOOGLE_APPLICATION_CREDENTIALS antes de ejecutar.
//
// Solo hace falta porque la cuenta admin se creó directamente en la consola
// de Firebase. Hoy los roles se leen de Firestore (empleados/{uid}.role) y
// quien se crea desde el formulario "Nuevo empleado" no necesita este script.

import { readFileSync } from 'node:fs'
import admin from 'firebase-admin'

const serviceAccountPath = process.env.GOOGLE_APPLICATION_CREDENTIALS
if (!serviceAccountPath) {
  console.error(
    'Falta la variable de entorno GOOGLE_APPLICATION_CREDENTIALS.\n' +
      'Mira las instrucciones al inicio de este archivo.',
  )
  process.exit(1)
}

const serviceAccount = JSON.parse(readFileSync(serviceAccountPath, 'utf-8'))

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
})

const ADMIN_EMAIL = 'admin@creizzi.com.co' // TODO: pon aquí el correo real de login del admin

async function main() {
  const user = await admin.auth().getUserByEmail(ADMIN_EMAIL)
  await admin.auth().setCustomUserClaims(user.uid, { role: 'admin' })

  // También aseguramos que exista el documento en `empleados`, con la misma
  // forma que crea la Cloud Function, para que aparezca igual en la lista.
  await admin.firestore().collection('empleados').doc(user.uid).set(
    {
      name: 'Administrador',
      email: ADMIN_EMAIL,
      phone: '',
      username: ADMIN_EMAIL.split('@')[0],
      role: 'admin',
      active: true,
    },
    { merge: true },
  )

  console.log(`Listo: ${ADMIN_EMAIL} (uid: ${user.uid}) ahora tiene el claim role=admin`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
