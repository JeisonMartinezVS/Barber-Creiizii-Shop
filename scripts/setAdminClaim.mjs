// Run ONCE, from the project root:
//   node scripts/setAdminClaim.mjs
//
// Requires:
//   1. `npm install firebase-admin` (run once, from the project root)
//   2. A service account key JSON downloaded from:
//      Firebase Console > Project settings (gear icon) > Service accounts
//      > Generate new private key
//   3. Point to that file with an environment variable before running —
//      see the PowerShell/CMD commands below.
//
// This is only needed because the current admin account was created
// directly in the Firebase Console before this custom claim existed —
// anyone created through the "Nuevo empleado" form already gets the role
// claim automatically, no script needed for them.

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
