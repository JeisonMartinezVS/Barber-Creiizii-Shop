<script setup lang="ts">
import { computed, onUnmounted, ref, watch } from 'vue'
import { collection, onSnapshot, query, where } from 'firebase/firestore'
import { db } from '../config/firebase'
import { useAuthStore } from '../stores/auth'
import { formatLocalDate, useBookingStore } from '../stores/booking'
import DashboardStats from '../components/dashboard/DashboardStats.vue'

const authStore = useAuthStore()
const bookingStore = useBookingStore() // lista viva de barberos, para el selector del admin

type CitaStatus = 'pendiente' | 'confirmada' | 'completada' | 'cancelada' | 'no_asistio'

interface Cita {
  id: string
  barberoId: string
  total: number
  date: string // "YYYY-MM-DD" — derivado de dateTime, no del campo string guardado
  status: CitaStatus
}

// 'todos' solo existe para el admin — un empleado siempre ve lo suyo.
const scope = ref<string>(authStore.isAdmin ? 'todos' : (authStore.user?.uid ?? ''))

const scopeName = computed(() => {
  if (scope.value === 'todos') return 'Todo el equipo'
  return bookingStore.barberos.find((b) => b.id === scope.value)?.name ?? ''
})

const citas = ref<Cita[]>([])
const isLoading = ref(true)
let unsubscribe: (() => void) | null = null

function subscribe() {
  unsubscribe?.()
  isLoading.value = true
  const base = collection(db, 'citas')
  // Sin orderBy a propósito: para sumar/contar no hace falta que vengan
  // ordenadas, y así esta consulta nunca necesita un índice compuesto (el
  // que antes exigía barberoId + date era justo lo que fallaba en
  // silencio y dejaba los números de "Todo el equipo" pegados).
  const q =
    scope.value === 'todos' ? query(base) : query(base, where('barberoId', '==', scope.value))

  unsubscribe = onSnapshot(
    q,
    (snapshot) => {
      citas.value = snapshot.docs.map((d) => {
        const data = d.data() as { barberoId: string; total: number; status: CitaStatus; dateTime?: { toDate: () => Date }; date?: string }
        const date = data.dateTime ? formatLocalDate(data.dateTime.toDate()) : (data.date ?? '')
        return { id: d.id, barberoId: data.barberoId, total: data.total, status: data.status, date }
      })
      isLoading.value = false
    },
    (err) => {
      console.error('No se pudieron cargar los reportes', err)
      citas.value = [] // antes se quedaban los datos del scope anterior — ahora sí se limpian
      isLoading.value = false
    },
  )
}
watch(scope, subscribe, { immediate: true })
onUnmounted(() => unsubscribe?.())

// --- Cálculos -------------------------------------------------------------
const today = new Date()
const todayStr = formatLocalDate(today)

function isSameMonth(dateStr: string) {
  const [y, m] = dateStr.split('-').map(Number)
  return y === today.getFullYear() && m === today.getMonth() + 1
}

const thisMonthCitas = computed(() => citas.value.filter((c) => isSameMonth(c.date)))
const nonCancelled = computed(() => citas.value.filter((c) => c.status !== 'cancelada'))

const totalReservasMes = computed(() => thisMonthCitas.value.length)
const ingresosMes = computed(() =>
  thisMonthCitas.value.filter((c) => c.status !== 'cancelada').reduce((sum, c) => sum + c.total, 0),
)
const ingresosTotales = computed(() => nonCancelled.value.reduce((sum, c) => sum + c.total, 0))
const cortesHoy = computed(() => citas.value.filter((c) => c.date === todayStr && c.status === 'completada').length)
const cortesMes = computed(() => thisMonthCitas.value.filter((c) => c.status === 'completada').length)
const pendientes = computed(() => citas.value.filter((c) => c.status === 'pendiente').length)

const kpis = computed(() => [
  { label: 'Reservas este mes', value: String(totalReservasMes.value), accent: '#5b9bf7' },
  { label: 'Ingresos este mes', value: `$${ingresosMes.value.toLocaleString('es-CO')}`, accent: '#34d399' },
  { label: 'Ingresos totales', value: `$${ingresosTotales.value.toLocaleString('es-CO')}`, accent: '#c9a24b' },
  { label: 'Cortes completados hoy', value: String(cortesHoy.value), accent: '#c9a24b' },
  { label: 'Cortes completados este mes', value: String(cortesMes.value), accent: '#5b9bf7' },
  { label: 'Pendientes', value: String(pendientes.value), accent: '#f2b705' },
])

// --- Ingresos día a día (últimos 14 días) ----------------------------------
const dailyIncome = computed(() => {
  const days: Array<{ dateStr: string; dayLabel: string; value: number }> = []
  for (let i = 13; i >= 0; i--) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    const dateStr = formatLocalDate(d)
    const value = citas.value
      .filter((c) => c.date === dateStr && c.status !== 'cancelada')
      .reduce((sum, c) => sum + c.total, 0)
    days.push({ dateStr, dayLabel: String(d.getDate()), value })
  }
  return days
})
const maxDailyIncome = computed(() => Math.max(1, ...dailyIncome.value.map((d) => d.value)))
const hasIncomeData = computed(() => dailyIncome.value.some((d) => d.value > 0))

