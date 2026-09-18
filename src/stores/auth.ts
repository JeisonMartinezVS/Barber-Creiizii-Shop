import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import {
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  type User,
} from 'firebase/auth'
import { doc, getDoc } from 'firebase/firestore'
import { auth, db } from '../config/firebase'

// The login screen shows a "usuario" field, but Firebase Auth needs an email.
// If the person doesn't type "@", we build one using this fixed domain, so no
// real email address is required for staff accounts.
const ADMIN_EMAIL_DOMAIN = import.meta.env.VITE_ADMIN_EMAIL_DOMAIN ?? 'creiizii-admin.internal'

export function resolveEmail(usernameOrEmail: string): string {
  const value = usernameOrEmail.trim().toLowerCase()
  return value.includes('@') ? value : `${value}@${ADMIN_EMAIL_DOMAIN}`
}

export const useAuthStore = defineStore('auth', () => {
  const user = ref<User | null>(null)
  const role = ref<string | null>(null)
  const isReady = ref(false) // becomes true once Firebase reports the initial auth state
  const isLoading = ref(false)
  const error = ref<string | null>(null)

  const isAdmin = computed(() => role.value === 'admin')
  const isEmpleado = computed(() => role.value === 'empleado')

  // Role lives in Firestore (empleados/{uid}.role), not in a custom claim —
  // custom claims can only be set by the Admin SDK (a Cloud Function), which
  // is exactly the setup that kept failing. A plain Firestore read works
  // from the browser with no backend at all.
  async function loadRole(uid: string) {
    try {
      const snap = await getDoc(doc(db, 'empleados', uid))
      role.value = snap.exists() ? ((snap.data().role as string) ?? null) : null
    } catch (err) {
      console.error('No se pudo cargar el rol del usuario', err)
      role.value = null
    }
  }

  onAuthStateChanged(auth, async (firebaseUser) => {
    user.value = firebaseUser
    if (firebaseUser) {
      await loadRole(firebaseUser.uid)
    } else {
      role.value = null
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
      return true
    } catch {
      // Deliberately vague: never reveal whether the user or the password was wrong.
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
  }

  return { user, role, isAdmin, isEmpleado, isReady, isLoading, error, login, logout }
})
