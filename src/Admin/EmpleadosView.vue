<script setup lang="ts">
import { ref } from 'vue'
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

// TODO: replace with real staff fetched from Firestore. These three match the
// accounts created in Firebase Auth for the login screen (admin/yeison/camilo).
const empleados = ref<Empleado[]>([
  {
    id: '1',
    name: 'Administrador',
    role: 'admin',
    username: 'admin',
    email: 'admin@creiizii.com',
    phone: '+57 300 628 2601',
    active: true,
  },
  {
    id: '2',
    name: 'Yeison Creiizii',
    role: 'empleado',
    username: 'yeison',
    email: 'yeison@creiizii.com',
    phone: '+57 311 000 0001',
    active: true,
  },
  {
    id: '3',
    name: 'Camilo Estilo',
    role: 'empleado',
    username: 'camilo',
    email: 'camilo@creiizii.com',
    phone: '+57 311 000 0002',
    active: true,
  },
])

function initial(name: string) {
  return name.charAt(0).toUpperCase()
}
/*
function editEmpleado(empleado: Empleado) {
  // TODO: open an edit form/modal for this empleado.
}

function deleteEmpleado(id: string) {
  // TODO: confirm and delete from Firestore.
}
*/
function addEmpleado() {
  // TODO: open a "nuevo empleado" form/modal.
}
</script>

<template>
  <div>
    <DashboardStats />

    <div class="flex items-center justify-between mb-4">
      <h1 class="font-serif text-xl font-bold text-white">Empleados</h1>
      <button
        type="button"
        class="flex items-center gap-2 bg-gradient-to-b from-[#b6903f] to-[#8f7130] hover:from-[#c39c47] hover:to-[#9c7c37] text-[#1a1408] font-semibold text-sm rounded-lg px-4 py-2 transition"
        @click="addEmpleado"
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

        <div class="flex items-center gap-2">
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
    </div>
  </div>
</template>
