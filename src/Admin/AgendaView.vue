<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { collection, deleteDoc, doc, onSnapshot, orderBy, query, setDoc, updateDoc, where } from 'firebase/firestore'
import { db } from '../config/firebase'
import { useAuthStore } from '../stores/auth'
import { formatLocalDate, getSlotId, useBookingStore } from '../stores/booking'
import StatCard from '../components/dashboard/StatCard.vue'

const authStore = useAuthStore()
const bookingStore = useBookingStore() // reuses its live `barberos` list for the filter dropdown

type CitaStatus = 'pendiente' | 'confirmada' | 'completada' | 'cancelada' | 'no_asistio'

interface Cita {
  id: string
  barberoId: string
  barberoName: string
  serviceName: string
  products: Array<{ id: string; name: string; price: number }>
  total: number
  date: string // "YYYY-MM-DD"
  time: string
  dateTime: { toDate: () => Date }
  customerName: string
  customerPhone: string
  customerNotes: string
  status: CitaStatus
}

const STATUS_CONFIG: Record<CitaStatus, { label: string; color: string; icon: string }> = {
  pendiente: {
    label: 'Pendiente',
    color: '#f2b705',
    icon: `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>`,
  },
  confirmada: {
    label: 'Confirmada',
    color: '#5b9bf7',
    icon: `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>`,
  },
  completada: {
    label: 'Completada',
    color: '#34d399',
    icon: `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>`,
  },
  cancelada: {
    label: 'Cancelada',
    color: '#f87171',
    icon: `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>`,
  },
  no_asistio: {
    label: 'No asistió',
    color: '#f2994a',
    icon: `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>`,
  },
}
const STATUS_ACTIONS: CitaStatus[] = ['confirmada', 'completada', 'cancelada', 'no_asistio']

const WEEKDAY_ABBR = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb']
const WEEKDAY_SHORT = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']
const MONTH_ABBR = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sept', 'oct', 'nov', 'dic']

const citas = ref<Cita[]>([])
let unsubscribe: (() => void) | null = null

onMounted(() => {
  // Un empleado SOLO puede recibir de vuelta sus propias citas — esto no es
  // solo una comodidad visual, las reglas de Firestore exigen este mismo
  // filtro para no-admins (una consulta sin él sería rechazada por permisos).
  const q = authStore.isAdmin
    ? query(collection(db, 'citas'), orderBy('dateTime', 'asc'))
    : query(
        collection(db, 'citas'),
        where('barberoId', '==', authStore.user?.uid ?? '__none__'),
        orderBy('dateTime', 'asc'),
      )
  unsubscribe = onSnapshot(q, (snapshot) => {
    citas.value = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }) as Cita)
  })
})
onUnmounted(() => unsubscribe?.())

// --- Filters ----------------------------------------------------------
const selectedDate = ref('') // "YYYY-MM-DD" from <input type="date">
const selectedStatus = ref('todos')
const selectedBarber = ref('todos')

// No-admins don't get a barbero filter at all — their query already only
// returns their own citas, so there's nothing else to pick.
if (!authStore.isAdmin && authStore.user) {
  selectedBarber.value = authStore.user.uid
}

const filteredCitas = computed(() => {
  return citas.value.filter((cita) => {
    if (selectedDate.value && cita.date !== selectedDate.value) return false
    if (selectedStatus.value !== 'todos' && cita.status !== selectedStatus.value) return false
    if (selectedBarber.value !== 'todos' && cita.barberoId !== selectedBarber.value) return false
    return true
  })
})

interface CitaGroup {
  dateKey: string
  label: string
  citas: Cita[]
  count: number
  total: number
}

const groupedCitas = computed<CitaGroup[]>(() => {
  const groups = new Map<string, Cita[]>()
  for (const cita of filteredCitas.value) {
    const list = groups.get(cita.date) ?? []
    list.push(cita)
    groups.set(cita.date, list)
  }
  return Array.from(groups.entries()).map(([dateKey, list]) => {
    const d = list[0].dateTime.toDate()
    return {
      dateKey,
      label: `${WEEKDAY_ABBR[d.getDay()]}, ${d.getDate()} de ${MONTH_ABBR[d.getMonth()]}`,
      citas: list,
      count: list.length,
      total: list.reduce((sum, c) => sum + c.total, 0),
    }
  })
})

// --- Stats --------------------------------------------------------------
function isToday(dateStr: string) {
  return dateStr === formatLocalDate(new Date())
}
function isThisMonth(dateStr: string) {
  const today = new Date()
  const [y, m] = dateStr.split('-').map(Number)
  return y === today.getFullYear() && m === today.getMonth() + 1
}

