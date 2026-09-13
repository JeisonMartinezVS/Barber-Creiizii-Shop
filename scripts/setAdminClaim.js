// Run ONCE, locally, from the functions/ folder:
//   node scripts/setAdminClaim.js
//
// Needs Google credentials with access to your Firebase project — easiest is:
//   GOOGLE_APPLICATION_CREDENTIALS=/path/to/serviceAccountKey.json node scripts/setAdminClaim.js
// (Download that key from Firebase Console > Project settings > Service accounts > Generate new private key)
//
// This is only needed because the current admin account was created directly
// in the Firebase Console before this custom claim existed — anyone created
// through the new "Nuevo empleado" form already gets a role claim automatically.

const admin = require('firebase-admin')
admin.initializeApp()

const ADMIN_EMAIL = 'admin@creizzi.com.co' // TODO: set to the real admin login email

async function main() {
  const user = await admin.auth().getUserByEmail(ADMIN_EMAIL)
  await admin.auth().setCustomUserClaims(user.uid, { role: 'admin' })

  // Also make sure the admin has an `empleados` doc, same shape as the ones
  // the Cloud Function creates, so it shows up consistently in the list.
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