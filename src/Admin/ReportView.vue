<script setup lang="ts">
import { computed, onUnmounted, ref, watch } from 'vue'
import { collection, doc, increment, onSnapshot, query, setDoc, where, writeBatch } from 'firebase/firestore'
import { db } from '../config/firebase'
import { useAuthStore } from '../stores/auth'
import { formatLocalDate, getSlotId, stockDeltaForStatusChange, useBookingStore } from '../stores/booking'
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
  productIds: string[] // solo en citas que descontaron stock al reservarse
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
          productIds?: string[]
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
          productIds: data.productIds ?? [],
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
  { label: 'Reservas este mes', value: String(totalReservasMes.value), accent: '#a78bfa' },
  { label: 'Ingresos este mes', value: `$${ingresosMes.value.toLocaleString('es-CO')}`, accent: '#34d399' },
  { label: 'Ingresos totales', value: `$${ingresosTotales.value.toLocaleString('es-CO')}`, accent: '#4a8fe7' },
  { label: 'Cortes completados hoy', value: String(cortesHoy.value), accent: '#4a8fe7' },
  { label: 'Cortes completados este mes', value: String(cortesMes.value), accent: '#a78bfa' },
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
  confirmada: '#a78bfa',
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

// --- Acciones de la tabla (igual que en la Agenda) --------------------------
const STATUS_ACTIONS: CitaStatus[] = ['pendiente', 'confirmada', 'completada', 'cancelada', 'no_asistio']

const actionError = ref('')

async function releaseSlot(cita: Cita) {
  await setDoc(
    doc(db, 'disponibilidad', getSlotId(cita.barberoId, cita.date, cita.time)),
    { status: 'cancelada' },
    { merge: true },
  ).catch(() => {
    // Si el documento del horario nunca existió no hay nada que liberar.
  })
}

// Cambiar estado: el ajuste de stock va en el mismo lote que la cita.
const citaToStatus = ref<Cita | null>(null)
const isChangingStatus = ref(false)

function openStatus(cita: Cita) {
  actionError.value = ''
  citaToStatus.value = cita
}
function closeStatus() {
  if (isChangingStatus.value) return
  citaToStatus.value = null
}
async function setStatus(status: CitaStatus) {
  const cita = citaToStatus.value
  if (!cita || status === cita.status) return
  isChangingStatus.value = true
  actionError.value = ''
  const batch = writeBatch(db)
  batch.update(doc(db, 'citas', cita.id), { status })
  const delta = stockDeltaForStatusChange(cita.status, status)
  if (delta !== 0) {
    for (const productId of cita.productIds) {
      batch.update(doc(db, 'productos', productId), { stock: increment(delta), stockCitaId: cita.id })
    }
  }
  try {
    await batch.commit()
    if (status === 'cancelada') await releaseSlot(cita)
  } catch (err) {
    console.error('No se pudo cambiar el estado de la cita', err)
    actionError.value =
      delta === -1 && cita.productIds.length
        ? `No se pudo reactivar la cita de ${cita.customerName}: alguno de sus productos no tiene stock.`
        : 'No se pudo cambiar el estado de la cita. Intenta de nuevo.'
  } finally {
    isChangingStatus.value = false
    citaToStatus.value = null
  }
}

// Eliminar: una cita pendiente o confirmada devuelve sus productos al stock.
const citaToDelete = ref<Cita | null>(null)
const isDeleting = ref(false)