const todayIncome = computed(() => dailyIncome.value.find((d) => d.dateStr === todayStr)?.value ?? 0)
const yesterdayStr = (() => {
  const d = new Date()
  d.setDate(d.getDate() - 1)
  return formatLocalDate(d)
})()
const yesterdayIncome = computed(() => dailyIncome.value.find((d) => d.dateStr === yesterdayStr)?.value ?? 0)
const incomeDelta = computed(() => todayIncome.value - yesterdayIncome.value)

// --- Distribución de estados ------------------------------------------------
const STATUS_LABELS: Record<CitaStatus, string> = {
  pendiente: 'Pendiente',
  confirmada: 'Confirmada',
  completada: 'Completada',
  cancelada: 'Cancelada',
  no_asistio: 'No asistió',
}
const STATUS_COLORS: Record<CitaStatus, string> = {
  pendiente: '#f2b705',
  confirmada: '#5b9bf7',
  completada: '#34d399',
  cancelada: '#f87171',
  no_asistio: '#f2994a',
}
const statusBreakdown = computed(() => {
  const counts: Partial<Record<CitaStatus, number>> = {}
  for (const cita of citas.value) counts[cita.status] = (counts[cita.status] ?? 0) + 1
  const total = citas.value.length || 1
  return (Object.keys(STATUS_LABELS) as CitaStatus[]).map((status) => ({
    status,
    label: STATUS_LABELS[status],
    color: STATUS_COLORS[status],
    count: counts[status] ?? 0,
    pct: Math.round(((counts[status] ?? 0) / total) * 100),
  }))
})
</script>

<template>
  <div>
    <DashboardStats />

    <div class="flex flex-col gap-3 md:flex-row md:items-center md:justify-between mb-4">
      <h1 class="font-serif text-xl font-bold text-white">
        Reportes <span class="text-white/40 font-normal text-base">— {{ scopeName }}</span>
      </h1>
      <select
        v-if="authStore.isAdmin"
        v-model="scope"
        class="bg-[#0e0e0e] border border-white/10 rounded-lg px-3 py-2 text-sm text-white/80 focus:outline-none focus:border-[#c9a24b]/50"
      >
        <option value="todos">Todo el equipo</option>
        <option v-for="barbero in bookingStore.barberos" :key="barbero.id" :value="barbero.id">
          {{ barbero.name }}
        </option>
      </select>
    </div>

    <p v-if="isLoading" class="text-sm text-white/30 text-center py-10">Cargando reportes...</p>

    <template v-else>
      <!-- KPIs -->
      <div class="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4 mb-6">
        <div v-for="kpi in kpis" :key="kpi.label" class="bg-[#0e0e0e] border border-white/10 rounded-xl p-4">
          <p class="text-xs text-white/50 mb-2 leading-tight">{{ kpi.label }}</p>
          <p class="text-xl font-bold" :style="{ color: kpi.accent }">{{ kpi.value }}</p>
        </div>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <!-- Ingresos día a día -->
        <div class="lg:col-span-2 bg-[#0e0e0e] border border-white/10 rounded-xl p-5">
          <div class="flex items-center justify-between mb-4">
            <p class="text-sm font-semibold text-white">Ingresos — últimos 14 días</p>
            <p v-if="hasIncomeData" class="text-xs" :class="incomeDelta >= 0 ? 'text-[#34d399]' : 'text-red-400'">
              Hoy ${{ todayIncome.toLocaleString('es-CO') }}
              <span class="text-white/30">vs. ayer ${{ yesterdayIncome.toLocaleString('es-CO') }}</span>
              ({{ incomeDelta >= 0 ? '+' : '' }}{{ incomeDelta.toLocaleString('es-CO') }})
            </p>
          </div>

          <div v-if="!hasIncomeData" class="h-[160px] flex items-center justify-center">
            <p class="text-sm text-white/30">Sin datos todavía</p>
          </div>
          <div v-else class="flex items-end gap-1.5 h-[160px]">
            <div
              v-for="day in dailyIncome"
              :key="day.dateStr"
              class="flex-1 flex flex-col items-center justify-end h-full"
            >
              <div
                class="w-full rounded-t transition-all"
                :class="day.dateStr === todayStr ? 'bg-[#c9a24b]' : 'bg-[#5b9bf7]/50'"
                :style="{ height: `${Math.max(3, (day.value / maxDailyIncome) * 100)}%` }"
                :title="`$${day.value.toLocaleString('es-CO')}`"
              ></div>
              <span class="text-[10px] text-white/30 mt-1">{{ day.dayLabel }}</span>
            </div>
          </div>
        </div>

        <!-- Distribución de estados -->
        <div class="bg-[#0e0e0e] border border-white/10 rounded-xl p-5">
          <p class="text-sm font-semibold text-white mb-4">Distribución de estados</p>
          <div v-if="citas.length === 0" class="h-[140px] flex items-center justify-center">
            <p class="text-sm text-white/30">Sin datos aún</p>
          </div>
          <div v-else class="space-y-3">
            <div v-for="item in statusBreakdown" :key="item.status">
              <div class="flex items-center justify-between text-xs mb-1">
                <span class="text-white/60">{{ item.label }}</span>
                <span class="text-white/40">{{ item.count }}</span>
              </div>
              <div class="h-1.5 bg-white/5 rounded-full overflow-hidden">
                <div
                  class="h-full rounded-full transition-all"
                  :style="{ width: `${item.pct}%`, backgroundColor: item.color }"
                ></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>
