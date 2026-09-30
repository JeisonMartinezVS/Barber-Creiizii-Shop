import { defineStore } from 'pinia'
import { computed, reactive, ref } from 'vue'
import {
  collection,
  doc,
  getDoc,
  getDocs,
  increment,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  Timestamp,
  where,
  writeBatch,
} from 'firebase/firestore'
import { db } from '../config/firebase'
import { PRIVACY_POLICY_VERSION } from '../content/legalVersion'

export interface Barbero {
  id: string
  name: string
  role: string
  active: boolean
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
  stock: number
}

// --- Stock -------------------------------------------------------------------
// Cada producto de una cita descuenta 1 unidad al reservar y la devuelve si la
// cita se cancela o se marca "no asistió". Las reglas de Firestore solo
// permiten mover el stock así, ligado a una cita en el mismo lote.

/** Máximo de productos por cita (lo que las reglas pueden verificar). */
export const MAX_PRODUCTS_PER_BOOKING = 3
/** Desde esta cantidad se avisa que el producto está por agotarse. */
export const LOW_STOCK_THRESHOLD = 3

const STOCK_HOLDING_STATUSES = ['pendiente', 'confirmada', 'completada']

/**
 * Cuánto cambia el stock de cada producto de una cita al pasar de un estado a
 * otro: -1 si empieza a retener el producto, +1 si lo libera, 0 si nada cambia.
 */
export function stockDeltaForStatusChange(from: string, to: string): -1 | 0 | 1 {
  const heldBefore = STOCK_HOLDING_STATUSES.includes(from)
  const holdsNow = STOCK_HOLDING_STATUSES.includes(to)
  if (heldBefore === holdsNow) return 0
  return holdsNow ? -1 : 1
}

export interface DaySchedule {
  label: string
  enabled: boolean
  start: string // "HH:MM"
  end: string
}

// getDay(): 0 = Domingo ... 6 = Sábado; este orden se respeta en todo el proyecto.
export const WEEKDAY_LABELS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']

// Horario por defecto para los barberos que aún no configuraron el suyo en
// TimeView.vue, para que nada falle antes de que lo editen.
export function defaultSchedule(): DaySchedule[] {
  return WEEKDAY_LABELS.map((label) => ({ label, enabled: true, start: '10:00', end: '21:00' }))
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
// localStorage puede no estar disponible (modo privado o bloqueado): la cita
// ya quedó guardada en Firestore, así que un fallo aquí no debe romper nada.
function writeStoredBooking(booking: StoredBooking) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(booking))
  } catch {
    // Sin almacenamiento local: solo se pierde el recordatorio de la cita.
  }
}
function clearStoredBooking() {
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch {
    // Igual que arriba.
  }
}

// Forma de los servicios guardados en `config.services`, la misma que
// escribe CutsView.vue.
interface RawServiceItem {
  name?: string
  description?: string
  price?: string | number
  duration?: string | number
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
          description: String(item.description || '').trim(),
          duration: item.duration ? String(item.duration) : '30 min',
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

  // Barberos = personal (admin + empleados) en vivo desde /empleados. Solo se
  // toman id, nombre, rol y si está activo; nunca se registran los documentos
  // en consola (incluyen correo y celular). Incluye inactivos para que el
  // panel siga mostrando el nombre en citas antiguas; para reservar se usa
  // bookableBarberos.
  const barberos = ref<Barbero[]>([])

  onSnapshot(
    collection(db, 'empleados'),
    (snapshot) => {
      barberos.value = snapshot.docs
        .map((d) => {
          const data = d.data()
          return {
            id: d.id,
            name: String(data.name ?? ''),
            role: data.role === 'admin' ? 'Propietario' : 'Barbero',
            active: data.active !== false,
          } as Barbero
        })
        .filter((b) => b.name)
        .sort((a, b) => a.name.localeCompare(b.name))
    },
    (err) => console.error('No se pudieron cargar los empleados', err),
  )

  // Solo los barberos activos se pueden elegir al reservar.
  const bookableBarberos = computed(() => barberos.value.filter((b) => b.active))

  // Los precios ahora son UNOS SOLOS para todos los barberos — los pone el
  // admin en config.services (ya no viven en empleados/{uid}). Se cargan
  // una sola vez, en vivo, igual que barberos y productos.
  const serviceCategories = ref<ServiceCategory[]>([])
  const isLoadingServices = ref(true)
  onSnapshot(
    collection(db, 'config'),
    (snapshot) => {
      const configDoc = snapshot.docs[0]
      const data = configDoc ? (configDoc.data() as { services?: RawService[] }) : undefined
      serviceCategories.value = parseServiceCategories(data?.services)
      isLoadingServices.value = false
    },
    (err) => {
      console.error('No se pudieron cargar los servicios', err)
      serviceCategories.value = []
      isLoadingServices.value = false
    },
  )

