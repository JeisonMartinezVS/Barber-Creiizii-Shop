import { defineStore } from 'pinia'
import { ref } from 'vue'
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
  const isReady = ref(false) // becomes true once Firebase reports the initial auth state
  const isLoading = ref(false)
  const error = ref<string | null>(null)

  onAuthStateChanged(auth, (firebaseUser) => {
    user.value = firebaseUser
    isReady.value = true
  })

  async function login(usernameOrEmail: string, password: string): Promise<boolean> {
    isLoading.value = true
    error.value = null
    try {
      const email = resolveEmail(usernameOrEmail)
      const credential = await signInWithEmailAndPassword(auth, email, password)
      user.value = credential.user
      return true
    } catch (err) {
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
  }

  return { user, isReady, isLoading, error, login, logout }
})