import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import {
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updatePassword,
  type User,
} from 'firebase/auth'
import { doc, getDoc } from 'firebase/firestore'
import { db } from '../config/firebase'
import { auth } from '../config/firebaseAuth'
import { fetchAuthAccountTimestamps } from '../lib/authAccountInfo'

// El login muestra un campo "usuario", pero Firebase Auth necesita un correo.
// Si la persona no escribe "@", se arma uno con este dominio fijo, así las
// cuentas del personal no necesitan un correo real.
const ADMIN_EMAIL_DOMAIN = import.meta.env.VITE_ADMIN_EMAIL_DOMAIN ?? 'creiizii-admin.internal'

export function resolveEmail(usernameOrEmail: string): string {
  const value = usernameOrEmail.trim().toLowerCase()
  return value.includes('@') ? value : `${value}@${ADMIN_EMAIL_DOMAIN}`
}

export const useAuthStore = defineStore('auth', () => {
  const user = ref<User | null>(null)
  const role = ref<string | null>(null)
  const name = ref<string | null>(null) // empleados/{uid}.name
  // true mientras un empleado siga usando la contraseña temporal que recibió
  // por WhatsApp: el panel le muestra un modal obligatorio para cambiarla.
  const mustChangePassword = ref(false)
  const isReady = ref(false) // pasa a true cuando Firebase informa el estado inicial de la sesión
  const isLoading = ref(false)
  const error = ref<string | null>(null)

  const isAdmin = computed(() => role.value === 'admin')
  const isEmpleado = computed(() => role.value === 'empleado')

  // El rol vive en Firestore (empleados/{uid}.role), no en un custom claim:
  // los custom claims solo se pueden asignar con el Admin SDK (una Cloud
  // Function), que es justo la configuración que fallaba. Una lectura normal
  // de Firestore funciona desde el navegador, sin backend.
  async function loadRole(uid: string) {
    try {
      const snap = await getDoc(doc(db, 'empleados', uid))
      const data = snap.exists() ? snap.data() : null
      // Sin acceso al panel si no tiene ficha (empleado eliminado), si está
      // desactivado o si el rol no es uno válido. Eliminar la ficha no borra
      // la cuenta de Firebase Auth, así que esta verificación es necesaria.
      const hasAccess = data !== null && data.active !== false && ['admin', 'empleado'].includes(data.role)
      role.value = hasAccess ? (data!.role as string) : null
      name.value = typeof data?.name === 'string' && data.name.trim() ? data.name.trim() : null
      const createdWithTempPassword = data?.mustChangePassword === true
      const tempPasswordSetAt = typeof data?.tempPasswordSetAt === 'number' ? data.tempPasswordSetAt : null
      mustChangePassword.value = createdWithTempPassword && !(await hasChangedPassword(tempPasswordSetAt))
    } catch (err) {
      console.error('No se pudo cargar el rol del usuario', err)
      role.value = null
      name.value = null
      mustChangePassword.value = false
    }
  }

  // empleados/{uid}.mustChangePassword solo marca "se creó con contraseña
  // temporal" y nunca se apaga: las reglas de Firestore no dejan que el
  // empleado escriba su propio documento. Para saber si ya la cambió se usa
  // Firebase Auth, que guarda cuándo se fijó la contraseña (passwordUpdatedAt).
  //
  // Al crear el empleado se guarda ese valor exacto en tempPasswordSetAt; si
  // hoy la cuenta tiene uno posterior, la contraseña temporal ya no está en
  // uso. Comparación exacta: sin márgenes de tiempo, así funciona aunque el
  // empleado la cambie segundos después de que se creó la cuenta.
  //
  // Empleados creados antes de guardar tempPasswordSetAt: se compara con
  // createdAt, que coincide con passwordUpdatedAt al crear la cuenta.
  async function hasChangedPassword(tempPasswordSetAt: number | null): Promise<boolean> {
    const current = auth.currentUser
    if (!current) return false
    try {
      const { createdAt, passwordUpdatedAt } = await fetchAuthAccountTimestamps(current, auth.config.apiKey)
      return passwordUpdatedAt > (tempPasswordSetAt ?? createdAt)
    } catch (err) {
      // Si no se puede consultar, no bloqueamos el panel con el modal.
      console.error('No se pudo verificar si la contraseña ya fue cambiada', err)
      return true
    }
  }

  onAuthStateChanged(auth, async (firebaseUser) => {
    user.value = firebaseUser
    if (firebaseUser) {
      await loadRole(firebaseUser.uid)
    } else {
      role.value = null
      name.value = null
      mustChangePassword.value = false
    }
    isReady.value = true
  })

  async function login(usernameOrEmail: string, password: string): Promise<boolean> {
    isLoading.value = true
    error.value = null
    try {
      const email = resolveEmail(usernameOrEmail)
      const credential = await signInWithEmailAndPassword(auth, email, password)
      user.value = credential.user
      await loadRole(credential.user.uid)
      if (!role.value) {
        // Credenciales correctas, pero la cuenta está desactivada o eliminada.
        await logout()
        error.value = 'Tu cuenta no tiene acceso al panel. Contacta al administrador.'
        return false
      }
      return true
    } catch {
      // Mensaje genérico a propósito: nunca revelar si falló el usuario o la contraseña.
      error.value = 'Usuario o contraseña incorrectos'
      return false
    } finally {
      isLoading.value = false
    }
  }

  async function logout(): Promise<void> {
    await signOut(auth)
    user.value = null
    role.value = null
    name.value = null
    mustChangePassword.value = false
  }

  /** Cambia la contraseña del usuario logueado y cierra el modal de primer ingreso. */
  async function changePassword(newPassword: string): Promise<{ ok: true } | { ok: false; code: string }> {
    const current = auth.currentUser
    if (!current) return { ok: false, code: 'auth/no-current-user' }
    try {
      await updatePassword(current, newPassword)
    } catch (err) {
      return { ok: false, code: (err as { code?: string })?.code ?? 'unknown' }
    }
    // No hace falta escribir en Firestore: Firebase Auth ya registró el cambio
    // (passwordUpdatedAt), y en el próximo ingreso hasChangedPassword() lo ve.
    mustChangePassword.value = false
    return { ok: true }
  }

  return {
    user,
    role,
    name,
    isAdmin,
    isEmpleado,
    isReady,
    isLoading,
    error,
    mustChangePassword,
    login,
    logout,
    changePassword,
  }
})
