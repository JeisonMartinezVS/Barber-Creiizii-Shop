<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { doc, onSnapshot, updateDoc } from 'firebase/firestore'
import { db } from '../config/firebase'
import { useAuthStore } from '../stores/auth'
import { defaultSchedule, useBookingStore, WEEKDAY_LABELS, type DaySchedule } from '../stores/booking'
import DashboardStats from '../components/dashboard/DashboardStats.vue'
import ToggleSwitch from '../ui/ToggleSwitch.vue'

const authStore = useAuthStore()
const bookingStore = useBookingStore()

// Igual que en Cortes: admin elige a quién editar, un empleado solo ve/edita
// el suyo.
const targetBarberoId = ref<string | null>(authStore.isAdmin ? null : (authStore.user?.uid ?? null))

watch(
  () => bookingStore.barberos,
  (list) => {
    if (authStore.isAdmin && !targetBarberoId.value && list.length > 0) {
      targetBarberoId.value = list[0]!.id
    }
  },
  { immediate: true },
)

const targetBarberoName = computed(
  () => bookingStore.barberos.find((b) => b.id === targetBarberoId.value)?.name ?? '',
)

const schedule = ref<DaySchedule[]>(defaultSchedule())
const loading = ref(true)
const isSaving = ref(false)
const saveError = ref('')
const savedJustNow = ref(false)

// getDay(): 0 = Domingo ... 6 = Sábado — coincide con el orden de WEEKDAY_LABELS.
const todayIndex = new Date().getDay()
const today = computed<DaySchedule>(() => schedule.value[todayIndex] ?? schedule.value[0]!)

let unsubscribe: (() => void) | null = null

function subscribeToBarbero(barberoId: string) {
  unsubscribe?.()
  loading.value = true
  unsubscribe = onSnapshot(
    doc(db, 'empleados', barberoId),
    (snap) => {
      loading.value = false
      const data = snap.exists() ? (snap.data() as { schedule?: DaySchedule[] }) : undefined
      schedule.value =
        Array.isArray(data?.schedule) && data.schedule.length === 7
          ? data.schedule.map((d, i) => ({ ...d, label: WEEKDAY_LABELS[i]! }))
          : defaultSchedule()
    },
    (err) => {
      loading.value = false
      console.error('Error consultando horario:', err)
    },
  )
}

watch(
  targetBarberoId,
  (id) => {
    if (id) subscribeToBarbero(id)
  },
  { immediate: true },
)

async function saveSchedule() {
  if (!targetBarberoId.value) return
  saveError.value = ''
  savedJustNow.value = false
  isSaving.value = true
  try {
    await updateDoc(doc(db, 'empleados', targetBarberoId.value), {
      schedule: schedule.value,
    })
    savedJustNow.value = true
    setTimeout(() => (savedJustNow.value = false), 2500)
  } catch (err) {
    console.error('No se pudo guardar el horario:', err)
    saveError.value = 'No se pudo guardar el horario.'
  } finally {
    isSaving.value = false
  }
}
</script>

<template>
  <div>
    <DashboardStats />

    <div class="flex flex-col gap-3 md:flex-row md:items-center md:justify-between mb-4">
      <h1 class="font-serif text-xl font-bold text-white">
        Horarios
        <span v-if="targetBarberoName" class="text-white/40 font-normal text-base">— {{ targetBarberoName }}</span>
      </h1>
      <select
        v-if="authStore.isAdmin"
        v-model="targetBarberoId"
        class="bg-[#0e0e0e] border border-white/10 rounded-lg px-3 py-2 text-sm text-white/80 focus:outline-none focus:border-[#c9a24b]/50"
      >
        <option v-for="barbero in bookingStore.barberos" :key="barbero.id" :value="barbero.id">
          {{ barbero.name }}
        </option>
      </select>
    </div>

    <p v-if="loading" class="text-sm text-white/30 text-center py-10">Cargando horario...</p>

    <template v-else>
      <!-- Today status -->
      <div class="bg-[#0e0e0e] border border-white/10 rounded-xl px-5 py-4 flex items-center justify-between mb-4">
        <div>
          <p class="text-sm font-semibold text-white">{{ targetBarberoName }} — ¿Trabaja hoy?</p>
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
          class="px-5 py-3 flex flex-wrap items-center gap-3 sm:gap-4"
          :class="index !== schedule.length - 1 ? 'border-b border-white/5' : ''"
        >
          <div class="w-28 shrink-0 flex items-center gap-2">
            <span class="text-sm" :class="index === todayIndex ? 'text-[#c9a24b] font-semibold' : 'text-white/70'">
              {{ day.label }}
            </span>
            <span v-if="index === todayIndex" class="text-[10px] text-white/40">Hoy</span>
          </div>
          <ToggleSwitch v-model="day.enabled" color="#c9a24b" />
          <template v-if="day.enabled">
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
          </template>
          <span v-else class="text-xs text-white/30 italic">No disponible</span>
        </div>
      </div>

      <p v-if="saveError" class="text-xs text-red-400 mt-3">{{ saveError }}</p>
      <p v-if="savedJustNow" class="text-xs text-[#34d399] mt-3">Horario guardado.</p>

      <button
        type="button"
        :disabled="isSaving"
        class="mt-5 flex items-center gap-2 bg-gradient-to-b from-[#b6903f] to-[#8f7130] hover:from-[#c39c47] hover:to-[#9c7c37] disabled:opacity-50 text-[#1a1408] font-semibold text-sm rounded-lg px-4 py-2.5 transition"
        @click="saveSchedule"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2Z" />
          <polyline points="17 21 17 13 7 13 7 21" />
          <polyline points="7 3 7 8 15 8" />
        </svg>
        {{ isSaving ? 'Guardando...' : 'Guardar horario' }}
      </button>
    </template>
  </div>
</template>
