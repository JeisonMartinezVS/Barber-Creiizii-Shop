<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'

const router = useRouter()
const authStore = useAuthStore()

const username = ref('')
const password = ref('')
const showPassword = ref(false)
const formError = ref('')

// Set VITE_SHOW_DEMO_ACCOUNTS=false in production .env — this row is meant
// for your own testing while building, not for the live site.
const showDemoAccounts = import.meta.env.VITE_SHOW_DEMO_ACCOUNTS === 'true'

const demoAccounts = [
  { label: 'Admin', username: 'admin' },
  { label: 'Yeison', username: 'yeison' },
  { label: 'Camilo', username: 'camilo' },
]

// Only pre-fills the username — never the password. The password always has
// to be typed, so nothing sensitive ever lives in this file.
function fillDemoUser(demoUsername: string) {
  username.value = demoUsername
  password.value = ''
  formError.value = ''
}

async function handleSubmit() {
  formError.value = ''
  if (!username.value || !password.value) {
    formError.value = 'Ingresa tu usuario y contraseña'
    return
  }
  const ok = await authStore.login(username.value, password.value)
  if (ok) {
    router.push({ name: 'Dashboard' })
  } else {
    formError.value = authStore.error ?? 'No se pudo iniciar sesión'
  }
}
</script>

<template>
  <div class="min-h-screen bg-[#050505] flex items-center justify-center px-4 py-12">
    <div class="w-full max-w-md">
      <div class="relative rounded-2xl">
        <div
          class="absolute inset-x-6 -top-px h-px bg-gradient-to-r from-transparent via-[#c9a24b] to-transparent"
        ></div>
        <div class="bg-[#0e0e0e] border border-white/10 rounded-2xl px-8 py-10 shadow-2xl">
          <!-- Logo -->
          <div class="flex justify-center mb-6">
            <div
              class="w-20 h-20 rounded-md bg-black border border-white/10 flex items-center justify-center overflow-hidden"
            >
              <img
                src="../../public/logo.jpg"
                alt="Barber Creiizii Shop"
                class="w-full h-full object-cover"
              />
            </div>
          </div>

          <!-- Heading -->
          <h1 class="font-serif text-3xl text-center text-white font-bold mb-1">
            Panel de Gestión
          </h1>
          <p class="text-center text-sm text-[#8a93a6] mb-8">Barber Creiizii Shop</p>

          <form class="space-y-5" @submit.prevent="handleSubmit">
            <!-- Usuario -->
            <div>
              <label class="block text-xs tracking-wide text-[#c9a24b] mb-2">USUARIO</label>
              <div class="relative">
                <span class="absolute left-3 top-1/2 -translate-y-1/2 text-white/30">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                    <circle cx="12" cy="7" r="4" />
                  </svg>
                </span>
                <input
                  v-model="username"
                  type="text"
                  placeholder="Tu usuario"
                  autocomplete="username"
                  class="w-full bg-[#151515] border border-white/10 rounded-lg py-2.5 pl-10 pr-4 text-sm text-white placeholder-white/30 focus:outline-none focus:border-[#c9a24b]/60 focus:ring-1 focus:ring-[#c9a24b]/30 transition"
                />
              </div>
            </div>

            <!-- Contraseña -->
            <div>
              <label class="block text-xs tracking-wide text-[#c9a24b] mb-2">CONTRASEÑA</label>
              <div class="relative">
                <span class="absolute left-3 top-1/2 -translate-y-1/2 text-white/30">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <rect x="3" y="11" width="18" height="11" rx="2" />
                    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                  </svg>
                </span>
                <input
                  v-model="password"
                  :type="showPassword ? 'text' : 'password'"
                  placeholder="Tu contraseña"
                  autocomplete="current-password"
                  class="w-full bg-[#151515] border border-white/10 rounded-lg py-2.5 pl-10 pr-10 text-sm text-white placeholder-white/30 focus:outline-none focus:border-[#c9a24b]/60 focus:ring-1 focus:ring-[#c9a24b]/30 transition"
                />
                <button
                  type="button"
                  class="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition"
                  :aria-label="showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'"
                  @click="showPassword = !showPassword"
                >
                  <svg v-if="!showPassword" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7Z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                  <svg v-else width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path
                      d="M17.94 17.94A10.94 10.94 0 0 1 12 19c-7 0-11-7-11-7a21.6 21.6 0 0 1 5.06-5.94M9.9 4.24A10.4 10.4 0 0 1 12 4c7 0 11 7 11 7a21.6 21.6 0 0 1-3.24 4.39M14.12 14.12a3 3 0 1 1-4.24-4.24"
                    />
                    <line x1="1" y1="1" x2="23" y2="23" />
                  </svg>
                </button>
              </div>
            </div>

            <p v-if="formError" class="text-xs text-red-400 text-center">{{ formError }}</p>

            <button
              type="submit"
              :disabled="authStore.isLoading"
              class="w-full flex items-center justify-center gap-2 bg-gradient-to-b from-[#b6903f] to-[#8f7130] hover:from-[#c39c47] hover:to-[#9c7c37] text-[#1a1408] font-semibold text-sm rounded-lg py-3 transition disabled:opacity-60"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
                <polyline points="10 17 15 12 10 7" />
                <line x1="15" y1="12" x2="3" y2="12" />
              </svg>
              {{ authStore.isLoading ? 'Ingresando...' : 'Ingresar' }}
            </button>
          </form>

          <template v-if="showDemoAccounts">
            <div class="mt-8 pt-6 border-t border-white/10">
              <p class="text-center text-xs text-white/40 mb-3">Cuentas de ejemplo:</p>
              <div class="grid grid-cols-3 gap-2">
                <button
                  v-for="account in demoAccounts"
                  :key="account.username"
                  type="button"
                  class="border border-white/10 rounded-lg py-2 text-xs text-white/70 hover:border-[#c9a24b]/40 hover:text-white transition"
                  @click="fillDemoUser(account.username)"
                >
                  {{ account.label }}
                </button>
              </div>
            </div>
          </template>
        </div>
      </div>

      <p class="text-center text-xs text-white/20 mt-6">
        Acceso restringido. Solo personal autorizado.
      </p>
    </div>
  </div>
</template>