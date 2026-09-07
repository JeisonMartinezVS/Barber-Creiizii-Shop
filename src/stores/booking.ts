import { defineStore } from 'pinia'
import { computed, reactive, ref } from 'vue'

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
const BARBEROS: Barbero[] = [
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

export const useBookingStore = defineStore('booking', () => {
  const isOpen = ref(false)
  const isConfirmed = ref(false)
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

  const currentStep = computed<StepName>(
    () => STEPS[currentStepIndex.value] ?? STEPS[0],
  )

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

  function open() {
    reset()
    isOpen.value = true
  }
  function close() {
    isOpen.value = false
  }
  function reset() {
    currentStepIndex.value = 0
    isConfirmed.value = false
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

  function confirmBooking() {
    // TODO: write this to Firestore as a new "citas" doc — that's what will
    // make it show up in the admin panel's Agenda instead of just flipping
    // this local flag.
    isConfirmed.value = true
  }

  return {
    isOpen,
    isConfirmed,
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
    selectedBarbero,
    allServices,
    selectedService,
    selectedProducts,
    total,
    isFechaValid,
    isDatosValid,
    open,
    close,
    reset,
    goToStep,
    next,
    back,
    selectBarbero,
    selectService,
    selectDate,
    selectTime,
    toggleProduct,
    confirmBooking,
  }
})
