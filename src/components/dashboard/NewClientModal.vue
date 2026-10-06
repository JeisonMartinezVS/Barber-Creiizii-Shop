<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import {
  arrayUnion,
  collection,
  doc,
  getDoc,
  increment,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
  writeBatch,
} from 'firebase/firestore'
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
  LOW_STOCK_THRESHOLD,
  loadBarberoSchedule,
  MAX_PRODUCTS_PER_BOOKING,
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

// --- Productos de la cita (máximo MAX_PRODUCTS_PER_BOOKING, como en la web) --
const selectedProductIds = ref<Set<string>>(new Set())
const selectedProducts = computed(() => bookingStore.products.filter((p) => selectedProductIds.value.has(p.id)))
// Solo se ofrecen los productos con stock (los ya elegidos se mantienen a la
// vista para poder quitarlos, aunque se agoten mientras el modal está abierto).
const offeredProducts = computed(() =>
  bookingStore.products.filter((p) => p.stock > 0 || selectedProductIds.value.has(p.id)),
)
const total = computed(
  () => (selectedService.value?.price ?? 0) + selectedProducts.value.reduce((sum, p) => sum + p.price, 0),
)

function canAddProduct(product: { id: string; stock: number }) {
  if (selectedProductIds.value.has(product.id)) return true
  return product.stock > 0 && selectedProductIds.value.size < MAX_PRODUCTS_PER_BOOKING
}
function toggleProduct(id: string) {
  const set = new Set(selectedProductIds.value)
  if (set.has(id)) {
    set.delete(id)
  } else {
    const product = bookingStore.products.find((p) => p.id === id)
    if (!product || !canAddProduct(product)) return
    set.add(id)
  }
  selectedProductIds.value = set
}

// Un barbero que agenda desde su panel normalmente agenda para sí mismo.
if (authStore.user && bookingStore.bookableBarberos.some((b) => b.id === authStore.user!.uid)) {
  form.barberoId = authStore.user.uid
}

const MAX_DAYS_AHEAD = 90
// Desde el panel se pueden registrar citas que ya pasaron (reservas hechas
// directamente con el barbero), hasta este número de días atrás.
const MAX_DAYS_BACK = 30
const minDate = (() => {
  const d = new Date()
  d.setDate(d.getDate() - MAX_DAYS_BACK)
  return formatLocalDate(d)
})()
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
// A diferencia del modal público, aquí se ofrecen también las horas que ya
// pasaron, siempre que nadie las haya tomado.
const timeSlots = computed(() =>
  buildTimeSlots(schedule.value, selectedDate.value, bookedTimes.value, { allowPast: true }),
)

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
      return `Elige una fecha entre ${MAX_DAYS_BACK} días atrás y ${MAX_DAYS_AHEAD} días adelante.`
    if (dayDisabled.value) return `${selectedBarbero.value.name} no trabaja ese día.`
    if (!form.time) return 'Elige la hora de la cita.'
  }
  return ''
}

// Quiénes "tienen" al cliente: quien lo registra y el barbero de la cita.
function ownerIds(): string[] {
  const ids = new Set<string>()
  if (authStore.user) ids.add(authStore.user.uid)
  if (form.withBooking && form.barberoId) ids.add(form.barberoId)
  return [...ids]
}

// Crea el cliente solo si ese celular no existe; devuelve true si ya existía.
// Si ya existía, se suma quien lo registra a sus barberos para que lo vea.
async function ensureCustomer(name: string, phone: string): Promise<boolean> {
  const ref = doc(db, 'clientes', normalizePhone(phone))
  const snap = await getDoc(ref)
  const owners = ownerIds()
  if (snap.exists()) {
    if (owners.length) {
      await updateDoc(ref, { barberoIds: arrayUnion(...owners) }).catch((err) =>
        console.warn('No se pudo asociar el cliente al barbero', err),
      )
    }
    return true
  }
  await setDoc(ref, {
    name,
    phone,
    createdAt: serverTimestamp(),
    privacyConsent: true,
    privacyPolicyVersion: PRIVACY_POLICY_VERSION,
    barberoIds: owners,
    createdBy: authStore.user?.uid ?? '',
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
    // El cliente que ya está en la lista queda asociado al barbero por la cita.
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
    const chosenProducts = selectedProducts.value
    const batch = writeBatch(db)
    // Cada producto descuenta 1 unidad de stock en el mismo lote (igual que la web).
    for (const product of chosenProducts) {
      batch.update(doc(db, 'productos', product.id), { stock: increment(-1), stockCitaId: citaRef.id })
    }
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
      products: chosenProducts.map((p) => ({ id: p.id, name: p.name, price: p.price })),
      productIds: chosenProducts.map((p) => p.id),
      total: total.value,
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
      const soldOut = chosenProducts.filter(
        (chosen) => (bookingStore.products.find((p) => p.id === chosen.id)?.stock ?? 0) <= 0,
      )
      if (bookedTimes.value.includes(time)) {
        form.time = ''
        error.value = 'Ese horario se acaba de ocupar. Elige otro.'
      } else if (soldOut.length > 0) {
        const set = new Set(selectedProductIds.value)
        soldOut.forEach((p) => set.delete(p.id))
        selectedProductIds.value = set
        error.value = `Se agotó: ${soldOut.map((p) => p.name).join(', ')}. Lo quitamos de la cita.`
      } else {
        error.value = alreadyExisted
          ? 'No se pudo agendar la cita. Intenta de nuevo.'
          : 'El cliente se registró, pero no se pudo agendar la cita. Intenta de nuevo.'
      }
      return
    }

    const fecha = dateTime.toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long' })
    const verb = dateTime.getTime() < Date.now() ? 'Cita registrada' : 'Cita agendada'
    emit('saved', `${verb} para ${name}: ${fecha} a las ${formatTime12(time)} con ${barbero.name}.`)
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

            <!-- Productos (opcional) -->
            <div v-if="offeredProducts.length > 0">
              <p class="text-xs tracking-wide text-white/40 mb-2">
                PRODUCTOS <span class="normal-case tracking-normal text-white/30">(opcional, máximo {{ MAX_PRODUCTS_PER_BOOKING }})</span>
              </p>
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <button
                  v-for="product in offeredProducts"
                  :key="product.id"
                  type="button"
                  :disabled="!canAddProduct(product)"
                  class="flex items-center justify-between gap-3 rounded-lg border px-3 py-2 text-left transition disabled:opacity-40 disabled:cursor-not-allowed"
                  :class="
                    selectedProductIds.has(product.id)
                      ? 'border-[#4a8fe7]/60 bg-[#4a8fe7]/10'
                      : 'border-white/10 hover:border-white/25'
                  "
                  @click="toggleProduct(product.id)"
                >
                  <span class="min-w-0">
                    <span class="block text-sm text-white truncate">{{ product.name }}</span>
                    <span v-if="product.stock <= 0" class="block text-[11px] text-red-400">Agotado</span>
                    <span v-else-if="product.stock <= LOW_STOCK_THRESHOLD" class="block text-[11px] text-[#f2b705]">
                      Quedan {{ product.stock }}
                    </span>
                    <span v-else class="block text-[11px] text-white/40">Stock: {{ product.stock }}</span>
                  </span>
                  <span class="text-sm font-semibold text-[#4a8fe7] shrink-0">{{ formatCOP(product.price) }}</span>
                </button>
              </div>
            </div>

            <div v-if="selectedService" class="flex items-center justify-between text-sm border-t border-white/10 pt-4">
              <span class="text-white/60">Total de la cita</span>
              <span class="font-bold text-[#4a8fe7]">{{ formatCOP(total) }}</span>
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
