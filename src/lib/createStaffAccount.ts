import { deleteApp, getApp, initializeApp } from 'firebase/app'
import { createUserWithEmailAndPassword, getAuth, signOut } from 'firebase/auth'
import { fetchAuthAccountTimestamps } from './authAccountInfo'

/**
 * Crea una cuenta de Firebase Auth SIN iniciar sesión con ella en la pestaña
 * actual. El createUserWithEmailAndPassword(auth, ...) normal de Firebase
 * inicia sesión como el nuevo usuario en el `auth` que se le pase: si fuera
 * el `auth` principal de la app, reemplazaría de inmediato la sesión del admin.
 *
 * La solución: levantar una segunda instancia desechable de Firebase (mismo
 * proyecto y configuración, solo otra conexión) con su propio estado de
 * Auth, crear ahí el usuario, cerrar la sesión de ESA instancia y
 * destruirla. La sesión del admin en la app principal nunca se toca.
 *
 * Sin Cloud Functions, sin Admin SDK y sin despliegues: todo corre en el
 * navegador con la configuración de Firebase que ya existe.
 *
 * También devuelve `tempPasswordSetAt`: el passwordUpdatedAt exacto que
 * Firebase le asignó a la contraseña temporal. Si más adelante la cuenta
 * tiene otro valor, el empleado ya la cambió (ver stores/auth.ts). Es null si
 * no se pudo leer; la cuenta se crea igual.
 */
export async function createStaffAuthAccount(
  email: string,
  password: string,
): Promise<{ uid: string; tempPasswordSetAt: number | null }> {
  const primaryConfig = getApp().options // reutiliza la configuración con la que ya se inicializó la app
  const secondaryApp = initializeApp(primaryConfig, `staff-creation-${Date.now()}`)
  const secondaryAuth = getAuth(secondaryApp)
  try {
    const credential = await createUserWithEmailAndPassword(secondaryAuth, email, password)
    let tempPasswordSetAt: number | null = null
    try {
      tempPasswordSetAt = (await fetchAuthAccountTimestamps(credential.user, primaryConfig.apiKey!)).passwordUpdatedAt
    } catch (err) {
      console.error('No se pudo leer la marca de la contraseña temporal', err)
    }
    await signOut(secondaryAuth)
    return { uid: credential.user.uid, tempPasswordSetAt }
  } finally {
    await deleteApp(secondaryApp)
  }
}

const PASSWORD_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789'

// Usa crypto.getRandomValues (aleatoriedad criptográfica), no Math.random,
// que es predecible y no sirve para generar contraseñas.
export function generateRandomPassword(length = 12): string {
  const chars = PASSWORD_CHARS.length
  // Descarta los valores altos para que todos los caracteres tengan la misma probabilidad.
  const limit = 256 - (256 % chars)
  let password = ''
  while (password.length < length) {
    const bytes = crypto.getRandomValues(new Uint8Array(length * 2))
    for (const byte of bytes) {
      if (byte < limit && password.length < length) password += PASSWORD_CHARS[byte % chars]
    }
  }
  return password
}
