<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { collection, onSnapshot, orderBy, query, where } from 'firebase/firestore'
import { db } from '../../config/firebase'
import { useAuthStore } from '../../stores/auth'
import { formatLocalDate } from '../../stores/booking'
import StatCard from '../../components/dashboard/StatCard.vue'

const authStore = useAuthStore()

type CitaStatus = 'pendiente' | 'confirmada' | 'completada' | 'cancelada' | 'no_asistio'

interface Cita {
  id: string
  barberoId: string
  total: number
  date: string // "YYYY-MM-DD"
  status: CitaStatus
}
const citas = ref<Cita[]>([])
let unsubscribe: (() => void) | null = null

onMounted(() => {
  // Siempre "lo mío" — sin importar si es admin o empleado. Para ver el
  // conjunto de todo el equipo está Reportes (con su propio selector).
  const q = query(
    collection(db, 'citas'),
    where('barberoId', '==', authStore.user?.uid ?? '__none__'),
    orderBy('dateTime', 'asc'),
  )

  unsubscribe = onSnapshot(
    q,
    (snapshot) => {
      citas.value = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }) as Cita)
    },
    (err) => {
      console.error('No se pudieron cargar las estadísticas', err)
      citas.value = []
    },
  )
})
onUnmounted(() => unsubscribe?.())

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
</script>

<template>
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
</template>
