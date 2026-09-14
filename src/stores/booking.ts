import { defineStore } from 'pinia'
import { computed, reactive, ref } from 'vue'
import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
  where,
} from 'firebase/firestore'
import { db } from '../config/firebase'

export interface Barbero {
  id: string
  name: string
  role: string
}

export interface ServiceItem {
  id: string
  name: string
  description: string
  duration: string
  price: number
}

export interface ServiceCategory {
  id: string
  title: string
  items: ServiceItem[]
}

export interface Product {
  id: string
  name: string
  brand: string
  price: number
}

export interface StoredBooking {
  citaId: string
  customerName: string
  barberoName: string
  serviceName: string
  serviceDuration: string
  dateTimeISO: string
  time: string
  total: number
  status: string
}

export const STEPS = ['Barbero', 'Servicio', 'Fecha', 'Datos', 'Productos'] as const
export type StepName = (typeof STEPS)[number]

export function formatCOP(value: number): string {
  return `$${value.toLocaleString('es-CO')}`
}

// One doc per barbero+día+hora, deterministic ID on purpose (see confirmBooking):
// Firestore only runs "create" rules when the doc doesn't exist yet, so this
// doubles as our double-booking guard — a second person hitting the same
// slot lands on the "update" rule instead, which a non-staff request can't
// use to re-claim it.
export function getSlotId(barberoId: string, date: string, time: string): string {
  return `${barberoId}_${date}_${time}`
}

// TODO: replace all three lists below with real data fetched from Firestore
// (empleados / servicios / productos collections) — same shape, same admin
// panel. Note: these prices don't 100% match what's on /productos yet since
// that page and this step came from separate mockups — reconcile once both
// read from the same collection.
export const BARBEROS: Barbero[] = [
  { id: 'admin', name: 'Administrador', role: 'Propietario' }
]

const SERVICE_CATEGORIES: ServiceCategory[] = [
  {
    id: 'cortes',
    title: 'Cortes de Cabello',
    items: [
      { id: 'corte', name: 'Corte de Cabello', description: 'Corte clásico profesional', duration: '30 min', price: 15000 },
      { id: 'corte-pigmentado', name: 'Corte Pigmentado', description: 'Corte con técnica de pigmentación premium', duration: '45 min', price: 18000 },
      { id: 'corte-barba', name: 'Corte y Barba', description: 'Combo completo: corte + arreglo de barba', duration: '50 min', price: 18000 },
      { id: 'corte-barba-pigmentado', name: 'Corte y Barba Pigmentado', description: 'Corte + barba con pigmentación de alta calidad', duration: '60 min', price: 22000 },
      { id: 'marcada', name: 'Marcada', description: 'Retoque y marcada de líneas', duration: '20 min', price: 7000 },
      { id: 'corte-puntas', name: 'Corte de Puntas (Mujeres)', description: 'Corte de puntas maltratadas', duration: '30 min', price: 10000 },
    ],
  },
  {
    id: 'barba',
    title: 'Barba',
    items: [
      { id: 'barba', name: 'Barba Caballero', description: 'Perfilado y arreglo clásico', duration: '20 min', price: 7000 },
      { id: 'barba-pigmentada', name: 'Barba Pigmentada', description: 'Pigmentación para cubrir canas', duration: '30 min', price: 12000 },
    ],
  },
  {
    id: 'cejas',
    title: 'Cejas',
    items: [
      { id: 'cejas', name: 'Cejas', description: 'Perfilado con navaja', duration: '15 min', price: 5000 },
      { id: 'cejas-pigmentadas', name: 'Cejas Pigmentadas', description: 'Pigmentación para definir', duration: '20 min', price: 10000 },
    ],
  },
]

const PRODUCTS: Product[] = [
  { id: 'gel-fuerte', name: 'Gel Fijación Fuerte', brand: 'American Crew', price: 25000 },
  { id: 'gel-media', name: 'Gel Fijación Media', brand: 'Gatsby', price: 18000 },
  { id: 'gel-wetlook', name: 'Gel Wet Look', brand: "L'Oreal", price: 22000 },
  { id: 'gel-mate', name: 'Gel Acabado Mate', brand: 'Wella', price: 28000 },
]

const STORAGE_KEY = 'creiizii_last_booking'
const INACTIVE_STATUSES = ['cancelada', 'completada', 'no_asistio']

function combineDateAndTime(date: Date, time: string): Date {
  const [hours = 0, minutes = 0] = time.split(':').map(Number)
  const combined = new Date(date)
  combined.setHours(hours, minutes, 0, 0)
  return combined
}

// Colombia has no DST, but toISOString() still converts to UTC — for
// evening appointments (7pm+) that rolls the calendar date to the next day.
// This keeps the LOCAL calendar date instead, which is what "date" should
// mean here (matching what the person actually picked on screen).
export function formatLocalDate(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

function readStoredBooking(): StoredBooking | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as StoredBooking) : null
  } catch {
    return null
  }
}
function writeStoredBooking(booking: StoredBooking) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(booking))
}
function clearStoredBooking() {
  localStorage.removeItem(STORAGE_KEY)
}

