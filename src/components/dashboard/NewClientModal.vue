<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { collection, doc, getDoc, serverTimestamp, setDoc, Timestamp, writeBatch } from 'firebase/firestore'
import { db } from '../../config/firebase'
import { PRIVACY_POLICY_VERSION } from '../../content/legalVersion'
import { useAuthStore } from '../../stores/auth'
import {
  buildTimeSlots,
  combineDateAndTime,
  defaultSchedule,
  formatCOP,
  formatLocalDate,
  formatTime12,
  getSlotId,
  loadBarberoSchedule,
  loadBookedTimes,
  normalizePhone,
  useBookingStore,
  type DaySchedule,
} from '../../stores/booking'

// Registra un cliente desde el panel y, opcionalmente, le agenda una cita con
// las mismas reglas de disponibilidad que el modal de reservas público.
// Con `existing` se usa para agendar a un cliente que ya está registrado.
const props = defineProps<{
  existing?: { name: string; phone: string } | null
}>()
const emit = defineEmits<{
  close: []
  saved: [message: string]
}>()

const authStore = useAuthStore()
const bookingStore = useBookingStore()

const isExisting = computed(() => !!props.existing)

const form = reactive({
  name: props.existing?.name ?? '',
  phone: props.existing?.phone ?? '',
  // El cliente ya registrado dio su autorización al registrarse.
  privacy: !!props.existing,
  withBooking: true,
  barberoId: '',
  serviceId: '',
  date: '',
  time: '',
})

// Un barbero que agenda desde su panel normalmente agenda para sí mismo.
if (authStore.user && bookingStore.bookableBarberos.some((b) => b.id === authStore.user!.uid)) {
  form.barberoId = authStore.user.uid
}

const MAX_DAYS_AHEAD = 90
const minDate = formatLocalDate(new Date())
const maxDate = (() => {
  const d = new Date()
  d.setDate(d.getDate() + MAX_DAYS_AHEAD)
  return formatLocalDate(d)
})()

const selectedDate = computed(() => {
  if (!form.date) return null
  const [y, m, d] = form.date.split('-').map(Number)
  return new Date(y!, m! - 1, d!)
})
const selectedBarbero = computed(() => bookingStore.bookableBarberos.find((b) => b.id === form.barberoId) ?? null)
const selectedService = computed(() => bookingStore.allServices.find((s) => s.id === form.serviceId) ?? null)

// --- Disponibilidad ---------------------------------------------------------
const schedule = ref<DaySchedule[]>(defaultSchedule())
const bookedTimes = ref<string[]>([])
const isLoadingSlots = ref(false)

watch(
  () => form.barberoId,
  async (id) => {
    schedule.value = defaultSchedule()
    if (!id) return
    try {
      schedule.value = await loadBarberoSchedule(id)
    } catch (err) {
      console.error('No se pudo cargar el horario del barbero', err)
    }
  },
  { immediate: true },
)

async function refreshBookedTimes() {
  bookedTimes.value = []
  if (!form.barberoId || !form.date) return
  isLoadingSlots.value = true
  try {
    bookedTimes.value = await loadBookedTimes(form.barberoId, form.date)
  } catch (err) {
    console.error('No se pudieron cargar los horarios ocupados', err)
  } finally {
    isLoadingSlots.value = false
  }
}

watch([() => form.barberoId, () => form.date], () => {
  form.time = ''
  refreshBookedTimes()
})

const dayDisabled = computed(() => {
  if (!selectedDate.value) return false
  const day = schedule.value[selectedDate.value.getDay()]
  return !!day && !day.enabled
})
const timeSlots = computed(() => buildTimeSlots(schedule.value, selectedDate.value, bookedTimes.value))

// --- Guardar ----------------------------------------------------------------
const isSaving = ref(false)
const error = ref('')

// Mismos límites que valida firestore.rules.
const isNameValid = computed(() => {
  const name = form.name.trim()
  return name.length >= 2 && name.length <= 80
})
const isPhoneValid = computed(() => /^[0-9+() -]{7,20}$/.test(form.phone.trim()))

function validate(): string {
  if (!isNameValid.value) return 'Escribe el nombre del cliente (mínimo 2 letras).'
  if (!isPhoneValid.value) return 'Escribe un celular válido.'
  if (!form.privacy) return 'Confirma que el cliente autorizó el tratamiento de sus datos.'
  if (form.withBooking) {
    if (!selectedBarbero.value) return 'Elige el barbero.'
    if (!selectedService.value) return 'Elige el servicio.'
    if (!form.date || form.date < minDate || form.date > maxDate)
      return `Elige una fecha desde hoy y hasta ${MAX_DAYS_AHEAD} días adelante.`
    if (dayDisabled.value) return `${selectedBarbero.value.name} no trabaja ese día.`
    if (!form.time) return 'Elige la hora de la cita.'
  }
  return ''
}

