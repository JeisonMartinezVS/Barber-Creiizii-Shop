<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { collection, doc, increment, onSnapshot, query, where, writeBatch } from 'firebase/firestore'
import { db } from '../../config/firebase'
import { useAuthStore } from '../../stores/auth'
import { formatLocalDate, formatTime12, stockDeltaForStatusChange } from '../../stores/booking'
import { updateCitaStatus } from '../../lib/citaAudit'

// Aviso al abrir el panel: citas del barbero logueado que siguen "pendiente"
// aunque su día ya pasó. Cada barbero ve SOLO las suyas (también el admin).
// "Cerrar" lo oculta hasta que se vuelva a abrir la página; si al volver
// todavía hay pendientes, sale de nuevo.

type CitaStatus = 'pendiente' | 'confirmada' | 'completada' | 'cancelada' | 'no_asistio'

interface PendingCita {
  id: string
  barberoId: string
  barberoName?: string
  customerName: string
  customerPhone: string
  serviceName: string
  date: string // "YYYY-MM-DD"
  time: string
  status: CitaStatus
  productIds?: string[]
}

// Para un día que ya pasó solo tienen sentido estos estados.
const STATUS_ACTIONS: Array<{ status: CitaStatus; label: string; color: string }> = [
  { status: 'completada', label: 'Completada', color: '#34d399' },
  { status: 'no_asistio', label: 'No asistió', color: '#f2994a' },
  { status: 'cancelada', label: 'Cancelada', color: '#f87171' },
]

const MONTH_ABBR = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sept', 'oct', 'nov', 'dic']

const authStore = useAuthStore()
const pending = ref<PendingCita[]>([])
const closed = ref(false)
const savingId = ref<string | null>(null)
const errorMsg = ref('')

let unsubscribe: (() => void) | null = null
onMounted(() => {
  const uid = authStore.user?.uid
  if (!uid) return
  // Dos igualdades no necesitan índice compuesto; el filtro por fecha se hace
  // aquí (las pendientes son pocas). barberoId es además lo que exigen las
  // reglas de Firestore para que un empleado lea citas.
  unsubscribe = onSnapshot(
    query(collection(db, 'citas'), where('barberoId', '==', uid), where('status', '==', 'pendiente')),
    (snapshot) => {
      const today = formatLocalDate(new Date())
      pending.value = snapshot.docs
        .map((d) => ({ id: d.id, ...d.data() }) as PendingCita)
        .filter((cita) => cita.date < today)
        .sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time))
    },
    (err) => console.error('No se pudieron revisar las citas pendientes', err),
  )
})
onUnmounted(() => unsubscribe?.())

const isOpen = computed(() => !closed.value && pending.value.length > 0)

function formatDate(date: string) {
  const [y, m, d] = date.split('-').map(Number)
  return `${d} de ${MONTH_ABBR[(m ?? 1) - 1]} ${y}`
}

async function setStatus(cita: PendingCita, status: CitaStatus) {
  savingId.value = cita.id
  errorMsg.value = ''
  // Igual que en la Agenda: el estado y el ajuste de stock van en un lote. El
  // horario no se libera: el día ya pasó y la limpieza diaria lo borra.
  const batch = writeBatch(db)
  updateCitaStatus(batch, authStore.auditActor, cita, status)
  const delta = stockDeltaForStatusChange(cita.status, status)
  if (delta !== 0) {
    for (const productId of cita.productIds ?? []) {
      batch.update(doc(db, 'productos', productId), { stock: increment(delta), stockCitaId: cita.id })
    }
  }
  try {
    await batch.commit()
    // onSnapshot la quita de la lista; al quedar vacía el aviso se cierra solo.
  } catch (err) {
    console.error('No se pudo cambiar el estado de la cita', err)
    errorMsg.value = `No se pudo cambiar el estado de la cita de ${cita.customerName}. Intenta de nuevo.`
  } finally {
    savingId.value = null
  }
}
</script>

<template>
  <Teleport to="body">
    <div v-if="isOpen" class="fixed inset-0 bg-black/70 z-40 flex items-center justify-center px-4">
      <div
        role="alertdialog"
        aria-labelledby="pending-past-title"
        class="w-full max-w-lg max-h-[85vh] flex flex-col bg-[#0e0e0e] border border-[#f2b705]/30 rounded-2xl shadow-2xl overflow-hidden"
      >
        <div class="flex items-start justify-between gap-4 px-6 pt-6 pb-4">
          <div class="flex items-start gap-3">
            <div class="w-10 h-10 shrink-0 rounded-full bg-[#f2b705]/10 border border-[#f2b705]/30 flex items-center justify-center text-[#f2b705]">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
              </svg>
            </div>
            <div>
              <h2 id="pending-past-title" class="font-serif text-lg font-bold text-white">
                {{ pending.length === 1 ? 'Tienes 1 cita pendiente' : `Tienes ${pending.length} citas pendientes` }}
              </h2>
              <p class="text-xs text-white/50 mt-0.5">De días que ya pasaron. Indica cómo terminó cada una.</p>
            </div>
          </div>
          <button
            type="button"
            class="w-8 h-8 shrink-0 rounded-full border border-white/10 flex items-center justify-center text-white/50 hover:text-white hover:border-white/30 transition"
            aria-label="Cerrar"
            @click="closed = true"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <p
          v-if="errorMsg"
          class="mx-6 mb-3 text-xs text-red-400 bg-red-400/10 border border-red-400/20 rounded-lg px-3 py-2"
        >
          {{ errorMsg }}
        </p>

        <div class="px-6 pb-2 overflow-y-auto space-y-3">
          <div
            v-for="cita in pending"
            :key="cita.id"
            class="bg-white/[0.03] border border-white/10 rounded-xl px-4 py-3"
          >
            <div class="flex items-start justify-between gap-3">
              <div class="min-w-0">
                <p class="text-sm font-semibold text-white truncate">{{ cita.customerName }}</p>
                <p class="text-xs text-white/50 truncate">{{ cita.serviceName }}</p>
                <p class="text-xs text-white/30">{{ cita.customerPhone }}</p>
              </div>
              <div class="text-right shrink-0">
                <p class="text-xs font-semibold text-[#4a8fe7]">{{ formatDate(cita.date) }}</p>
                <p class="text-xs text-white/50">{{ formatTime12(cita.time) }}</p>
              </div>
            </div>
            <div class="flex flex-wrap gap-2 mt-3">
              <button
                v-for="action in STATUS_ACTIONS"
                :key="action.status"
                type="button"
                :disabled="savingId !== null"
                class="text-xs font-semibold rounded-lg border px-3 py-1.5 hover:bg-white/5 transition disabled:opacity-50"
                :style="{ color: action.color, borderColor: action.color + '66' }"
                @click="setStatus(cita, action.status)"
              >
                {{ savingId === cita.id ? 'Guardando...' : action.label }}
              </button>
            </div>
          </div>
        </div>

        <div class="flex justify-end px-6 pb-6 pt-4">
          <button
            type="button"
            class="text-sm font-semibold text-white/70 border border-white/10 rounded-lg px-4 py-2.5 hover:border-white/25 hover:text-white transition"
            @click="closed = true"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>
