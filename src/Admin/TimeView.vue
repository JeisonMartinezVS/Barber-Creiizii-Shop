<script setup lang="ts">
import { computed, ref } from 'vue'
import DashboardStats from '../components/dashboard/DashboardStats.vue'
import ToggleSwitch from '../ui/ToggleSwitch.vue'

interface DaySchedule {
  label: string
  enabled: boolean
  start: string // 24h "HH:MM" for the native time input
  end: string
}

// TODO: this dropdown should list real staff from Firestore, and each one
// should load/save their own schedule instead of sharing this single array.
const staffOptions = ['Administrador', 'Yeison Creiizii', 'Camilo Estilo']
const selectedStaff = ref(staffOptions[0])

// getDay(): 0 = Domingo ... 6 = Sábado, matching the order below.
const todayIndex = new Date().getDay()

const schedule = ref<DaySchedule[]>([
  { label: 'Domingo', enabled: true, start: '12:00', end: '19:00' },
  { label: 'Lunes', enabled: true, start: '10:00', end: '21:00' },
  { label: 'Martes', enabled: true, start: '10:00', end: '21:00' },
  { label: 'Miércoles', enabled: true, start: '10:00', end: '21:00' },
  { label: 'Jueves', enabled: true, start: '10:00', end: '21:00' },
  { label: 'Viernes', enabled: true, start: '10:00', end: '21:00' },
  { label: 'Sábado', enabled: true, start: '10:00', end: '22:00' },
])

const today = computed(() => schedule.value[todayIndex])

function saveSchedule() {
  // TODO: persist `schedule` for `selectedStaff` to Firestore.
}
</script>

<template>
  <div>
    <DashboardStats />

    <div class="flex items-center justify-between mb-4">
      <h1 class="font-serif text-xl font-bold text-white">Horarios</h1>
      <select
        v-model="selectedStaff"
        class="bg-[#0e0e0e] border border-white/10 rounded-lg px-3 py-2 text-sm text-white/80 focus:outline-none focus:border-[#c9a24b]/50"
      >
        <option v-for="name in staffOptions" :key="name" :value="name">{{ name }}</option>
      </select>
    </div>

    <!-- Today status -->
    <div class="bg-[#0e0e0e] border border-white/10 rounded-xl px-5 py-4 flex items-center justify-between mb-4">
      <div>
        <p class="text-sm font-semibold text-white">{{ selectedStaff }} — ¿Trabaja hoy?</p>
        <p class="text-xs text-white/40 mt-0.5">{{ today.label }}</p>
      </div>
      <ToggleSwitch v-model="today.enabled" color="#c9a24b" />
    </div>

    <!-- Weekly schedule -->
    <div class="bg-[#0e0e0e] border border-white/10 rounded-xl overflow-hidden">
      <div class="px-5 py-3 border-b border-white/10">
        <p class="text-xs tracking-wide text-white/40">HORARIO SEMANAL</p>
      </div>
      <div
        v-for="(day, index) in schedule"
        :key="day.label"
        class="px-5 py-3 flex items-center gap-4"
        :class="index !== schedule.length - 1 ? 'border-b border-white/5' : ''"
      >
        <div class="w-28 shrink-0 flex items-center gap-2">
          <span class="text-sm" :class="index === todayIndex ? 'text-[#c9a24b] font-semibold' : 'text-white/70'">
            {{ day.label }}
          </span>
          <span v-if="index === todayIndex" class="text-[10px] text-white/40">Hoy</span>
        </div>
        <ToggleSwitch v-model="day.enabled" color="#c9a24b" />
        <input
          v-model="day.start"
          type="time"
          class="bg-[#151515] border border-white/10 rounded-lg px-3 py-1.5 text-sm text-white/80 focus:outline-none focus:border-[#c9a24b]/50"
        />
        <span class="text-xs text-white/40">a</span>
        <input
          v-model="day.end"
          type="time"
          class="bg-[#151515] border border-white/10 rounded-lg px-3 py-1.5 text-sm text-white/80 focus:outline-none focus:border-[#c9a24b]/50"
        />
      </div>
    </div>

    <button
      type="button"
      class="mt-5 flex items-center gap-2 bg-gradient-to-b from-[#b6903f] to-[#8f7130] hover:from-[#c39c47] hover:to-[#9c7c37] text-[#1a1408] font-semibold text-sm rounded-lg px-4 py-2.5 transition"
      @click="saveSchedule"
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2Z" />
        <polyline points="17 21 17 13 7 13 7 21" />
        <polyline points="7 3 7 8 15 8" />
      </svg>
      Guardar horario
    </button>
  </div>
</template>
