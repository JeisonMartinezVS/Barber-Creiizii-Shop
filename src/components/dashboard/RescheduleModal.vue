<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { doc, getDoc, Timestamp, writeBatch } from 'firebase/firestore'
import { db } from '../../config/firebase'
import { addAudit, citaRefs } from '../../lib/audit'
import { useAuthStore } from '../../stores/auth'
import {
  buildTimeSlots,
  combineDateAndTime,
  formatTime12,
  getSlotId,
  loadBarberoSchedule,
  loadBookedTimes,
} from '../../stores/booking'

// Cambia la hora de una cita el mismo día (p. ej. el cliente llegó antes y se
// atendió a otra hora). En un solo lote: se ocupa el horario nuevo, se libera
// el anterior (queda disponible de inmediato para otra reserva) y se actualiza
// la cita.

const props = defineProps<{
  cita: {
    id: string
    barberoId: string
    barberoName?: string
    customerName: string
    customerPhone?: string
    serviceName: string
    date: string // "YYYY-MM-DD"
    time: string
    dateTime: { toDate: () => Date }
  }
}>()
const emit = defineEmits<{
  close: []
  saved: [message: string]
}>()

const authStore = useAuthStore()
const slots = ref<string[]>([])
const isLoading = ref(true)
const isSaving = ref(false)
const newTime = ref('')
const error = ref('')

const day = computed(() => props.cita.dateTime.toDate())

async function loadSlots() {
  isLoading.value = true
  try {
    const [schedule, booked] = await Promise.all([
      loadBarberoSchedule(props.cita.barberoId),
      loadBookedTimes(props.cita.barberoId, props.cita.date),
    ])
    // allowPast: si el cliente ya se atendió, la hora nueva puede ser una que
    // ya pasó hoy.
    slots.value = buildTimeSlots(schedule, day.value, booked, { allowPast: true }).filter(
      (t) => t !== props.cita.time,
    )
  } catch (err) {
    console.error('No se pudieron cargar los horarios libres', err)
    error.value = 'No se pudieron cargar los horarios libres. Intenta de nuevo.'
  } finally {
    isLoading.value = false
  }
}
onMounted(loadSlots)

function close() {
  if (!isSaving.value) emit('close')
}

async function save() {
  if (!newTime.value) return
  isSaving.value = true
  error.value = ''
  const { cita } = props
  const time = newTime.value
  const oldSlotRef = doc(db, 'disponibilidad', getSlotId(cita.barberoId, cita.date, cita.time))
  try {
    // Citas antiguas pueden no tener su horario guardado: solo se libera si existe.
    const oldSlot = await getDoc(oldSlotRef)
    const batch = writeBatch(db)
    batch.set(doc(db, 'disponibilidad', getSlotId(cita.barberoId, cita.date, time)), {
      barberoId: cita.barberoId,
      date: cita.date,
      time,
      status: 'pendiente',
      citaId: cita.id,
    })
    if (oldSlot.exists()) batch.set(oldSlotRef, { status: 'cancelada' }, { merge: true })
    batch.update(doc(db, 'citas', cita.id), {
      time,
      dateTime: Timestamp.fromDate(combineDateAndTime(day.value, time)),
    })
    addAudit(batch, authStore.auditActor, {
      action: 'cita.hora',
      category: 'cita',
      summary: `${authStore.auditActor.actorName} cambió la hora de la cita de ${cita.customerName} (${cita.date}) de ${formatTime12(cita.time)} a ${formatTime12(time)}`,
      ...citaRefs(cita),
      changes: { time: { from: cita.time, to: time } },
      data: { date: cita.date, serviceName: cita.serviceName, barberoName: cita.barberoName ?? '', oldSlotReleased: oldSlot.exists() },
    })
    await batch.commit()
    emit('saved', `La cita de ${cita.customerName} ahora es a las ${formatTime12(time)}. Las ${formatTime12(cita.time)} quedaron libres.`)
  } catch (err) {
    console.error('No se pudo cambiar la hora de la cita', err)
    newTime.value = ''
    error.value = 'No se pudo cambiar la hora. Es posible que ese horario se acabe de ocupar; elige otro.'
    await loadSlots()
  } finally {
    isSaving.value = false
  }
}
</script>

<template>
  <Teleport to="body">
    <div class="fixed inset-0 bg-black/70 z-50 flex items-center justify-center px-4" @click.self="close">
      <div class="w-full max-w-md max-h-[85vh] flex flex-col bg-[#0e0e0e] border border-white/10 rounded-2xl shadow-2xl overflow-hidden">
        <div class="flex items-start justify-between gap-4 px-6 pt-6 pb-4">
          <div>
            <p class="text-xs tracking-wide text-[#4a8fe7] mb-1">CAMBIAR HORA</p>
            <h2 class="font-serif text-lg font-bold text-white">{{ cita.customerName }}</h2>
            <p class="text-xs text-white/50 mt-0.5">
              {{ cita.serviceName }} — hora actual
              <span class="text-white font-semibold">{{ formatTime12(cita.time) }}</span>
            </p>
          </div>
          <button
            type="button"
            class="w-8 h-8 shrink-0 rounded-full border border-white/10 flex items-center justify-center text-white/50 hover:text-white hover:border-white/30 transition"
            aria-label="Cerrar"
            @click="close"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <div class="px-6 pb-2 overflow-y-auto">
          <p class="text-xs text-white/40 mb-3">Elige la nueva hora (mismo día). La hora anterior quedará libre para otra reserva.</p>
          <p v-if="isLoading" class="text-sm text-white/40 py-6 text-center">Cargando horarios...</p>
          <p v-else-if="slots.length === 0 && !error" class="text-sm text-white/40 py-6 text-center">
            No hay otros horarios libres ese día.
          </p>
          <div v-else class="grid grid-cols-3 sm:grid-cols-4 gap-2">
            <button
              v-for="slot in slots"
              :key="slot"
              type="button"
              :disabled="isSaving"
              class="text-xs font-semibold rounded-lg border px-2 py-2 transition disabled:opacity-50"
              :class="
                newTime === slot
                  ? 'bg-[#4a8fe7] border-[#4a8fe7] text-white'
                  : 'border-white/10 text-white/70 hover:border-[#4a8fe7]/50 hover:text-white'
              "
              @click="newTime = slot"
            >
              {{ formatTime12(slot) }}
            </button>
          </div>
          <p
            v-if="error"
            class="mt-3 text-xs text-red-400 bg-red-400/10 border border-red-400/20 rounded-lg px-3 py-2"
          >
            {{ error }}
          </p>
        </div>

        <div class="flex items-center gap-3 px-6 pb-6 pt-4">
          <button
            type="button"
            :disabled="isSaving"
            class="flex-1 text-sm font-semibold text-white/70 border border-white/10 rounded-lg py-2.5 hover:border-white/25 hover:text-white transition disabled:opacity-50"
            @click="close"
          >
            Cancelar
          </button>
          <button
            type="button"
            :disabled="!newTime || isSaving"
            class="flex-1 text-sm font-semibold text-white bg-[#4a8fe7] hover:bg-[#3a7fd7] rounded-lg py-2.5 transition disabled:opacity-50"
            @click="save"
          >
            {{ isSaving ? 'Guardando...' : 'Cambiar hora' }}
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>
