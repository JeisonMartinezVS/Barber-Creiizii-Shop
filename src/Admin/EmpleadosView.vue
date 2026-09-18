<script setup lang="ts">
import { onMounted, onUnmounted, reactive, ref } from 'vue'
import { collection, doc, onSnapshot, orderBy, query, setDoc } from 'firebase/firestore'
import { db } from '../config/firebase'
import { resolveEmail, useAuthStore } from '../stores/auth'
import { createStaffAuthAccount, generateRandomPassword } from '../lib/createStaffAccount'
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

const empleados = ref<Empleado[]>([])
let unsubscribe: (() => void) | null = null

onMounted(() => {
  const q = query(collection(db, 'empleados'), orderBy('name'))
  unsubscribe = onSnapshot(q, (snapshot) => {
    empleados.value = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }) as Empleado)
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

const form = reactive({
  name: '',
  email: '',
  phone: '',
})

// Set once creation succeeds — drives the "send via WhatsApp" screen.
const createdEmployee = ref<{ name: string; username: string; phone: string; password: string } | null>(null)

function openModal() {
  form.name = ''
  form.email = ''
  form.phone = ''
  formError.value = ''
  createdEmployee.value = null
  isModalOpen.value = true
}
function closeModal() {
  if (isSubmitting.value) return
  isModalOpen.value = false
}

function whatsappUrl(phone: string, name: string, username: string, password: string): string {
  const digits = phone.replace(/\D/g, '')
  const message =
    `Hola ${name}, ya tienes acceso al panel de Barber Creiizii Shop.\n\n` +
    `Usuario: ${username}\n` +
    `Contraseña temporal: ${password}\n\n` +
    `Cámbiala apenas puedas iniciar sesión.`
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`
}

async function submitNewEmployee() {
  formError.value = ''

  if (!form.name.trim() || !form.email.trim() || !form.phone.trim()) {
    formError.value = 'Nombre, correo/usuario y celular son obligatorios.'
    return
  }

  const email = resolveEmail(form.email)
  const isValidEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
  if (!isValidEmail) {
    formError.value = `"${email}" no es un correo válido. Revisa que no tenga espacios y que VITE_ADMIN_EMAIL_DOMAIN esté configurado (revisa tu .env).`
    return
  }

  const password = generateRandomPassword()

  isSubmitting.value = true
  try {
    // 1. Crea la cuenta de Auth SIN afectar tu propia sesión de admin.
    const uid = await createStaffAuthAccount(email, password)

    // 2. Guarda su ficha en Firestore. Firestore rules exige que quien
    //    escribe aquí ya sea admin — nunca desde este flujo directamente,
    //    la regla revisa el documento de QUIEN está logueado ahora (tú).
    await setDoc(doc(db, 'empleados', uid), {
      name: form.name.trim(),
      email,
      phone: form.phone.trim(),
      username: email.split('@')[0]!,
      role: 'empleado',
      active: true,
      createdAt: new Date().toISOString(),
    })

    createdEmployee.value = {
      name: form.name.trim(),
      username: email.split('@')[0]!,
      phone: form.phone.trim(),
      password,
    }
  } catch (err: unknown) {
    const code = (err as { code?: string })?.code
    if (code === 'auth/email-already-in-use') {
      formError.value = 'Ya existe una cuenta con ese correo/usuario.'
    } else if (code === 'auth/invalid-email') {
      formError.value = `Firebase rechazó "${email}" como correo. Revisa el valor de VITE_ADMIN_EMAIL_DOMAIN en tu .env.`
    } else if (code === 'auth/weak-password') {
      formError.value = 'La contraseña generada fue rechazada, intenta de nuevo.'
    } else {
      formError.value = 'No se pudo crear el empleado.'
      console.error(err)
    }
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
          <div class="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold text-[#e2b95a] bg-gradient-to-b from-[#5a4420] to-[#3a2f12] border border-[#c9a24b]/30">
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
              <span v-else class="text-[10px] uppercase tracking-wide border border-[#5b9bf7]/40 text-[#5b9bf7] rounded px-1.5 py-0.5">
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
            <h2 class="font-serif text-lg font-bold text-white">
              {{ createdEmployee ? '¡Empleado creado!' : 'Nuevo empleado' }}
            </h2>
            <button
              type="button"
              class="w-8 h-8 rounded-full border border-white/10 flex items-center justify-center text-white/50 hover:text-white hover:border-white/30 transition"
              aria-label="Cerrar"
              @click="closeModal"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>

          <!-- Éxito: enviar credenciales por WhatsApp -->
          <div v-if="createdEmployee" class="px-6 py-5">
            <div class="w-12 h-12 mx-auto mb-4 rounded-full bg-[#c9a24b]/10 border border-[#c9a24b]/30 flex items-center justify-center text-[#c9a24b]">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>
            <p class="text-sm text-white/70 text-center mb-4">
              <span class="text-white font-semibold">{{ createdEmployee.name }}</span> ya puede iniciar sesión.
              Envíale su contraseña temporal por WhatsApp:
            </p>
            <div class="bg-[#151515] border border-white/10 rounded-lg px-4 py-3 mb-4 text-center">
              <p class="text-xs text-white/40 mb-1">USUARIO</p>
              <p class="text-sm text-white font-mono mb-2">{{ createdEmployee.username }}</p>
              <p class="text-xs text-white/40 mb-1">CONTRASEÑA TEMPORAL</p>
              <p class="text-lg text-[#c9a24b] font-mono tracking-wide">{{ createdEmployee.password }}</p>
            </div>
            <a
              :href="whatsappUrl(createdEmployee.phone, createdEmployee.name, createdEmployee.username, createdEmployee.password)"
              target="_blank"
              rel="noopener"
              class="w-full flex items-center justify-center gap-2 bg-green-600 hover:bg-green-500 text-white font-semibold text-sm rounded-lg py-2.5 transition mb-3"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38a9.9 9.9 0 0 0 4.74 1.21h.01c5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.82 9.82 0 0 0 12.04 2Z" />
              </svg>
              Enviar por WhatsApp
            </a>
            <button
              type="button"
              class="w-full text-sm text-white/50 hover:text-white transition"
              @click="closeModal"
            >
              Cerrar
            </button>
          </div>

          <!-- Formulario -->
          <form v-else class="px-6 py-5 space-y-4" @submit.prevent="submitNewEmployee">
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
              <label class="block text-xs tracking-wide text-white/40 mb-1.5">CORREO O USUARIO</label>
              <input
                v-model="form.email"
                type="text"
                placeholder="empleado@creiizii.com o solo 'yeison'"
                class="w-full bg-[#151515] border border-white/10 rounded-lg px-4 py-2.5 text-sm text-white placeholder-white/30 focus:outline-none focus:border-[#c9a24b]/50"
              />
            </div>

            <div>
              <label class="block text-xs tracking-wide text-white/40 mb-1.5">CELULAR (WHATSAPP)</label>
              <input
                v-model="form.phone"
                type="tel"
                placeholder="+57 300 000 0000"
                class="w-full bg-[#151515] border border-white/10 rounded-lg px-4 py-2.5 text-sm text-white placeholder-white/30 focus:outline-none focus:border-[#c9a24b]/50"
              />
            </div>

            <p class="text-xs text-white/30">
              La contraseña se genera sola — no la escribes tú. En el siguiente paso te doy el link de WhatsApp
              ya armado con el mensaje para enviársela.
            </p>

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
