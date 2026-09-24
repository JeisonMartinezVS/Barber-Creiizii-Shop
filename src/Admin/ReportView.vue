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
  time: string
  status: CitaStatus
  customerName: string
  serviceName: string
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
        const data = d.data() as {
          barberoId: string
          total: number
          status: CitaStatus
          dateTime?: { toDate: () => Date }
          date?: string
          time?: string
          customerName?: string
          serviceName?: string
        }
        const date = data.dateTime ? formatLocalDate(data.dateTime.toDate()) : (data.date ?? '')
        const time = data.time ?? (data.dateTime ? data.dateTime.toDate().toTimeString().slice(0, 5) : '')
        return {
          id: d.id,
          barberoId: data.barberoId,
          total: data.total,
          status: data.status,
          date,
          time,
          customerName: data.customerName ?? '',
          serviceName: data.serviceName ?? '',
        }
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

// --- Tabla de citas por mes (con filtro) -----------------------------------
// Valor del <input type="month">: "YYYY-MM". Arranca en el mes actual.
const selectedMonth = ref(`${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`)

const monthLabel = computed(() => {
  const [y, m] = selectedMonth.value.split('-').map(Number)
  const d = new Date(y!, m! - 1, 1)
  const label = d.toLocaleDateString('es-CO', { month: 'long', year: 'numeric' })
  return label.charAt(0).toUpperCase() + label.slice(1)
})

// Filtro opcional por día: "YYYY-MM-DD" o '' (= todo el mes).
const selectedDay = ref('')

// Mes y día se mantienen coherentes: elegir un día mueve el mes a ese día,
// y cambiar a un mes que no contiene el día elegido lo limpia.
watch(selectedDay, (day) => {
  if (day && !day.startsWith(selectedMonth.value)) selectedMonth.value = day.slice(0, 7)
})
watch(selectedMonth, (month) => {
  if (selectedDay.value && !selectedDay.value.startsWith(month)) selectedDay.value = ''
})

const monthBounds = computed(() => {
  const [y, m] = selectedMonth.value.split('-').map(Number)
  const lastDay = new Date(y!, m!, 0).getDate()
  return { min: `${selectedMonth.value}-01`, max: `${selectedMonth.value}-${String(lastDay).padStart(2, '0')}` }
})

const tableLabel = computed(() => {
  if (!selectedDay.value) return monthLabel.value
  const [y, m, d] = selectedDay.value.split('-').map(Number)
  return new Date(y!, m! - 1, d!).toLocaleDateString('es-CO', { day: 'numeric', month: 'long', year: 'numeric' })
})

const monthCitas = computed(() =>
  citas.value
    .filter((c) => (selectedDay.value ? c.date === selectedDay.value : c.date.startsWith(selectedMonth.value)))
    .slice()
    .sort((a, b) => (a.date === b.date ? a.time.localeCompare(b.time) : a.date.localeCompare(b.date))),
)

// --- Paginación de la tabla ------------------------------------------------
const PAGE_SIZE = 10
const currentPage = ref(1)
const totalPages = computed(() => Math.max(1, Math.ceil(monthCitas.value.length / PAGE_SIZE)))
const pagedCitas = computed(() =>
  monthCitas.value.slice((currentPage.value - 1) * PAGE_SIZE, currentPage.value * PAGE_SIZE),
)
const pageStart = computed(() => (monthCitas.value.length === 0 ? 0 : (currentPage.value - 1) * PAGE_SIZE + 1))
const pageEnd = computed(() => Math.min(currentPage.value * PAGE_SIZE, monthCitas.value.length))

// Números de página a mostrar, con '…' cuando hay muchas: 1 … 4 5 6 … 12
const pageNumbers = computed<Array<number | '…'>>(() => {
  const total = totalPages.value
  const current = currentPage.value
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1)
  const pages: Array<number | '…'> = [1]
  const from = Math.max(2, current - 1)
  const to = Math.min(total - 1, current + 1)
  if (from > 2) pages.push('…')
  for (let p = from; p <= to; p++) pages.push(p)
  if (to < total - 1) pages.push('…')
  pages.push(total)
  return pages
})

function goToPage(page: number) {
  currentPage.value = Math.min(Math.max(1, page), totalPages.value)
}

// Al cambiar filtros o barbero se vuelve a la primera página; si llegan
// datos nuevos y la página actual deja de existir, se ajusta a la última.
watch([selectedMonth, selectedDay, scope], () => (currentPage.value = 1))
watch(totalPages, (total) => {
  if (currentPage.value > total) currentPage.value = total
})

function barberoName(id: string) {
  return bookingStore.barberos.find((b) => b.id === id)?.name ?? '—'
}