function askDelete(cita: Cita) {
  actionError.value = ''
  citaToDelete.value = cita
}
function cancelDelete() {
  if (isDeleting.value) return
  citaToDelete.value = null
}
async function confirmDelete() {
  const cita = citaToDelete.value
  if (!cita) return
  isDeleting.value = true
  actionError.value = ''
  try {
    const batch = writeBatch(db)
    batch.delete(doc(db, 'citas', cita.id))
    if (cita.status === 'pendiente' || cita.status === 'confirmada') {
      for (const productId of cita.productIds) {
        batch.update(doc(db, 'productos', productId), { stock: increment(1), stockCitaId: cita.id })
      }
    }
    await batch.commit()
    await releaseSlot(cita)
  } catch (err) {
    console.error('No se pudo eliminar la cita', err)
    actionError.value = 'No se pudo eliminar la cita. Intenta de nuevo.'
  } finally {
    isDeleting.value = false
    citaToDelete.value = null
  }
}
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
        class="bg-[#0e0e0e] border border-white/10 rounded-lg px-3 py-2 text-sm text-white/80 focus:outline-none focus:border-[#4a8fe7]/50"
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
                :class="day.dateStr === todayStr ? 'bg-[#4a8fe7]' : 'bg-white/15'"
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
              class="bg-[#161616] border border-white/10 rounded-lg px-3 py-2 text-sm text-white/80 focus:outline-none focus:border-[#4a8fe7]/50"
            />
            <input
              v-model="selectedDay"
              type="date"
              title="Filtrar por día"
              :min="monthBounds.min"
              :max="monthBounds.max"
              class="bg-[#161616] border border-white/10 rounded-lg px-3 py-2 text-sm text-white/80 focus:outline-none focus:border-[#4a8fe7]/50"
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

        <p
          v-if="actionError"
          class="mb-4 text-sm text-red-400 bg-red-400/10 border border-red-400/20 rounded-lg px-4 py-2.5"
        >
          {{ actionError }}
        </p>

        <div v-if="monthCitas.length > 0" class="overflow-x-auto -mx-5 px-5">
          <table class="w-full text-sm min-w-[760px]">
            <thead>
              <tr class="text-left text-xs text-white/40 border-b border-white/10">
                <th class="py-2 pr-4 font-medium">Fecha</th>
                <th class="py-2 pr-4 font-medium">Hora</th>
                <th v-if="scope === 'todos'" class="py-2 pr-4 font-medium">Barbero</th>
                <th class="py-2 pr-4 font-medium">Cliente</th>
                <th class="py-2 pr-4 font-medium">Servicio</th>
                <th class="py-2 pr-4 font-medium">Estado</th>
                <th class="py-2 pl-4 font-medium text-right">Total</th>
                <th class="py-2 pl-4 font-medium text-right">Acciones</th>
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
                <td class="py-2.5 pl-4">
                  <div class="flex items-center justify-end gap-2">
                    <button
                      type="button"
                      class="w-8 h-8 flex items-center justify-center rounded-lg border border-white/10 text-white/50 hover:text-[#4a8fe7] hover:border-[#4a8fe7]/40 transition"
                      aria-label="Cambiar estado"
                      title="Cambiar estado"
                      @click="openStatus(cita)"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <polyline points="23 4 23 10 17 10" />
                        <polyline points="1 20 1 14 7 14" />
                        <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
                      </svg>
                    </button>
                    <button
                      type="button"
                      class="w-8 h-8 flex items-center justify-center rounded-lg border border-white/10 text-white/50 hover:text-red-400 hover:border-red-400/30 transition"
                      aria-label="Eliminar"
                      title="Eliminar"
                      @click="askDelete(cita)"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <polyline points="3 6 5 6 21 6" />
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                      </svg>
                    </button>
                  </div>
                </td>
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
                    ? 'border-[#4a8fe7]/60 bg-[#4a8fe7]/15 text-[#4a8fe7] font-semibold'
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

    <!-- Modal: cambiar estado -->
    <Teleport to="body">
      <div
        v-if="citaToStatus"
        class="fixed inset-0 bg-black/70 z-50 flex items-center justify-center px-4"
        @click.self="closeStatus"
      >
        <div class="w-full max-w-sm bg-[#0e0e0e] border border-white/10 rounded-2xl shadow-2xl overflow-hidden">
          <div class="px-6 pt-6 pb-4">
            <p class="text-xs tracking-wide text-[#4a8fe7] mb-1">CAMBIAR ESTADO</p>
            <h2 class="font-serif text-lg font-bold text-white mb-1">{{ citaToStatus.customerName || 'Cita' }}</h2>
            <p class="text-sm text-white/50 mb-5">
              {{ formatTableDate(citaToStatus.date) }} · {{ citaToStatus.time || '—' }} · {{ citaToStatus.serviceName || '—' }}
            </p>
            <div class="space-y-2">
              <button
                v-for="status in STATUS_ACTIONS"
                :key="status"
                type="button"
                :disabled="isChangingStatus || status === citaToStatus.status"
                class="w-full flex items-center justify-between gap-2 px-4 py-2.5 text-sm font-semibold rounded-lg border transition disabled:cursor-default"
                :class="status === citaToStatus.status ? 'bg-white/5' : 'hover:bg-white/5 disabled:opacity-50'"
                :style="{ color: STATUS_COLORS[status], borderColor: `${STATUS_COLORS[status]}40` }"
                @click="setStatus(status)"
              >
                {{ STATUS_LABELS[status] }}
                <span v-if="status === citaToStatus.status" class="text-[11px] font-normal text-white/40">Actual</span>
              </button>
            </div>
          </div>
          <div class="flex items-center justify-end px-6 pb-6 pt-2">
            <button
              type="button"
              :disabled="isChangingStatus"
              class="text-sm font-semibold text-white/70 border border-white/10 rounded-lg px-4 py-2.5 hover:border-white/25 hover:text-white transition disabled:opacity-50"
              @click="closeStatus"
            >
              {{ isChangingStatus ? 'Guardando...' : 'Cerrar' }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- Modal: confirmar eliminación -->
    <Teleport to="body">
      <div v-if="citaToDelete" class="fixed inset-0 bg-black/70 z-50 flex items-center justify-center px-4">
        <div class="w-full max-w-sm bg-[#0e0e0e] border border-white/10 rounded-2xl shadow-2xl overflow-hidden">
          <div class="px-6 pt-6 pb-4 text-center">
            <div class="w-12 h-12 mx-auto mb-4 rounded-full bg-red-500/10 border border-red-500/30 flex items-center justify-center text-red-400">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="3 6 5 6 21 6" />
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
              </svg>
            </div>
            <h2 class="font-serif text-lg font-bold text-white mb-1">¿Eliminar esta cita?</h2>
            <p class="text-sm text-white/50">
              La cita de <span class="text-white font-semibold">{{ citaToDelete.customerName || 'este cliente' }}</span>
              ({{ formatTableDate(citaToDelete.date) }} {{ citaToDelete.time }}, {{ citaToDelete.serviceName }}) se eliminará
              permanentemente.
            </p>
          </div>
          <div class="flex items-center gap-3 px-6 pb-6 pt-2">
            <button
              type="button"
              :disabled="isDeleting"
              class="flex-1 text-sm font-semibold text-white/70 border border-white/10 rounded-lg py-2.5 hover:border-white/25 hover:text-white transition disabled:opacity-50"
              @click="cancelDelete"
            >
              Cancelar
            </button>
            <button
              type="button"
              :disabled="isDeleting"
              class="flex-1 text-sm font-semibold text-white bg-red-600 hover:bg-red-500 rounded-lg py-2.5 transition disabled:opacity-50"
              @click="confirmDelete"
            >
              {{ isDeleting ? 'Eliminando...' : 'Eliminar' }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>