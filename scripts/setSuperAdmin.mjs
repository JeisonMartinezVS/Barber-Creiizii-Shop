// Da (o quita) el rol de SUPER ADMIN a una cuenta de Firebase Auth.
//
// El super admin solo ve la auditoría (/auditoria). Se marca con un custom
// claim, no en la colección `empleados`, así el admin no lo ve en su lista ni
// puede quitárselo desde el panel.
//
// Uso (desde la raíz del proyecto):
//   GOOGLE_APPLICATION_CREDENTIALS=ruta/a/la-llave.json node scripts/setSuperAdmin.mjs correo@ejemplo.com
//   GOOGLE_APPLICATION_CREDENTIALS=ruta/a/la-llave.json node scripts/setSuperAdmin.mjs correo@ejemplo.com --quitar
//
// Requisitos:
//   1. La cuenta ya debe existir: créala en Consola de Firebase >
//      Authentication > Agregar usuario (correo y contraseña). NO la crees
//      como empleado desde el panel.
//   2. La llave JSON de la cuenta de servicio (la misma de la limpieza diaria).
//      Guárdala FUERA del repositorio: da control total del proyecto.
//
// Después de correrlo, cierra sesión y vuelve a entrar para que el permiso se
// aplique.

import { readFileSync } from 'node:fs'
import { initializeApp, cert } from 'firebase-admin/app'
import { getAuth } from 'firebase-admin/auth'

const [email, flag] = process.argv.slice(2)
const credentialsPath = process.env.GOOGLE_APPLICATION_CREDENTIALS

if (!email || !credentialsPath) {
  console.error('Uso: GOOGLE_APPLICATION_CREDENTIALS=llave.json node scripts/setSuperAdmin.mjs correo@ejemplo.com [--quitar]')
  process.exit(1)
}

initializeApp({ credential: cert(JSON.parse(readFileSync(credentialsPath, 'utf-8'))) })
const auth = getAuth()

const user = await auth.getUserByEmail(email)
const claims = { ...(user.customClaims ?? {}) }
if (flag === '--quitar') delete claims.superadmin
else claims.superadmin = true
await auth.setCustomUserClaims(user.uid, claims)

console.log(
  flag === '--quitar'
    ? `Listo: ${email} ya no es super admin.`
    : `Listo: ${email} (uid ${user.uid}) ahora es super admin. Cierra sesión y vuelve a entrar.`,
)