function formatTableDate(dateStr: string) {
  const [y, m, d] = dateStr.split('-').map(Number)
  return new Date(y!, m! - 1, d!).toLocaleDateString('es-CO', { day: '2-digit', month: 'short' })
}
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

      <!-- Tabla de citas del mes -->
      <div class="bg-[#0e0e0e] border border-white/10 rounded-xl p-5 mt-4">
        <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-4">
          <p class="text-sm font-semibold text-white">
            Citas {{ selectedDay ? 'del' : 'de' }} {{ tableLabel }}
            <span class="text-white/40 font-normal">({{ monthCitas.length }})</span>
          </p>
          <div class="flex flex-wrap items-center gap-2">
            <input
              v-model="selectedMonth"
              type="month"
              title="Filtrar por mes"
              class="bg-[#161616] border border-white/10 rounded-lg px-3 py-2 text-sm text-white/80 focus:outline-none focus:border-[#c9a24b]/50"
            />
            <input
              v-model="selectedDay"
              type="date"
              title="Filtrar por día"
              :min="monthBounds.min"
              :max="monthBounds.max"
              class="bg-[#161616] border border-white/10 rounded-lg px-3 py-2 text-sm text-white/80 focus:outline-none focus:border-[#c9a24b]/50"
            />
            <button
              v-if="selectedDay"
              type="button"
              class="px-3 py-2 text-xs rounded-lg border border-white/10 text-white/60 hover:text-white hover:border-white/30 transition-colors"
              @click="selectedDay = ''"
            >
              Ver todo el mes
            </button>
          </div>
        </div>

        <p v-if="monthCitas.length === 0" class="text-sm text-white/30 text-center py-8">
          {{ selectedDay ? 'No hay citas registradas en este día.' : 'No hay citas registradas en este mes.' }}
        </p>

        <div v-else class="overflow-x-auto -mx-5 px-5">
          <table class="w-full text-sm min-w-[640px]">
            <thead>
              <tr class="text-left text-xs text-white/40 border-b border-white/10">
                <th class="py-2 pr-4 font-medium">Fecha</th>
                <th class="py-2 pr-4 font-medium">Hora</th>
                <th v-if="scope === 'todos'" class="py-2 pr-4 font-medium">Barbero</th>
                <th class="py-2 pr-4 font-medium">Cliente</th>
                <th class="py-2 pr-4 font-medium">Servicio</th>
                <th class="py-2 pr-4 font-medium">Estado</th>
                <th class="py-2 pl-4 font-medium text-right">Total</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="cita in pagedCitas" :key="cita.id" class="border-b border-white/5 last:border-0">
                <td class="py-2.5 pr-4 text-white/70">{{ formatTableDate(cita.date) }}</td>
                <td class="py-2.5 pr-4 text-white/70">{{ cita.time || '—' }}</td>
                <td v-if="scope === 'todos'" class="py-2.5 pr-4 text-white/70">{{ barberoName(cita.barberoId) }}</td>
                <td class="py-2.5 pr-4 text-white/70">{{ cita.customerName || '—' }}</td>
                <td class="py-2.5 pr-4 text-white/50">{{ cita.serviceName || '—' }}</td>
                <td class="py-2.5 pr-4">
                  <span
                    class="px-2 py-0.5 rounded-full text-[11px] font-medium"
                    :style="{ backgroundColor: `${STATUS_COLORS[cita.status]}20`, color: STATUS_COLORS[cita.status] }"
                  >
                    {{ STATUS_LABELS[cita.status] }}
                  </span>
                </td>
                <td class="py-2.5 pl-4 text-right text-white/80 font-medium">${{ cita.total.toLocaleString('es-CO') }}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Paginador -->
        <div
          v-if="monthCitas.length > PAGE_SIZE"
          class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mt-4 pt-4 border-t border-white/10"
        >
          <p class="text-xs text-white/40">
            Mostrando {{ pageStart }}–{{ pageEnd }} de {{ monthCitas.length }}
          </p>
          <div class="flex items-center gap-1">
            <button
              type="button"
              class="px-2.5 py-1.5 text-xs rounded-lg border border-white/10 text-white/60 hover:text-white hover:border-white/30 transition-colors disabled:opacity-30 disabled:pointer-events-none"
              :disabled="currentPage === 1"
              @click="goToPage(currentPage - 1)"
            >
              Anterior
            </button>
            <template v-for="(page, i) in pageNumbers" :key="`${page}-${i}`">
              <span v-if="page === '…'" class="px-1.5 text-xs text-white/30">…</span>
              <button
                v-else
                type="button"
                class="min-w-8 px-2 py-1.5 text-xs rounded-lg border transition-colors"
                :class="
                  page === currentPage
                    ? 'border-[#c9a24b]/60 bg-[#c9a24b]/15 text-[#c9a24b] font-semibold'
                    : 'border-white/10 text-white/60 hover:text-white hover:border-white/30'
                "
                @click="goToPage(page)"
              >
                {{ page }}
              </button>
            </template>
            <button
              type="button"
              class="px-2.5 py-1.5 text-xs rounded-lg border border-white/10 text-white/60 hover:text-white hover:border-white/30 transition-colors disabled:opacity-30 disabled:pointer-events-none"
              :disabled="currentPage === totalPages"
              @click="goToPage(currentPage + 1)"
            >
              Siguiente
            </button>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>