// Crea el cliente solo si ese celular no existe; devuelve true si ya existía.
async function ensureCustomer(name: string, phone: string): Promise<boolean> {
  const ref = doc(db, 'clientes', normalizePhone(phone))
  const snap = await getDoc(ref)
  if (snap.exists()) return true
  await setDoc(ref, {
    name,
    phone,
    createdAt: serverTimestamp(),
    privacyConsent: true,
    privacyPolicyVersion: PRIVACY_POLICY_VERSION,
  })
  return false
}

async function save() {
  error.value = validate()
  if (error.value) return

  const name = form.name.trim()
  const phone = form.phone.trim()
  isSaving.value = true
  try {
    const alreadyExisted = isExisting.value ? true : await ensureCustomer(name, phone)

    if (!form.withBooking) {
      emit('saved', alreadyExisted ? `${name} ya estaba registrado.` : `Cliente ${name} registrado.`)
      return
    }

    const barbero = selectedBarbero.value!
    const service = selectedService.value!
    const dateTime = combineDateAndTime(selectedDate.value!, form.time)
    const dateStr = formatLocalDate(dateTime)
    const time = form.time

    // Igual que en el modal público: cita y horario en un solo lote atómico,
    // así nunca se reserva dos veces el mismo horario.
    const citaRef = doc(collection(db, 'citas'))
    const batch = writeBatch(db)
    batch.set(doc(db, 'disponibilidad', getSlotId(barbero.id, dateStr, time)), {
      barberoId: barbero.id,
      date: dateStr,
      time,
      status: 'pendiente',
      citaId: citaRef.id,
    })
    batch.set(citaRef, {
      barberoId: barbero.id,
      barberoName: barbero.name,
      serviceId: service.id,
      serviceName: service.name,
      serviceDuration: service.duration,
      servicePrice: service.price,
      products: [],
      productIds: [],
      total: service.price,
      dateTime: Timestamp.fromDate(dateTime),
      date: dateStr,
      time,
      customerName: name,
      customerPhone: phone,
      status: 'pendiente',
      createdAt: serverTimestamp(),
      privacyConsent: true,
      privacyPolicyVersion: PRIVACY_POLICY_VERSION,
    })

    try {
      await batch.commit()
    } catch (err) {
      console.error('No se pudo agendar la cita', err)
      await refreshBookedTimes()
      if (bookedTimes.value.includes(time)) {
        form.time = ''
        error.value = 'Ese horario se acaba de ocupar. Elige otro.'
      } else {
        error.value = alreadyExisted
          ? 'No se pudo agendar la cita. Intenta de nuevo.'
          : 'El cliente se registró, pero no se pudo agendar la cita. Intenta de nuevo.'
      }
      return
    }

    const fecha = dateTime.toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long' })
    emit('saved', `Cita agendada para ${name}: ${fecha} a las ${formatTime12(time)} con ${barbero.name}.`)
  } catch (err) {
    console.error('No se pudo registrar el cliente', err)
    error.value = 'No se pudo registrar el cliente. Intenta de nuevo.'
  } finally {
    isSaving.value = false
  }
}

function close() {
  if (!isSaving.value) emit('close')
}

const inputClass =
  'w-full bg-[#151515] border border-white/10 rounded-lg px-4 py-2.5 text-sm text-white placeholder-white/30 focus:outline-none focus:border-[#4a8fe7]/50 disabled:opacity-60'
</script>

