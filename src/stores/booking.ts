import { defineStore } from 'pinia'
import { computed, reactive, ref } from 'vue'
import { addDoc, collection, doc, getDoc, serverTimestamp, Timestamp, updateDoc } from 'firebase/firestore'
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

// TODO: replace all three lists below with real data fetched from Firestore
// (empleados / servicios / productos collections) — same shape, same admin
// panel. Note: these prices don't 100% match what's on /productos yet since
// that page and this step came from separate mockups — reconcile once both
// read from the same collection.
export const BARBEROS: Barbero[] = [
  { id: 'admin', name: 'Administrador', role: 'Propietario' },
  { id: 'yeison', name: 'Yeison Creiizii', role: 'Barbero' },
  { id: 'camilo', name: 'Camilo Estilo', role: 'Barbero' },
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

  // The cita just created in this session (drives the success screen's
  // Cancelar/Google-Calendar buttons).
  const lastCreatedCitaId = ref<string | null>(null)

  // A booking remembered from a previous visit (localStorage), shown instead
  // of the wizard when the modal opens.
  const storedBooking = ref<StoredBooking | null>(null)
  const showStoredBooking = ref(false)
  const isCancelling = ref(false)
  let hasCheckedStorage = false

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

  // --- Remembering a booking across visits ---------------------------------

  // Re-checks localStorage + Firestore. Safe to call more than once (e.g.
  // once on page load for a banner, again when the modal opens) — cheap and
  // idempotent.
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
      // Offline or blocked — fall back to trusting the local copy rather
      // than hiding a real upcoming appointment.
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
    currentStepIndex.value = 0
    selectedBarberoId.value = null
    selectedServiceId.value = null
    selectedDate.value = null
    selectedTime.value = null
    selectedProductIds.value = new Set()
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
    next()
  }
  function selectService(id: string) {
    selectedServiceId.value = id
    next()
  }
  function selectDate(date: Date) {
    selectedDate.value = date
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
    try {
      const dateTime = combineDateAndTime(selectedDate.value, selectedTime.value)

      const docRef = await addDoc(collection(db, 'citas'), {
        barberoId: selectedBarbero.value.id,
        barberoName: selectedBarbero.value.name,
        serviceId: selectedService.value.id,
        serviceName: selectedService.value.name,
        serviceDuration: selectedService.value.duration,
        servicePrice: selectedService.value.price,
        products: selectedProducts.value.map((p) => ({ id: p.id, name: p.name, price: p.price })),
        total: total.value,
        dateTime: Timestamp.fromDate(dateTime),
        date: dateTime.toISOString().slice(0, 10), // "YYYY-MM-DD", handy for simple date filtering
        time: selectedTime.value,
        customerName: customer.name.trim(),
        customerPhone: customer.phone.trim(),
        customerEmail: customer.email.trim(),
        customerNotes: customer.notes.trim(),
        // Every booking made from the public site starts as "pendiente" —
        // only staff in the admin panel can move it to confirmada/etc.
        status: 'pendiente',
        createdAt: serverTimestamp(),
      })

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
  // a booking" screen — same underlying action either way.
  async function cancelBooking(citaId: string): Promise<boolean> {
    isCancelling.value = true
    try {
      await updateDoc(doc(db, 'citas', citaId), { status: 'cancelada' })
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
