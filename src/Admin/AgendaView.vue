<script setup lang="ts">
import { ref } from 'vue'
import StatCard from '../components/dashboard/StatCard.vue'

// TODO: replace with real Firestore data once the citas collection is wired up.
const stats = [
  {
    label: 'Citas hoy',
    value: '0',
    accent: '#c9a24b',
    icon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>`,
  },
  {
    label: 'Este mes',
    value: '0',
    accent: '#5b9bf7',
    icon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>`,
  },
  {
    label: 'Ingresos hoy',
    value: '$0',
    accent: '#34d399',
    icon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>`,
  },
  {
    label: 'Pendientes',
    value: '0',
    accent: '#f2b705',
    icon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>`,
  },
]

// TODO: replace with real citas fetched from Firestore.
const citas = ref<Array<{ id: string }>>([])
const selectedDate = ref('')
const selectedStatus = ref('todos')
const selectedBarber = ref('todos')

function refresh() {
  // TODO: re-fetch citas from Firestore.
}
</script>

<template>
  <div>
    <!-- Stat cards -->
    <div class="grid grid-cols-4 gap-4 mb-6">
      <StatCard
        v-for="stat in stats"
        :key="stat.label"
        :label="stat.label"
        :value="stat.value"
        :icon="stat.icon"
        :accent="stat.accent"
      />
    </div>

    <!-- Toolbar -->
    <div class="flex items-center justify-between mb-4 flex-wrap gap-3">
      <h1 class="font-serif text-xl font-bold text-white">Agenda de Citas</h1>
      <div class="flex items-center gap-2">
        <button
          type="button"
          class="w-9 h-9 flex items-center justify-center rounded-lg border border-white/10 text-white/60 hover:text-white hover:border-white/20 transition"
          aria-label="Actualizar"
          @click="refresh"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="23 4 23 10 17 10" />
            <polyline points="1 20 1 14 7 14" />
            <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
          </svg>
        </button>
        <input
          v-model="selectedDate"
          type="date"
          class="bg-[#0e0e0e] border border-white/10 rounded-lg px-3 py-2 text-sm text-white/70 focus:outline-none focus:border-[#c9a24b]/50"
        />
        <select
          v-model="selectedStatus"
          class="bg-[#0e0e0e] border border-white/10 rounded-lg px-3 py-2 text-sm text-white/70 focus:outline-none focus:border-[#c9a24b]/50"
        >
          <option value="todos">Todos los estados</option>
          <option value="confirmada">Confirmada</option>
          <option value="pendiente">Pendiente</option>
          <option value="cancelada">Cancelada</option>
        </select>
        <select
          v-model="selectedBarber"
          class="bg-[#0e0e0e] border border-white/10 rounded-lg px-3 py-2 text-sm text-white/70 focus:outline-none focus:border-[#c9a24b]/50"
        >
          <option value="todos">Todos los barberos</option>
        </select>
      </div>
    </div>

    <!-- Agenda list -->
    <div class="bg-[#0e0e0e] border border-white/10 rounded-xl min-h-[280px] flex items-center justify-center">
      <div v-if="citas.length === 0" class="text-center py-16">
        <svg
          class="mx-auto mb-3 text-white/20"
          width="40"
          height="40"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="1.5"
        >
          <rect x="3" y="4" width="18" height="18" rx="2" />
          <path d="M16 2v4M8 2v4M3 10h18" />
        </svg>
        <p class="text-sm text-white/40">No hay citas que mostrar</p>
      </div>
      <ul v-else class="w-full divide-y divide-white/5">
        <!-- TODO: render real cita rows here -->
      </ul>
    </div>
  </div>
</template>