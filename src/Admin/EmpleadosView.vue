<script setup lang="ts">
import { onMounted, onUnmounted, reactive, ref } from 'vue'
import { collection, onSnapshot, orderBy, query } from 'firebase/firestore'
import { getFunctions, httpsCallable } from 'firebase/functions'
import { db } from '../config/firebase'
import { useAuthStore } from '../stores/auth'
import DashboardStats from '../components/dashboard/DashboardStats.vue'
import ToggleSwitch from '../ui/ToggleSwitch.vue'

interface Empleado {
  id: string
  name: string
  role: 'admin' | 'empleado'
  username: string
  email: string
  phone: string
  active: boolean
}

const authStore = useAuthStore()
const functions = getFunctions()

const empleados = ref<Empleado[]>([])
let unsubscribe: (() => void) | null = null

onMounted(() => {
  const q = query(collection(db, 'empleados'), orderBy('name'))
  unsubscribe = onSnapshot(q, (snapshot) => {
    empleados.value = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }) as Empleado)
  })
})
onUnmounted(() => unsubscribe?.())

function initial(name: string) {
  return name.charAt(0).toUpperCase()
}

function editEmpleado(empleado: Empleado) {
  console.log('Editar empleado:', empleado)
}
function deleteEmpleado(id: string) {
  console.log('Eliminar empleado:', id)
}

// --- Modal: nuevo empleado -------------------------------------------------
const isModalOpen = ref(false)
const isSubmitting = ref(false)
const formError = ref('')
const showPassword = ref(false)

const form = reactive({
  name: '',
  email: '',
  phone: '',
  password: '',
})

function openModal() {
  form.name = ''
  form.email = ''
  form.phone = ''
  form.password = ''
  formError.value = ''
  showPassword.value = false
  isModalOpen.value = true
}
function closeModal() {
  if (isSubmitting.value) return
  isModalOpen.value = false
}

async function submitNewEmployee() {
  formError.value = ''

  if (!form.name.trim() || !form.email.trim() || !form.password) {
    formError.value = 'Nombre, correo y contraseña son obligatorios.'
    return
  }
  if (form.password.length < 6) {
    formError.value = 'La contraseña debe tener al menos 6 caracteres.'
    return
  }

  isSubmitting.value = true
  try {
    const createEmployee = httpsCallable(functions, 'createEmployee')
    await createEmployee({
      name: form.name.trim(),
      email: form.email.trim(),
      phone: form.phone.trim(),
      password: form.password,
    })
    // No need to manually add it to `empleados` — the onSnapshot listener
    // above picks up the new Firestore doc automatically.
    isModalOpen.value = false
  } catch (err: unknown) {
    formError.value = err instanceof Error ? err.message : 'No se pudo crear el empleado.'
  } finally {
    isSubmitting.value = false
  }
}
</script>

