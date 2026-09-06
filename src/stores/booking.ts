import { defineStore } from 'pinia'
import { computed, ref } from 'vue'

export interface Barbero {
  id: string
  name: string
  role: string
}

// TODO: replace with real barberos fetched from Firestore — this mirrors the
// same three staff accounts set up in the admin panel (Empleados).
const BARBEROS: Barbero[] = [
  { id: 'admin', name: 'Administrador', role: 'Propietario' },
  { id: 'yeison', name: 'Yeison Creiizii', role: 'Barbero' },
  { id: 'camilo', name: 'Camilo Estilo', role: 'Barbero' },
]

export const STEPS = ['Barbero', 'Servicio', 'Fecha', 'Datos', 'Productos'] as const
export type StepName = (typeof STEPS)[number]

export const useBookingStore = defineStore('booking', () => {
  const isOpen = ref(false)
  const currentStepIndex = ref(0)
  const barberos = ref<Barbero[]>(BARBEROS)
  const selectedBarberoId = ref<string | null>(null)

  const currentStep = computed<StepName>(() => STEPS[currentStepIndex.value])
  const selectedBarbero = computed(
    () => barberos.value.find((b) => b.id === selectedBarberoId.value) ?? null,
  )

  function open() {
    currentStepIndex.value = 0
    isOpen.value = true
  }

  function close() {
    isOpen.value = false
  }

  function selectBarbero(id: string) {
    selectedBarberoId.value = id
    // Auto-advance once a barbero is picked — jumps into whichever step
    // comes next, even the placeholder ones, so the wizard shell is testable
    // end to end before every step has its real design.
    if (currentStepIndex.value < STEPS.length - 1) {
      currentStepIndex.value += 1
    }
  }

  function goToStep(index: number) {
    if (index >= 0 && index < STEPS.length) {
      currentStepIndex.value = index
    }
  }

  return {
    isOpen,
    currentStepIndex,
    currentStep,
    barberos,
    selectedBarberoId,
    selectedBarbero,
    open,
    close,
    selectBarbero,
    goToStep,
  }
})