const stats = computed(() => {
  const today = citas.value.filter((c) => isToday(c.date))
  const thisMonth = citas.value.filter((c) => isThisMonth(c.date))
  const pendientes = citas.value.filter((c) => c.status === 'pendiente')
  const ingresosHoy = today
    .filter((c) => c.status !== 'cancelada')
    .reduce((sum, c) => sum + c.total, 0)

  return [
    {
      label: 'Citas hoy',
      value: String(today.length),
      accent: '#c9a24b',
      icon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>`,
    },
    {
      label: 'Este mes',
      value: String(thisMonth.length),
      accent: '#5b9bf7',
      icon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>`,
    },
    {
      label: 'Ingresos hoy',
      value: `$${ingresosHoy.toLocaleString('es-CO')}`,
      accent: '#34d399',
      icon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>`,
    },
    {
      label: 'Pendientes',
      value: String(pendientes.length),
      accent: '#f2b705',
      icon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>`,
    },
  ]
})

// --- Row actions dropdown -------------------------------------------------
const openMenuId = ref<string | null>(null)
function toggleMenu(id: string) {
  openMenuId.value = openMenuId.value === id ? null : id
}
function closeMenu() {
  openMenuId.value = null
}
document.addEventListener('click', (e) => {
  if (!(e.target as HTMLElement).closest('[data-acciones-menu]')) closeMenu()
})

async function releaseSlot(cita: Cita) {
  await setDoc(
    doc(db, 'disponibilidad', getSlotId(cita.barberoId, cita.date, cita.time)),
    { status: 'cancelada' },
    { merge: true },
  ).catch(() => {
    // If the slot doc never existed (e.g. a cita created before this
    // feature), there's nothing to release — safe to ignore.
  })
}

async function setStatus(cita: Cita, status: CitaStatus) {
  closeMenu()
  await updateDoc(doc(db, 'citas', cita.id), { status })
  if (status === 'cancelada') await releaseSlot(cita)
}

const citaToDelete = ref<Cita | null>(null)
const isDeleting = ref(false)

function askDelete(cita: Cita) {
  closeMenu()
  citaToDelete.value = cita
}
function cancelDelete() {
  if (isDeleting.value) return
  citaToDelete.value = null
}
async function confirmDelete() {
  if (!citaToDelete.value) return
  isDeleting.value = true
  try {
    await deleteDoc(doc(db, 'citas', citaToDelete.value.id))
    await releaseSlot(citaToDelete.value)
    citaToDelete.value = null
  } finally {
    isDeleting.value = false
  }
}

function refresh() {
  // onSnapshot already keeps this live — kept as a visible affordance/no-op
  // in case a manual refetch is ever needed (e.g. after adding pagination).
}
</script>

