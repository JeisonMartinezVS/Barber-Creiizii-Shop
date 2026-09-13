import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import {
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  type User,
} from 'firebase/auth'
import { auth } from '../config/firebase'

// The login screen shows a "usuario" field, but Firebase Auth needs an email.
// If the person doesn't type "@", we build one using this fixed domain, so no
// real email address is required for staff accounts.
const ADMIN_EMAIL_DOMAIN = import.meta.env.VITE_ADMIN_EMAIL_DOMAIN ?? 'creiizii-admin.internal'

function resolveEmail(usernameOrEmail: string): string {
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

  onAuthStateChanged(auth, async (firebaseUser) => {
    user.value = firebaseUser
    if (firebaseUser) {
      // Custom claims (like `role`) travel on the ID token, not on the User
      // object itself, so they need this extra round trip.
      const tokenResult = await firebaseUser.getIdTokenResult()
      role.value = (tokenResult.claims.role as string) ?? null
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
      const tokenResult = await credential.user.getIdTokenResult()
      role.value = (tokenResult.claims.role as string) ?? null
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

  return { user, role, isAdmin, isReady, isLoading, error, login, logout }
})