export const useBookingStore = defineStore('booking', () => {
  const isOpen = ref(false)
  const isConfirmed = ref(false)
  const isSubmitting = ref(false)
  const submitError = ref<string | null>(null)
  const currentStepIndex = ref(0)

  const barberos = ref<Barbero[]>(BARBEROS)
  const serviceCategories = ref<ServiceCategory[]>(SERVICE_CATEGORIES)
  const products = ref<Product[]>(PRODUCTS)

  const selectedBarberoId = ref<string | null>(null)
  const selectedServiceId = ref<string | null>(null)
  const selectedDate = ref<Date | null>(null)
  const selectedTime = ref<string | null>(null)
  const selectedProductIds = ref<Set<string>>(new Set())

  const customer = reactive({
    name: '',
    phone: '',
    email: '',
    notes: '',
  })

  const lastCreatedCitaId = ref<string | null>(null)

  const storedBooking = ref<StoredBooking | null>(null)
  const showStoredBooking = ref(false)
  const isCancelling = ref(false)
  let hasCheckedStorage = false

  // Times already taken for the selected barbero + selected date, read
  // straight from the public "disponibilidad" collection (no PII in it, so
  // no auth needed — unlike "citas", which does hold customer data).
  const bookedTimes = ref<string[]>([])
  const isLoadingBookedTimes = ref(false)

  const currentStep = computed<StepName>(() => STEPS[currentStepIndex.value] ?? STEPS[0])

  const selectedBarbero = computed(
    () => barberos.value.find((b) => b.id === selectedBarberoId.value) ?? null,
  )

  const allServices = computed(() => serviceCategories.value.flatMap((c) => c.items))
  const selectedService = computed(
    () => allServices.value.find((s) => s.id === selectedServiceId.value) ?? null,
  )

  const selectedProducts = computed(() =>
    products.value.filter((p) => selectedProductIds.value.has(p.id)),
  )

  const total = computed(() => {
    const servicePrice = selectedService.value?.price ?? 0
    const productsPrice = selectedProducts.value.reduce((sum, p) => sum + p.price, 0)
    return servicePrice + productsPrice
  })

  const isFechaValid = computed(() => !!selectedDate.value && !!selectedTime.value)
  const isDatosValid = computed(
    () => customer.name.trim().length > 0 && customer.phone.trim().length > 0,
  )

  async function fetchBookedTimes() {
    if (!selectedBarberoId.value || !selectedDate.value) {
      bookedTimes.value = []
      return
    }
    isLoadingBookedTimes.value = true
    try {
      const dateStr = formatLocalDate(selectedDate.value)
      const q = query(
        collection(db, 'disponibilidad'),
        where('barberoId', '==', selectedBarberoId.value),
        where('date', '==', dateStr),
      )
      const snapshot = await getDocs(q)
      bookedTimes.value = snapshot.docs
        .map((d) => d.data())
        .filter((slot) => slot.status !== 'cancelada')
        .map((slot) => slot.time as string)
    } catch (err) {
      console.error('No se pudieron cargar los horarios ocupados', err)
      bookedTimes.value = []
    } finally {
      isLoadingBookedTimes.value = false
    }
  }

  // --- Remembering a booking across visits ---------------------------------

  async function refreshStoredBooking() {
    const stored = readStoredBooking()
    if (!stored || new Date(stored.dateTimeISO).getTime() <= Date.now()) {
      storedBooking.value = null
      clearStoredBooking()
      hasCheckedStorage = true
      return
    }
    try {
      const snap = await getDoc(doc(db, 'citas', stored.citaId))
      if (snap.exists() && !INACTIVE_STATUSES.includes(snap.data().status)) {
        storedBooking.value = { ...stored, status: snap.data().status }
      } else {
        storedBooking.value = null
        clearStoredBooking()
      }
    } catch {
      storedBooking.value = stored
    }
    hasCheckedStorage = true
  }

  async function open() {
    isOpen.value = true
    isConfirmed.value = false
    submitError.value = null
    if (!hasCheckedStorage) await refreshStoredBooking()

    if (storedBooking.value) {
      showStoredBooking.value = true
    } else {
      startNewBooking()
    }
  }
  function close() {
    isOpen.value = false
  }

  function startNewBooking() {
    showStoredBooking.value = false
    submitError.value = null
    currentStepIndex.value = 0
    selectedBarberoId.value = null
    selectedServiceId.value = null
    selectedDate.value = null
    selectedTime.value = null
    selectedProductIds.value = new Set()
    bookedTimes.value = []
    customer.name = ''
    customer.phone = ''
    customer.email = ''
    customer.notes = ''
  }

  function goToStep(index: number) {
    if (index >= 0 && index < STEPS.length) currentStepIndex.value = index
  }
  function next() {
    goToStep(currentStepIndex.value + 1)
  }
  function back() {
    goToStep(currentStepIndex.value - 1)
  }

  function selectBarbero(id: string) {
    selectedBarberoId.value = id
    if (selectedDate.value) fetchBookedTimes()
    next()
  }
  function selectService(id: string) {
    selectedServiceId.value = id
    next()
  }
  function selectDate(date: Date) {
    selectedDate.value = date
    selectedTime.value = null // availability changed — force re-picking the time
    fetchBookedTimes()
  }
  function selectTime(time: string) {
    selectedTime.value = time
  }
  function toggleProduct(id: string) {
    const set = new Set(selectedProductIds.value)
    if (set.has(id)) set.delete(id)
    else set.add(id)
    selectedProductIds.value = set
  }

  async function confirmBooking() {
    if (!selectedBarbero.value || !selectedService.value || !selectedDate.value || !selectedTime.value) {
      submitError.value = 'Falta información para completar la reserva.'
      return
    }

    isSubmitting.value = true
    submitError.value = null

    const dateTime = combineDateAndTime(selectedDate.value, selectedTime.value)
    const dateStr = formatLocalDate(dateTime)
    const slotId = getSlotId(selectedBarbero.value.id, dateStr, selectedTime.value)

    try {
      // Claim the slot FIRST. If someone else already took it, this write is
      // rejected by the security rules (see getSlotId's comment above) — so
      // this doubles as protection against two people booking the same hour.
      try {
        await setDoc(doc(db, 'disponibilidad', slotId), {
          barberoId: selectedBarbero.value.id,
          date: dateStr,
          time: selectedTime.value,
          status: 'pendiente',
        })
      } catch {
        submitError.value = 'Ese horario ya no está disponible. Por favor elige otro.'
        await fetchBookedTimes()
        goToStep(STEPS.indexOf('Fecha'))
        return
      }

      let docRef
      try {
        docRef = await addDoc(collection(db, 'citas'), {
          barberoId: selectedBarbero.value.id,
          barberoName: selectedBarbero.value.name,
          serviceId: selectedService.value.id,
          serviceName: selectedService.value.name,
          serviceDuration: selectedService.value.duration,
          servicePrice: selectedService.value.price,
          products: selectedProducts.value.map((p) => ({ id: p.id, name: p.name, price: p.price })),
          total: total.value,
          dateTime: Timestamp.fromDate(dateTime),
          date: dateStr,
          time: selectedTime.value,
          customerName: customer.name.trim(),
          customerPhone: customer.phone.trim(),
          customerEmail: customer.email.trim(),
          customerNotes: customer.notes.trim(),
          status: 'pendiente',
          createdAt: serverTimestamp(),
        })
      } catch (citaErr) {
        // Roll back the slot claim since the actual booking failed.
        await setDoc(doc(db, 'disponibilidad', slotId), { status: 'cancelada' }, { merge: true }).catch(() => {})
        throw citaErr
      }

      lastCreatedCitaId.value = docRef.id
      isConfirmed.value = true

      const record: StoredBooking = {
        citaId: docRef.id,
        customerName: customer.name.trim(),
        barberoName: selectedBarbero.value.name,
        serviceName: selectedService.value.name,
        serviceDuration: selectedService.value.duration,
        dateTimeISO: dateTime.toISOString(),
        time: selectedTime.value,
        total: total.value,
        status: 'pendiente',
      }
      writeStoredBooking(record)
      storedBooking.value = record
    } catch (err) {
      console.error('No se pudo guardar la cita', err)
      submitError.value = 'No se pudo guardar tu cita. Intenta de nuevo o escríbenos por WhatsApp.'
    } finally {
      isSubmitting.value = false
    }
  }

  // Used by both the "just booked" success screen and the "you already have
  // a booking" screen — reads the cita to find its slot, then frees both.
  async function cancelBooking(citaId: string): Promise<boolean> {
    isCancelling.value = true
    try {
      const citaSnap = await getDoc(doc(db, 'citas', citaId))
      if (!citaSnap.exists()) return false
      const cita = citaSnap.data() as { barberoId: string; date: string; time: string }

      await updateDoc(doc(db, 'citas', citaId), { status: 'cancelada' })
      await setDoc(
        doc(db, 'disponibilidad', getSlotId(cita.barberoId, cita.date, cita.time)),
        { status: 'cancelada' },
        { merge: true },
      )

      if (storedBooking.value?.citaId === citaId) {
        storedBooking.value = null
        clearStoredBooking()
        showStoredBooking.value = false
      }
      return true
    } catch (err) {
      console.error('No se pudo cancelar la cita', err)
      return false
    } finally {
      isCancelling.value = false
    }
  }

  return {
    isOpen,
    isConfirmed,
    isSubmitting,
    submitError,
    currentStepIndex,
    currentStep,
    barberos,
    serviceCategories,
    products,
    selectedBarberoId,
    selectedServiceId,
    selectedDate,
    selectedTime,
    selectedProductIds,
    customer,
    lastCreatedCitaId,
    storedBooking,
    showStoredBooking,
    isCancelling,
    bookedTimes,
    isLoadingBookedTimes,
    selectedBarbero,
    allServices,
    selectedService,
    selectedProducts,
    total,
    isFechaValid,
    isDatosValid,
    open,
    close,
    startNewBooking,
    refreshStoredBooking,
    goToStep,
    next,
    back,
    selectBarbero,
    selectService,
    selectDate,
    selectTime,
    toggleProduct,
    confirmBooking,
    cancelBooking,
  }
})