<template>
  <div>
    <DashboardStats />

    <div class="flex items-center justify-between mb-4">
      <h1 class="font-serif text-xl font-bold text-white">Empleados</h1>
      <button
        v-if="authStore.isAdmin"
        type="button"
        class="flex items-center gap-2 bg-gradient-to-b from-[#b6903f] to-[#8f7130] hover:from-[#c39c47] hover:to-[#9c7c37] text-[#1a1408] font-semibold text-sm rounded-lg px-4 py-2 transition"
        @click="openModal"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="12" y1="5" x2="12" y2="19" />
          <line x1="5" y1="12" x2="19" y2="12" />
        </svg>
        Nuevo empleado
      </button>
    </div>

    <div class="space-y-3">
      <div
        v-for="empleado in empleados"
        :key="empleado.id"
        class="bg-[#0e0e0e] border border-white/10 rounded-xl px-5 py-4 flex items-center justify-between"
      >
        <div class="flex items-center gap-4">
          <div
            class="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold text-[#e2b95a] bg-gradient-to-b from-[#5a4420] to-[#3a2f12] border border-[#c9a24b]/30"
          >
            {{ initial(empleado.name) }}
          </div>
          <div>
            <div class="flex items-center gap-2">
              <p class="text-sm font-semibold text-white">{{ empleado.name }}</p>
              <span
                v-if="empleado.role === 'admin'"
                class="text-[10px] uppercase tracking-wide border border-[#c9a24b]/40 text-[#c9a24b] rounded px-1.5 py-0.5"
              >
                Admin
              </span>
              <span
                v-else
                class="text-[10px] uppercase tracking-wide border border-[#5b9bf7]/40 text-[#5b9bf7] rounded px-1.5 py-0.5"
              >
                Empleado
              </span>
            </div>
            <p class="text-xs text-white/40 mt-0.5">@{{ empleado.username }} · {{ empleado.email }}</p>
            <p class="text-xs text-white/40">{{ empleado.phone }}</p>
          </div>
        </div>
        <div v-if="authStore.isAdmin" class="flex items-center gap-2">
          <ToggleSwitch v-model="empleado.active" />
          <button
            type="button"
            class="w-9 h-9 flex items-center justify-center rounded-lg border border-white/10 text-white/50 hover:text-white hover:border-white/20 transition"
            aria-label="Editar"
            @click="editEmpleado(empleado)"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
              <path d="M18.5 2.5a2.12 2.12 0 0 1 3 3L12 15l-4 1 1-4Z" />
            </svg>
          </button>
          <button
            type="button"
            class="w-9 h-9 flex items-center justify-center rounded-lg border border-white/10 text-white/50 hover:text-red-400 hover:border-red-400/30 transition"
            aria-label="Eliminar"
            @click="deleteEmpleado(empleado.id)"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="3 6 5 6 21 6" />
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
            </svg>
          </button>
        </div>
      </div>

      <p v-if="empleados.length === 0" class="text-sm text-white/30 text-center py-10">
        Sin empleados registrados todavía.
      </p>
    </div>

    <!-- Modal: nuevo empleado -->
    <Teleport to="body">
      <div v-if="isModalOpen" class="fixed inset-0 bg-black/70 z-50 flex items-center justify-center px-4">
        <div class="w-full max-w-md bg-[#0e0e0e] border border-white/10 rounded-2xl shadow-2xl overflow-hidden">
          <div class="flex items-center justify-between px-6 pt-5 pb-4 border-b border-white/10">
            <h2 class="font-serif text-lg font-bold text-white">Nuevo empleado</h2>
            <button
              type="button"
              class="w-8 h-8 rounded-full border border-white/10 flex items-center justify-center text-white/50 hover:text-white hover:border-white/30 transition"
              aria-label="Cerrar"
              @click="closeModal"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>

          <form class="px-6 py-5 space-y-4" @submit.prevent="submitNewEmployee">
            <!-- Foto: UI only for now, not wired up yet -->
            <div class="flex flex-col items-center gap-2 mb-2">
              <div
                class="w-16 h-16 rounded-full border border-dashed border-white/20 flex items-center justify-center text-white/30"
              >
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                  <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2Z" />
                  <circle cx="12" cy="13" r="4" />
                </svg>
              </div>
              <button
                type="button"
                disabled
                class="text-xs text-white/30 border border-white/10 rounded-lg px-3 py-1.5 cursor-not-allowed"
              >
                Subir foto (próximamente)
              </button>
            </div>

            <div>
              <label class="block text-xs tracking-wide text-white/40 mb-1.5">NOMBRE COMPLETO</label>
              <input
                v-model="form.name"
                type="text"
                placeholder="Nombre del empleado"
                class="w-full bg-[#151515] border border-white/10 rounded-lg px-4 py-2.5 text-sm text-white placeholder-white/30 focus:outline-none focus:border-[#c9a24b]/50"
              />
            </div>

            <div>
              <label class="block text-xs tracking-wide text-white/40 mb-1.5">CORREO</label>
              <input
                v-model="form.email"
                type="email"
                placeholder="empleado@creiizii.com"
                class="w-full bg-[#151515] border border-white/10 rounded-lg px-4 py-2.5 text-sm text-white placeholder-white/30 focus:outline-none focus:border-[#c9a24b]/50"
              />
            </div>

            <div>
              <label class="block text-xs tracking-wide text-white/40 mb-1.5">CELULAR</label>
              <input
                v-model="form.phone"
                type="tel"
                placeholder="+57 300 000 0000"
                class="w-full bg-[#151515] border border-white/10 rounded-lg px-4 py-2.5 text-sm text-white placeholder-white/30 focus:outline-none focus:border-[#c9a24b]/50"
              />
            </div>

            <div>
              <label class="block text-xs tracking-wide text-white/40 mb-1.5">CONTRASEÑA</label>
              <div class="relative">
                <input
                  v-model="form.password"
                  :type="showPassword ? 'text' : 'password'"
                  placeholder="Mínimo 6 caracteres"
                  class="w-full bg-[#151515] border border-white/10 rounded-lg px-4 py-2.5 pr-10 text-sm text-white placeholder-white/30 focus:outline-none focus:border-[#c9a24b]/50"
                />
                <button
                  type="button"
                  class="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition"
                  @click="showPassword = !showPassword"
                >
                  <svg v-if="!showPassword" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7Z" /><circle cx="12" cy="12" r="3" />
                  </svg>
                  <svg v-else width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M17.94 17.94A10.94 10.94 0 0 1 12 19c-7 0-11-7-11-7a21.6 21.6 0 0 1 5.06-5.94M9.9 4.24A10.4 10.4 0 0 1 12 4c7 0 11 7 11 7a21.6 21.6 0 0 1-3.24 4.39M14.12 14.12a3 3 0 1 1-4.24-4.24" />
                    <line x1="1" y1="1" x2="23" y2="23" />
                  </svg>
                </button>
              </div>
            </div>

            <p v-if="formError" class="text-xs text-red-400">{{ formError }}</p>

            <div class="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                class="text-sm text-white/50 hover:text-white transition"
                :disabled="isSubmitting"
                @click="closeModal"
              >
                Cancelar
              </button>
              <button
                type="submit"
                :disabled="isSubmitting"
                class="bg-gradient-to-b from-[#b6903f] to-[#8f7130] hover:from-[#c39c47] hover:to-[#9c7c37] disabled:opacity-50 text-[#1a1408] font-semibold text-sm rounded-lg px-4 py-2 transition"
              >
                {{ isSubmitting ? 'Creando...' : 'Crear empleado' }}
              </button>
            </div>
          </form>
        </div>
      </div>
    </Teleport>
  </div>
</template>
