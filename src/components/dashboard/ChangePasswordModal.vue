<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../../stores/auth'

// Modal obligatorio del primer ingreso: no se puede cerrar hasta cambiar la
// contraseña temporal (solo queda la opción de cerrar sesión).

const MIN_LENGTH = 8

const authStore = useAuthStore()
const router = useRouter()

const newPassword = ref('')
const confirmPassword = ref('')
const showPasswords = ref(false)
const isSaving = ref(false)
const error = ref('')

const lengthOk = computed(() => newPassword.value.length >= MIN_LENGTH)
const matchOk = computed(() => confirmPassword.value.length > 0 && newPassword.value === confirmPassword.value)
const canSubmit = computed(() => lengthOk.value && matchOk.value && !isSaving.value)

async function submit() {
  error.value = ''
  if (!lengthOk.value) {
    error.value = `La contraseña debe tener al menos ${MIN_LENGTH} caracteres.`
    return
  }
  if (!matchOk.value) {
    error.value = 'Las contraseñas no coinciden.'
    return
  }

  isSaving.value = true
  const result = await authStore.changePassword(newPassword.value)
  isSaving.value = false
  if (result.ok) return

  if (result.code === 'auth/requires-recent-login') {
    // Firebase solo permite cambiar la contraseña poco después de iniciar
    // sesión; si la sesión es vieja hay que volver a entrar.
    error.value = 'Por seguridad, cierra sesión y vuelve a ingresar con tu contraseña temporal para cambiarla.'
  } else if (result.code === 'auth/weak-password') {
    error.value = 'Esa contraseña es muy débil. Prueba con una más larga.'
  } else {
    error.value = 'No se pudo cambiar la contraseña. Intenta de nuevo.'
  }
}

async function handleLogout() {
  await authStore.logout()
  router.push({ name: 'Login' })
}
</script>

<template>
  <Teleport to="body">
    <div class="fixed inset-0 bg-black/80 z-50 flex items-center justify-center px-4">
      <div class="relative w-full max-w-md" role="dialog" aria-modal="true" aria-labelledby="change-password-title">
        <div
          class="absolute inset-x-6 -top-px h-px bg-linear-to-r from-transparent via-[#c9a24b] to-transparent"
        ></div>
        <form
          class="bg-[#0e0e0e] border border-white/10 rounded-2xl shadow-2xl overflow-hidden"
          @submit.prevent="submit"
        >
          <div class="px-6 pt-6 pb-4 border-b border-white/10">
            <div
              class="w-12 h-12 mb-3 rounded-full bg-[#c9a24b]/10 border border-[#c9a24b]/30 flex items-center justify-center text-[#c9a24b]"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="3" y="11" width="18" height="11" rx="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
            </div>
            <h2 id="change-password-title" class="font-serif text-lg font-bold text-white">Cambia tu contraseña</h2>
            <p class="text-sm text-white/50 mt-1">
              Estás usando una contraseña temporal. Crea una nueva para continuar usando el panel.
            </p>
          </div>

          <div class="px-6 py-5 space-y-4">
            <div>
              <label for="new-password" class="block text-xs text-white/60 mb-1.5">Nueva contraseña</label>
              <input
                id="new-password"
                v-model="newPassword"
                :type="showPasswords ? 'text' : 'password'"
                autocomplete="new-password"
                placeholder="Mínimo 8 caracteres"
                class="w-full bg-[#151515] border border-white/10 rounded-lg py-2.5 px-4 text-sm text-white placeholder-white/30 focus:outline-none focus:border-[#c9a24b]/60 focus:ring-1 focus:ring-[#c9a24b]/30 transition"
              />
            </div>

            <div>
              <label for="confirm-password" class="block text-xs text-white/60 mb-1.5">Confirmar contraseña</label>
              <input
                id="confirm-password"
                v-model="confirmPassword"
                :type="showPasswords ? 'text' : 'password'"
                autocomplete="new-password"
                placeholder="Repite la nueva contraseña"
                class="w-full bg-[#151515] border border-white/10 rounded-lg py-2.5 px-4 text-sm text-white placeholder-white/30 focus:outline-none focus:border-[#c9a24b]/60 focus:ring-1 focus:ring-[#c9a24b]/30 transition"
              />
            </div>

            <label class="flex items-center gap-2 text-xs text-white/50 cursor-pointer select-none">
              <input v-model="showPasswords" type="checkbox" class="accent-[#c9a24b]" />
              Mostrar contraseñas
            </label>

            <ul class="space-y-1 text-xs">
              <li :class="lengthOk ? 'text-[#34d399]' : 'text-white/40'">
                {{ lengthOk ? '✓' : '•' }} Al menos {{ MIN_LENGTH }} caracteres
              </li>
              <li :class="matchOk ? 'text-[#34d399]' : 'text-white/40'">
                {{ matchOk ? '✓' : '•' }} Ambas contraseñas coinciden
              </li>
            </ul>


            <p v-if="error" class="text-xs text-red-400 bg-red-400/10 border border-red-400/20 rounded-lg px-3 py-2">
              {{ error }}
            </p>
          </div>

          <div class="flex items-center justify-between gap-3 px-6 py-4 border-t border-white/10">
            <button
              type="button"
              class="text-sm text-white/50 hover:text-white transition"
              @click="handleLogout"
            >
              Cerrar sesión
            </button>
            <button
              type="submit"
              :disabled="!canSubmit"
              class="bg-linear-to-b from-[#b6903f] to-[#8f7130] hover:from-[#c39c47] hover:to-[#9c7c37] disabled:opacity-40 disabled:cursor-not-allowed text-[#1a1408] font-semibold text-sm rounded-lg px-5 py-2 transition"
            >
              {{ isSaving ? 'Guardando...' : 'Cambiar contraseña' }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </Teleport>
</template>