  const products = ref<Product[]>([])
  onSnapshot(
    query(collection(db, 'productos'), where('active', '==', true), orderBy('name')),
    (snapshot) => {
      products.value = snapshot.docs.map((d) => {
        const data = d.data()
        return {
          id: d.id,
          name: data.name,
          brand: data.brand ?? '',
          price: data.price ?? 0,
          stock: Number(data.stock ?? 0),
        } as Product
      })
    },
    (err) => console.error('No se pudieron cargar los productos', err),
  )

  const selectedBarberoId = ref<string | null>(null)
  const selectedServiceId = ref<string | null>(null)
  const selectedDate = ref<Date | null>(null)
  const selectedTime = ref<string | null>(null)
  const selectedProductIds = ref<Set<string>>(new Set())

  // Solo se piden nombre y celular (minimización de datos, Ley 1581).
  const customer = reactive({
    name: '',
    phone: '',
  })
  // Autorización para el tratamiento de datos. La casilla viene marcada por
  // defecto; la autorización se otorga al confirmar la reserva con ella
  // marcada (conducta inequívoca, Decreto 1377 de 2013, art. 7). Si la persona
  // la desmarca, no se puede reservar en línea.
  const acceptedPrivacy = ref(true)

  const lastCreatedCitaId = ref<string | null>(null)

  const storedBooking = ref<StoredBooking | null>(null)
  const showStoredBooking = ref(false)
  const isCancelling = ref(false)
  let hasCheckedStorage = false

  const bookedTimes = ref<string[]>([])
  const isLoadingBookedTimes = ref(false)

  // Productos que el cliente puede agregar (activos y con stock).
  const availableProducts = computed(() => products.value.filter((p) => p.stock > 0))

  // Pasos del asistente. Si no hay productos disponibles, el paso "Productos"
  // se omite y la reserva se confirma directamente desde "Datos".
  const steps = computed<StepName[]>(() =>
    availableProducts.value.length > 0 ? [...STEPS] : STEPS.filter((step) => step !== 'Productos'),
  )
  const currentStep = computed<StepName>(
    () => steps.value[currentStepIndex.value] ?? steps.value[steps.value.length - 1]!,
  )
  const isLastStep = computed(() => currentStepIndex.value >= steps.value.length - 1)