<template>
  <Teleport to="body">
    <div class="fixed inset-0 bg-black/70 z-50 flex items-center justify-center px-4 py-6" @click.self="close">
      <div
        class="w-full max-w-lg max-h-full flex flex-col bg-[#0e0e0e] border border-white/10 rounded-2xl shadow-2xl overflow-hidden"
      >
        <div class="flex items-start justify-between gap-4 px-6 pt-6 pb-4 border-b border-white/10">
          <div>
            <p class="text-xs tracking-wide text-[#4a8fe7] mb-1">{{ isExisting ? 'AGENDAR CITA' : 'NUEVO CLIENTE' }}</p>
            <h2 class="font-serif text-lg font-bold text-white">
              {{ isExisting ? existing!.name : 'Registrar cliente' }}
            </h2>
          </div>
          <button
            type="button"
            class="w-8 h-8 rounded-full border border-white/10 flex items-center justify-center text-white/50 hover:text-white hover:border-white/30 transition"
            aria-label="Cerrar"
            @click="close"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <form class="flex-1 overflow-y-auto px-6 py-5 space-y-5" @submit.prevent="save">
          <!-- Datos del cliente -->
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label class="block text-xs tracking-wide text-white/40 mb-1.5">NOMBRE <span class="text-[#4a8fe7]">*</span></label>
              <input v-model="form.name" type="text" maxlength="80" placeholder="Nombre completo" :disabled="isExisting" :class="inputClass" />
            </div>
            <div>
              <label class="block text-xs tracking-wide text-white/40 mb-1.5">CELULAR <span class="text-[#4a8fe7]">*</span></label>
              <input v-model="form.phone" type="tel" maxlength="20" placeholder="300 000 0000" :disabled="isExisting" :class="inputClass" />
            </div>
          </div>

          <label v-if="!isExisting" class="flex items-start gap-2.5 text-xs text-white/60 cursor-pointer">
            <input v-model="form.privacy" type="checkbox" class="mt-0.5 accent-[#4a8fe7]" />
            El cliente autorizó el tratamiento de sus datos personales (nombre y celular).
          </label>

          <label v-if="!isExisting" class="flex items-center gap-2.5 text-sm font-semibold text-white cursor-pointer">
            <input v-model="form.withBooking" type="checkbox" class="accent-[#4a8fe7]" />
            Agendar una cita ahora
          </label>

          <!-- Cita -->
          <div v-if="form.withBooking" class="space-y-4 border-t border-white/10 pt-5">
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label class="block text-xs tracking-wide text-white/40 mb-1.5">BARBERO <span class="text-[#4a8fe7]">*</span></label>
                <select v-model="form.barberoId" :class="inputClass">
                  <option value="" disabled class="bg-[#151515]">Elige un barbero</option>
                  <option v-for="barbero in bookingStore.bookableBarberos" :key="barbero.id" :value="barbero.id" class="bg-[#151515]">
                    {{ barbero.name }}
                  </option>
                </select>
              </div>
              <div>
                <label class="block text-xs tracking-wide text-white/40 mb-1.5">SERVICIO <span class="text-[#4a8fe7]">*</span></label>
                <select v-model="form.serviceId" :class="inputClass">
                  <option value="" disabled class="bg-[#151515]">Elige un servicio</option>
                  <optgroup v-for="category in bookingStore.serviceCategories" :key="category.id" :label="category.title" class="bg-[#151515]">
                    <option v-for="item in category.items" :key="item.id" :value="item.id" class="bg-[#151515]">
                      {{ item.name }} — {{ formatCOP(item.price) }}
                    </option>
                  </optgroup>
                </select>
              </div>
            </div>

            <div>
              <label class="block text-xs tracking-wide text-white/40 mb-1.5">FECHA <span class="text-[#4a8fe7]">*</span></label>
              <input v-model="form.date" type="date" :min="minDate" :max="maxDate" :class="inputClass" />
            </div>

            <div>
              <p class="text-xs tracking-wide text-white/40 mb-2">HORARIOS DISPONIBLES <span class="text-[#4a8fe7]">*</span></p>
              <p v-if="!form.barberoId || !form.date" class="text-sm text-white/30 py-3 text-center">
                Elige el barbero y la fecha para ver los horarios.
              </p>
              <p v-else-if="dayDisabled" class="text-sm text-amber-400/80 py-3 text-center">
                {{ selectedBarbero?.name }} no trabaja ese día.
              </p>
              <p v-else-if="isLoadingSlots" class="text-sm text-white/30 py-3 text-center">Cargando horarios...</p>
              <p v-else-if="timeSlots.length === 0" class="text-sm text-white/30 py-3 text-center">
                No quedan horarios disponibles para este día.
              </p>
              <div v-else class="grid grid-cols-3 sm:grid-cols-4 gap-2">
                <button
                  v-for="slot in timeSlots"
                  :key="slot"
                  type="button"
                  class="rounded-lg border py-2 text-sm transition"
                  :class="
                    form.time === slot
                      ? 'bg-gradient-to-b from-[#3f7fd6] to-[#2b5fa8] border-transparent text-white font-semibold'
                      : 'border-white/10 text-white/70 hover:border-white/25'
                  "
                  @click="form.time = slot"
                >
                  {{ formatTime12(slot) }}
                </button>
              </div>
            </div>
          </div>

          <p v-if="error" class="text-xs text-red-400">{{ error }}</p>

          <div class="flex items-center gap-3 pt-1">
            <button
              type="submit"
              :disabled="isSaving"
              class="flex-1 bg-gradient-to-b from-[#3f7fd6] to-[#2b5fa8] hover:from-[#5596ea] hover:to-[#336bb8] disabled:opacity-50 text-white font-semibold text-sm rounded-lg py-2.5 transition"
            >
              {{ isSaving ? 'Guardando...' : form.withBooking ? (isExisting ? 'Agendar cita' : 'Guardar y agendar') : 'Guardar cliente' }}
            </button>
            <button
              type="button"
              :disabled="isSaving"
              class="flex-1 text-sm font-semibold text-white/70 border border-white/10 rounded-lg py-2.5 hover:border-white/25 hover:text-white transition disabled:opacity-50"
              @click="close"
            >
              Cancelar
            </button>
          </div>
        </form>
      </div>
    </div>
  </Teleport>
</template>