<template>
  <div>
    <!-- Stat cards -->
    <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
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
    <div class="flex flex-col gap-3 md:flex-row md:items-center md:justify-between mb-4">
      <h1 class="font-serif text-xl font-bold text-white">Agenda de Citas</h1>
      <div class="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
        <div class="flex items-center gap-2">
          <button
            type="button"
            class="w-9 h-9 shrink-0 flex items-center justify-center rounded-lg border border-white/10 text-white/60 hover:text-white hover:border-white/20 transition"
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
            class="flex-1 sm:flex-none bg-[#0e0e0e] border border-white/10 rounded-lg px-3 py-2 text-sm text-white/70 focus:outline-none focus:border-[#c9a24b]/50"
          />
        </div>
        <select
          v-model="selectedStatus"
          class="w-full sm:w-auto bg-[#0e0e0e] border border-white/10 rounded-lg px-3 py-2 text-sm text-white/70 focus:outline-none focus:border-[#c9a24b]/50"
        >
          <option value="todos">Todos los estados</option>
          <option value="pendiente">Pendiente</option>
          <option value="confirmada">Confirmada</option>
          <option value="completada">Completada</option>
          <option value="cancelada">Cancelada</option>
          <option value="no_asistio">No asistió</option>
        </select>
        <select
          v-if="authStore.isAdmin"
          v-model="selectedBarber"
          class="w-full sm:w-auto bg-[#0e0e0e] border border-white/10 rounded-lg px-3 py-2 text-sm text-white/70 focus:outline-none focus:border-[#c9a24b]/50"
        >
          <option value="todos">Todos los barberos</option>
          <option v-for="barbero in bookingStore.barberos" :key="barbero.id" :value="barbero.id">{{ barbero.name }}</option>
        </select>
      </div>
    </div>

    <!-- Agenda list -->
    <div v-if="groupedCitas.length === 0" class="bg-[#0e0e0e] border border-white/10 rounded-xl min-h-[280px] flex items-center justify-center">
      <div class="text-center py-16">
        <svg class="mx-auto mb-3 text-white/20" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <rect x="3" y="4" width="18" height="18" rx="2" />
          <path d="M16 2v4M8 2v4M3 10h18" />
        </svg>
        <p class="text-sm text-white/40">No hay citas que mostrar</p>
      </div>
    </div>

    <div v-else class="space-y-8">
      <div v-for="group in groupedCitas" :key="group.dateKey">
        <div class="flex items-center gap-3 mb-3">
          <span class="text-sm font-semibold text-white bg-white/5 border border-white/10 rounded-lg px-3 py-1.5">
            {{ group.label }}
          </span>
          <span class="flex-1 h-px border-t border-dashed border-white/10"></span>
          <span class="text-sm text-white/40">
            {{ group.count }} {{ group.count === 1 ? 'cita' : 'citas' }}
            <span class="text-white/70 font-semibold ml-1">${{ group.total.toLocaleString('es-CO') }}</span>
          </span>
        </div>

        <div class="bg-[#0e0e0e] border border-white/10 rounded-xl divide-y divide-white/5">
          <div v-for="cita in group.citas" :key="cita.id" class="px-4 sm:px-5 py-4">
            <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div class="flex items-center gap-4">
                <div class="text-center w-14 shrink-0">
                  <p class="text-[#c9a24b] font-bold text-sm">{{ cita.time }}</p>
                  <p class="text-white/30 text-xs">{{ WEEKDAY_SHORT[cita.dateTime.toDate().getDay()] }}</p>
                </div>
                <div class="min-w-0">
                  <p class="text-sm font-semibold text-white truncate">{{ cita.customerName }}</p>
                  <p class="text-xs text-white/50 truncate">{{ cita.serviceName }} — {{ cita.barberoName }}</p>
                  <p class="text-xs text-white/30">{{ cita.customerPhone }}</p>
                </div>
              </div>

              <div class="flex items-center justify-between sm:justify-end gap-3 flex-wrap sm:ml-auto pl-[4.5rem] sm:pl-0">
                <div class="text-right">
                  <p class="text-sm font-bold text-[#c9a24b]">${{ cita.total.toLocaleString('es-CO') }}</p>
                  <p v-if="cita.products?.length" class="text-xs text-white/30">
                    incl. {{ cita.products.length }} producto{{ cita.products.length > 1 ? 's' : '' }}
                  </p>
                </div>

                <span
                  class="flex items-center gap-1.5 text-xs font-semibold rounded-lg border px-3 py-1.5 shrink-0"
                  :style="{ color: STATUS_CONFIG[cita.status].color, borderColor: STATUS_CONFIG[cita.status].color + '66' }"
                  v-html="STATUS_CONFIG[cita.status].icon + ' ' + STATUS_CONFIG[cita.status].label"
                ></span>

                <div class="relative" data-acciones-menu>
                  <button
                    type="button"
                    class="text-xs font-semibold text-white/70 border border-white/10 rounded-lg px-3 py-1.5 hover:border-white/25 hover:text-white transition"
                    @click="toggleMenu(cita.id)"
                  >
                    Acciones
                  </button>
                  <div
                    v-if="openMenuId === cita.id"
                    class="absolute right-0 mt-2 w-48 bg-[#151515] border border-white/10 rounded-lg shadow-xl z-10 overflow-hidden"
                  >
                    <button
                      v-for="status in STATUS_ACTIONS"
                      :key="status"
                      type="button"
                      class="w-full flex items-center gap-2 px-3 py-2.5 text-xs font-semibold hover:bg-white/5 transition"
                      :style="{ color: STATUS_CONFIG[status].color }"
                      @click="setStatus(cita, status)"
                    >
                      <span v-html="STATUS_CONFIG[status].icon"></span>
                      {{ STATUS_CONFIG[status].label }}
                    </button>
                    <div class="border-t border-white/10"></div>
                    <button
                      type="button"
                      class="w-full flex items-center gap-2 px-3 py-2.5 text-xs font-semibold text-red-400 hover:bg-red-500/10 transition"
                      @click="askDelete(cita)"
                    >
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <polyline points="3 6 5 6 21 6" />
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                      </svg>
                      Eliminar
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <p v-if="cita.customerNotes" class="text-xs text-white/30 italic mt-2 pt-2 border-t border-white/5">
              {{ cita.customerNotes }}
            </p>
          </div>
        </div>
      </div>
    </div>

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
              La cita de <span class="text-white font-semibold">{{ citaToDelete.customerName }}</span>
              ({{ citaToDelete.time }}, {{ citaToDelete.serviceName }}) se eliminará permanentemente.
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
