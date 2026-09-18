import { defineStore } from 'pinia'
import { computed, reactive, ref } from 'vue'
import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  orderBy,
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

export function getSlotId(barberoId: string, date: string, time: string): string {
  return `${barberoId}_${date}_${time}`
}

const STORAGE_KEY = 'creiizii_last_booking'
const INACTIVE_STATUSES = ['cancelada', 'completada', 'no_asistio']

function combineDateAndTime(date: Date, time: string): Date {
  const [hours = 0, minutes = 0] = time.split(':').map(Number)
  const combined = new Date(date)
  combined.setHours(hours, minutes, 0, 0)
  return combined
}

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

// Shape stored on each empleados/{uid} doc's own `services` field — same
// shape your CutsView.vue already writes to `config.services`, just now
// scoped to one barbero instead of shared globally.
interface RawServiceItem {
  name?: string
  price?: string | number
  active?: boolean
}
interface RawService {
  title?: string
  items?: RawServiceItem[]
}

function parseServiceCategories(raw: RawService[] | undefined): ServiceCategory[] {
  return (raw || [])
    .map((service, serviceIndex) => ({
      id: `service-${serviceIndex}`,
      title: String(service.title || '').trim(),
      items: (service.items || [])
        .filter((item) => item.active !== false)
        .filter((item) => String(item.name || '').trim() !== '')
        .map((item, itemIndex) => ({
          id: `service-${serviceIndex}-item-${itemIndex}`,
          name: String(item.name || '').trim(),
          description: '',
          duration: '30 min',
          price: Number(String(item.price ?? '0').replace(/\D/g, '')) || 0,
        })),
    }))
    .filter((service) => service.title && service.items.length > 0)
}

export const useBookingStore = defineStore('booking', () => {
  const isOpen = ref(false)
  const isConfirmed = ref(false)
  const isSubmitting = ref(false)
  const submitError = ref<string | null>(null)
  const currentStepIndex = ref(0)

  // Barberos = staff activo (admin + empleados), en vivo desde Firestore —
  // ya no es una lista quemada. Se arranca una sola vez, igual que products.
  const barberos = ref<Barbero[]>([])

onSnapshot(
  collection(db, 'empleados'),
  (snapshot) => {
    console.log(
      'EMPLEADOS FIREBASE:',
      snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }))
    )

    barberos.value = snapshot.docs
      .map((d) => {
        const data = d.data()

        return {
          id: d.id,
          name: data.name,
          role: data.role === 'admin' ? 'Propietario' : 'Barbero',
        } as Barbero
      })
      .sort((a, b) => a.name.localeCompare(b.name))
  },
  (err) => console.error('No se pudieron cargar los empleados', err),
)

  const serviceCategories = ref<ServiceCategory[]>([])
  const isLoadingServices = ref(false)

  const products = ref<Product[]>([])
  onSnapshot(
    query(collection(db, 'productos'), where('active', '==', true), orderBy('name')),
    (snapshot) => {
      products.value = snapshot.docs.map((d) => {
        const data = d.data()
        return { id: d.id, name: data.name, brand: data.brand ?? '', price: data.price ?? 0 } as Product
      })
    },
    (err) => console.error('No se pudieron cargar los productos', err),
  )

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

  const bookedTimes = ref<string[]>([])
  const isLoadingBookedTimes = ref(false)

  const currentStep = computed<StepName>(() => STEPS[currentStepIndex.value] ?? STEPS[0])

  const selectedBarbero = computed(
    () => barberos.value.find((b) => b.id === selectedBarberoId.value) ?? null,
  )

  const allServices = computed(() => serviceCategories.value.flatMap((category) => category.items))
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

  // Cada barbero tiene SU PROPIA lista de servicios/precios, guardada en
  // empleados/{barberoId}.services — se recarga cada vez que se elige un
  // barbero distinto en el wizard.
  async function fetchServicesForBarbero(barberoId: string) {
    isLoadingServices.value = true
    try {
      const snap = await getDoc(doc(db, 'empleados', barberoId))
      const data = snap.exists() ? (snap.data() as { services?: RawService[] }) : undefined
      serviceCategories.value = parseServiceCategories(data?.services)
    } catch (err) {
      console.error('No se pudieron cargar los servicios del barbero', err)
      serviceCategories.value = []
    } finally {
      isLoadingServices.value = false
    }
  }

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
    serviceCategories.value = []
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
    selectedServiceId.value = null // el precio depende del barbero — no arrastrar el servicio del anterior
    fetchServicesForBarbero(id)
    if (selectedDate.value) fetchBookedTimes()
    next()
  }
  function selectService(id: string) {
    selectedServiceId.value = id
    next()
  }
  function selectDate(date: Date) {
    selectedDate.value = date
    selectedTime.value = null
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
    isLoadingServices,
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
    fetchServicesForBarbero,
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