  const selectedBarbero = computed(
    () => bookableBarberos.value.find((b) => b.id === selectedBarberoId.value) ?? null,
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
  // Mismos límites que valida firestore.rules para las citas.
  const isNameValid = computed(() => {
    const name = customer.name.trim()
    return name.length >= 2 && name.length <= 80
  })
  const isPhoneValid = computed(() => /^[0-9+() -]{7,20}$/.test(customer.phone.trim()))
  const isDatosValid = computed(() => isNameValid.value && isPhoneValid.value && acceptedPrivacy.value)

  // El horario SÍ sigue siendo propio de cada barbero — esto no cambió.
  const selectedBarberoSchedule = ref<DaySchedule[]>(defaultSchedule())

  async function fetchScheduleForBarbero(barberoId: string) {
    try {
      const snap = await getDoc(doc(db, 'empleados', barberoId))
      const data = snap.exists() ? (snap.data() as { schedule?: DaySchedule[] }) : undefined
      selectedBarberoSchedule.value =
        Array.isArray(data?.schedule) && data.schedule.length === 7 ? data.schedule : defaultSchedule()
    } catch (err) {
      console.error('No se pudo cargar el horario del barbero', err)
      selectedBarberoSchedule.value = defaultSchedule()
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
    selectedBarberoSchedule.value = defaultSchedule()
    bookedTimes.value = []
    customer.name = ''
    customer.phone = ''
    acceptedPrivacy.value = true
  }

  function goToStep(index: number) {
    if (index >= 0 && index < steps.value.length) currentStepIndex.value = index
  }
  function next() {
    goToStep(currentStepIndex.value + 1)
  }
  function back() {
    goToStep(currentStepIndex.value - 1)
  }

  function selectBarbero(id: string) {
    selectedBarberoId.value = id
    fetchScheduleForBarbero(id)
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
    if (set.has(id)) {
      set.delete(id)
    } else {
      const product = products.value.find((p) => p.id === id)
      if (!product || product.stock <= 0 || set.size >= MAX_PRODUCTS_PER_BOOKING) return
      set.add(id)
    }
    selectedProductIds.value = set
  }

  async function confirmBooking() {
    if (!selectedBarbero.value || !selectedService.value || !selectedDate.value || !selectedTime.value) {
      submitError.value = 'Falta información para completar la reserva.'
      return
    }
    if (!isDatosValid.value) {
      submitError.value = 'Revisa tu nombre, tu celular y la autorización de datos.'
      goToStep(steps.value.indexOf('Datos'))
      return
    }

    isSubmitting.value = true
    submitError.value = null

    const dateTime = combineDateAndTime(selectedDate.value, selectedTime.value)
    const dateStr = formatLocalDate(dateTime)
    const time = selectedTime.value
    const barbero = selectedBarbero.value
    const service = selectedService.value
    const slotId = getSlotId(barbero.id, dateStr, time)

    // La cita y su horario se guardan en UN solo lote atómico: o se guardan
    // las dos o ninguna. Las reglas de Firestore validan que coincidan y que el
    // horario esté libre, así nadie puede ocupar horarios sin una cita real
    // ni se producen reservas dobles.
    const citaRef = doc(collection(db, 'citas'))
    const chosenProducts = selectedProducts.value
    const batch = writeBatch(db)
    // Cada producto elegido descuenta 1 unidad de stock en el mismo lote.
    for (const product of chosenProducts) {
      batch.update(doc(db, 'productos', product.id), { stock: increment(-1), stockCitaId: citaRef.id })
    }
    batch.set(doc(db, 'disponibilidad', slotId), {
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
      customerName: customer.name.trim(),
      customerPhone: customer.phone.trim(),
      status: 'pendiente',
      createdAt: serverTimestamp(),
      privacyConsent: true,
      privacyPolicyVersion: PRIVACY_POLICY_VERSION,
    })

    try {
      await batch.commit()
    } catch (err) {
      console.error('No se pudo guardar la cita', err)
      // Si el horario ya aparece ocupado, alguien lo tomó primero.
      await fetchBookedTimes()
      const soldOut = chosenProducts.filter(
        (chosen) => (products.value.find((p) => p.id === chosen.id)?.stock ?? 0) <= 0,
      )
      if (bookedTimes.value.includes(time)) {
        submitError.value = 'Ese horario ya no está disponible. Por favor elige otro.'
        goToStep(steps.value.indexOf('Fecha'))
      } else if (soldOut.length > 0) {
        const set = new Set(selectedProductIds.value)
        soldOut.forEach((p) => set.delete(p.id))
        selectedProductIds.value = set
        submitError.value = `Se agotó: ${soldOut.map((p) => p.name).join(', ')}. Lo quitamos de tu reserva.`
      } else {
        submitError.value = 'No se pudo guardar tu cita. Intenta de nuevo o escríbenos por WhatsApp.'
      }
      isSubmitting.value = false
      return
    }

    lastCreatedCitaId.value = citaRef.id
    isConfirmed.value = true

    const record: StoredBooking = {
      citaId: citaRef.id,
      customerName: customer.name.trim(),
      barberoName: barbero.name,
      serviceName: service.name,
      serviceDuration: service.duration,
      dateTimeISO: dateTime.toISOString(),
      time,
      total: total.value,
      status: 'pendiente',
    }
    writeStoredBooking(record)
    storedBooking.value = record
    isSubmitting.value = false
  }

  async function cancelBooking(citaId: string): Promise<boolean> {
    isCancelling.value = true
    try {
      const citaRef = doc(db, 'citas', citaId)
      const citaSnap = await getDoc(citaRef)
      if (!citaSnap.exists()) return false
      const cita = citaSnap.data() as {
        barberoId: string
        date: string
        time: string
        status: string
        productIds?: string[]
      }
      // Solo las citas nuevas (con productIds) descontaron stock al reservarse.
      const restock = stockDeltaForStatusChange(cita.status, 'cancelada') === 1 ? (cita.productIds ?? []) : []
      const slotRef = doc(db, 'disponibilidad', getSlotId(cita.barberoId, cita.date, cita.time))

      // Cancela la cita, devuelve el stock y libera el horario en el mismo
      // lote. Si falla (citas antiguas sin horario enlazado), se reintenta sin
      // el horario y, en último caso, solo la cita; el personal libera el
      // horario desde la agenda.
      const attempts = [
        { slot: true, stock: true },
        { slot: false, stock: true },
        { slot: false, stock: false },
      ]
      let lastError: unknown = null
      for (const attempt of attempts) {
        const batch = writeBatch(db)
        batch.update(citaRef, { status: 'cancelada' })
        if (attempt.slot) batch.update(slotRef, { status: 'cancelada' })
        if (attempt.stock) {
          for (const productId of restock) {
            batch.update(doc(db, 'productos', productId), { stock: increment(1), stockCitaId: citaId })
          }
        }
        try {
          await batch.commit()
          lastError = null
          break
        } catch (err) {
          lastError = err
        }
      }
      if (lastError) throw lastError

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
    steps,
    isLastStep,
    availableProducts,
    barberos,
    bookableBarberos,
    serviceCategories,
    isLoadingServices,
    selectedBarberoSchedule,
    products,
    selectedBarberoId,
    selectedServiceId,
    selectedDate,
    selectedTime,
    selectedProductIds,
    customer,
    acceptedPrivacy,
    isNameValid,
    isPhoneValid,
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
    fetchScheduleForBarbero,
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
