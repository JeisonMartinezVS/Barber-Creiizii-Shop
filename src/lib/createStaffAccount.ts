import { deleteApp, getApp, initializeApp } from 'firebase/app'
import { createUserWithEmailAndPassword, getAuth, signOut } from 'firebase/auth'
import { fetchAuthAccountTimestamps } from './authAccountInfo'

/**
 * Creates a Firebase Auth account WITHOUT signing in as that account in the
 * current tab. Firebase's normal createUserWithEmailAndPassword(auth, ...)
 * signs in as the new user in whatever `auth` you pass it — if you pass your
 * app's main `auth`, that replaces the admin's own session immediately.
 *
 * The fix: spin up a second, throwaway Firebase "app" instance (same
 * project, same config — just a second connection) with its own separate
 * Auth state, create the user there, sign out of THAT instance, then tear
 * it down. The admin's own session in the main app/tab is never touched.
 *
 * No Cloud Function, no Admin SDK, no deploy — this runs entirely in the
 * browser with the Firebase config you already have.
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
  const primaryConfig = getApp().options // reuses whatever config your app already initialized with
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

export function generateRandomPassword(length = 10): string {
  let password = ''
  for (let i = 0; i < length; i++) {
    password += PASSWORD_CHARS[Math.floor(Math.random() * PASSWORD_CHARS.length)]
  }
  return password
}
