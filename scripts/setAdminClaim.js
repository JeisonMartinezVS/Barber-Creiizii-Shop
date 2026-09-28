// Ejecutar UNA sola vez, localmente:
//   node scripts/setAdminClaim.js
//
// Necesita credenciales de Google con acceso al proyecto de Firebase:
//   GOOGLE_APPLICATION_CREDENTIALS=/ruta/a/serviceAccountKey.json node scripts/setAdminClaim.js
// (La llave se descarga en Consola de Firebase > Configuración del proyecto >
// Cuentas de servicio > Generar nueva clave privada. Guárdala FUERA del
// repositorio: da control total del proyecto.)
//
// Solo hace falta porque la cuenta admin se creó directamente en la consola
// de Firebase. Hoy los roles se leen de Firestore (empleados/{uid}.role).

const admin = require('firebase-admin')
admin.initializeApp()

const ADMIN_EMAIL = 'admin@creizzi.com.co' // TODO: pon aquí el correo real de login del admin

async function main() {
  const user = await admin.auth().getUserByEmail(ADMIN_EMAIL)
  await admin.auth().setCustomUserClaims(user.uid, { role: 'admin' })

  // También aseguramos que exista el documento en `empleados`, con la misma
  // forma que los demás, para que aparezca igual en la lista.
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