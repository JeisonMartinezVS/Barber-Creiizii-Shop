<script setup lang="ts">
import { computed } from 'vue'
import { formatCOP, STEPS, useBookingStore } from '../stores/booking'

const store = useBookingStore()

const stepIcons: Record<string, string> = {
  Barbero: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><polyline points="17 11 19 13 23 9"/></svg>`,
  Servicio: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="6" cy="6" r="3"/><circle cx="6" cy="18" r="3"/><line x1="20" y1="4" x2="8.12" y2="15.88"/><line x1="14.47" y1="14.48" x2="20" y2="20"/><line x1="8.12" y1="8.12" x2="12" y2="12"/></svg>`,
  Fecha: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>`,
  Datos: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>`,
  Productos: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z"/><path d="M3 6h18"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>`,
}
const checkIcon = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg>`

const DAY_ABBREV = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']
const MONTHS = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
]

const days = computed(() => {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return Array.from({ length: 14 }, (_, i) => {
    const d = new Date(today)
    d.setDate(today.getDate() + i)
    return d
  })
})

function isSameDay(a: Date, b: Date) {
  return a.toDateString() === b.toDateString()
}

const timeSlots = computed(() => {
  const slots: string[] = []
  for (let minutes = 10 * 60; minutes <= 20 * 60 + 30; minutes += 30) {
    const h = Math.floor(minutes / 60)
    const m = minutes % 60
    slots.push(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`)
  }
  return slots
})

const fechaLarga = computed(() => {
  if (!store.selectedDate) return ''
  const d = store.selectedDate
  const weekday = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'][d.getDay()]
  return `${weekday}, ${d.getDate()} De ${MONTHS[d.getMonth()]} De ${d.getFullYear()}`
})

// Only steps with something to validate show a hint/blocking state; the
// rest (Barbero/Servicio) auto-advance the instant something is picked.
const footerHint = computed(() => {
  if (store.currentStep === 'Barbero' && !store.selectedBarbero) return 'Selecciona un barbero para continuar'
  if (store.currentStep === 'Servicio' && !store.selectedService) return 'Selecciona un servicio para continuar'
  return ''
})

function initial(name: string) {
  return name.charAt(0).toUpperCase()
}
</script>

<template>
  <Teleport to="body">
    <div class="fixed inset-0 bg-black/70 z-50 flex items-center justify-center px-4 py-8">
      <div class="relative w-full max-w-lg">
        <div
          class="absolute inset-x-6 -top-px h-px bg-gradient-to-r from-transparent via-primary to-transparent"
        ></div>
        <div class="bg-[#0e0e0e] border border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
          <!-- Header -->
          <div class="flex items-start justify-between px-6 pt-5 pb-4 border-b border-white/10 shrink-0">
            <div>
              <h2 class="font-serif text-xl font-bold text-white">Reservar Cita</h2>
              <p v-if="!store.isConfirmed" class="text-xs text-primary mt-1">
                Paso {{ store.currentStepIndex + 1 }} de {{ STEPS.length }} — {{ store.currentStep }}
              </p>
            </div>
            <button
              type="button"
              class="w-8 h-8 rounded-full border border-white/10 flex items-center justify-center text-white/50 hover:text-white hover:border-white/30 transition shrink-0"
              aria-label="Cerrar"
              @click="store.close"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>

          <!-- Step breadcrumb -->
          <div
            v-if="!store.isConfirmed"
            class="flex items-center justify-center gap-2 px-4 py-3 border-b border-white/10 overflow-x-auto shrink-0"
          >
            <template v-for="(step, index) in STEPS" :key="step">
              <button
                type="button"
                class="flex items-center gap-1.5 shrink-0"
                :disabled="index > store.currentStepIndex"
                @click="index < store.currentStepIndex ? store.goToStep(index) : null"
              >
                <span
                  class="w-6 h-6 rounded-full border flex items-center justify-center"
                  :class="
                    index < store.currentStepIndex
                      ? 'bg-primary border-primary text-[#1a1408]'
                      : index === store.currentStepIndex
                        ? 'border-primary text-primary'
                        : 'border-white/15 text-white/30'
                  "
                  v-html="index < store.currentStepIndex ? checkIcon : stepIcons[step]"
                ></span>
                <span
                  class="text-xs whitespace-nowrap hidden sm:block"
                  :class="index === store.currentStepIndex ? 'text-primary' : index < store.currentStepIndex ? 'text-white/60' : 'text-white/30'"
                >
                  {{ step }}
                </span>
              </button>
              <span v-if="index < STEPS.length - 1" class="text-white/15 text-xs">›</span>
            </template>
          </div>

          <!-- Body -->
          <div class="px-6 py-5 overflow-y-auto grow">
            <!-- Success screen -->
            <div v-if="store.isConfirmed" class="py-10 text-center">
              <div class="w-14 h-14 mx-auto mb-4 rounded-full bg-primary/10 border border-primary/30 flex items-center justify-center text-primary">
                <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </div>
              <h3 class="font-serif text-lg font-bold text-white mb-1">¡Cita reservada!</h3>
              <p class="text-sm text-white/50 mb-6">
                Te esperamos {{ fechaLarga }} a las {{ store.selectedTime }} con {{ store.selectedBarbero?.name }}.
              </p>
              <button
                type="button"
                class="bg-gradient-to-b from-[#b6903f] to-[#8f7130] hover:from-[#c39c47] hover:to-[#9c7c37] text-[#1a1408] font-semibold text-sm rounded-lg px-6 py-2.5 transition"
                @click="store.close"
              >
                Cerrar
              </button>
            </div>

            <!-- Step 1: Barbero -->
            <template v-else-if="store.currentStep === 'Barbero'">
              <p class="text-xs tracking-wide text-white/40 mb-3">ELIGE TU BARBERO</p>
              <div class="space-y-3">
                <button
                  v-for="barbero in store.barberos"
                  :key="barbero.id"
                  type="button"
                  class="w-full flex items-center justify-between px-4 py-3.5 rounded-xl border transition text-left"
                  :class="
                    store.selectedBarberoId === barbero.id
                      ? 'border-primary/60 bg-primary/5'
                      : 'border-white/10 hover:border-white/25'
                  "
                  @click="store.selectBarbero(barbero.id)"
                >
                  <div class="flex items-center gap-3">
                    <div class="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold text-[#e2b95a] bg-gradient-to-b from-[#5a4420] to-[#3a2f12] border border-primary/30">
                      {{ initial(barbero.name) }}
                    </div>
                    <div>
                      <p class="text-sm font-semibold text-white">{{ barbero.name }}</p>
                      <p class="text-xs text-white/40">{{ barbero.role }}</p>
                    </div>
                  </div>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="text-white/30 shrink-0">
                    <polyline points="9 18 15 12 9 6" />
                  </svg>
                </button>
              </div>
            </template>

            <!-- Step 2: Servicio -->
            <template v-else-if="store.currentStep === 'Servicio'">
              <div
                v-if="store.selectedBarbero"
                class="flex items-center justify-between px-4 py-3 rounded-xl border border-white/10 mb-5"
              >
                <div class="flex items-center gap-3">
                  <div class="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold text-[#e2b95a] bg-gradient-to-b from-[#5a4420] to-[#3a2f12] border border-primary/30">
                    {{ initial(store.selectedBarbero.name) }}
                  </div>
                  <p class="text-sm font-semibold text-white">{{ store.selectedBarbero.name }}</p>
                </div>
                <button type="button" class="text-xs font-semibold text-primary hover:underline" @click="store.goToStep(0)">
                  Cambiar
                </button>
              </div>

              <div v-for="category in store.serviceCategories" :key="category.id" class="mb-6 last:mb-0">
                <p class="flex items-center gap-3 text-xs tracking-widest text-primary mb-3">
                  <span class="w-6 h-px bg-primary/40"></span>
                  {{ category.title.toUpperCase() }}
                  <span class="flex-1 h-px bg-primary/40"></span>
                </p>
                <div class="space-y-3">
                  <button
                    v-for="item in category.items"
                    :key="item.id"
                    type="button"
                    class="w-full flex items-center justify-between px-4 py-3.5 rounded-xl border transition text-left"
                    :class="
                      store.selectedServiceId === item.id
                        ? 'border-primary/60 bg-primary/5'
                        : 'border-white/10 hover:border-white/25'
                    "
                    @click="store.selectService(item.id)"
                  >
                    <div>
                      <p class="text-sm font-semibold text-white">{{ item.name }}</p>
                      <p class="text-xs text-white/40">{{ item.description }}</p>
                    </div>
                    <div class="text-right shrink-0 ml-4">
                      <p class="text-sm font-bold text-primary">{{ formatCOP(item.price) }}</p>
                      <p class="text-xs text-white/40">{{ item.duration }}</p>
                    </div>
                  </button>
                </div>
              </div>
            </template>

            <!-- Step 3: Fecha -->
            <template v-else-if="store.currentStep === 'Fecha'">
              <div
                v-if="store.selectedService"
                class="flex items-center justify-between px-4 py-3 rounded-xl border border-white/10 mb-6"
              >
                <p class="text-sm font-semibold text-white">
                  {{ store.selectedService.name }} — {{ store.selectedService.duration }}
                </p>
                <p class="text-sm font-bold text-primary">{{ formatCOP(store.selectedService.price) }}</p>
              </div>

              <p class="text-xs tracking-wide text-white/40 mb-3">ELIGE UN DÍA</p>
              <div class="grid grid-cols-7 gap-2 mb-6">
                <button
                  v-for="day in days"
                  :key="day.toISOString()"
                  type="button"
                  class="flex flex-col items-center justify-center rounded-lg border py-2.5 transition"
                  :class="
                    store.selectedDate && isSameDay(store.selectedDate, day)
                      ? 'bg-gradient-to-b from-[#b6903f] to-[#8f7130] border-transparent text-[#1a1408]'
                      : 'border-white/10 text-white/70 hover:border-white/25'
                  "
                  @click="store.selectDate(day)"
                >
                  <span class="text-xs">{{ DAY_ABBREV[day.getDay()] }}</span>
                  <span class="text-sm font-semibold">{{ day.getDate() }}</span>
                </button>
              </div>

              <p class="text-xs tracking-wide text-white/40 mb-3">HORARIOS DISPONIBLES</p>
              <div class="grid grid-cols-3 sm:grid-cols-6 gap-2">
                <button
                  v-for="slot in timeSlots"
                  :key="slot"
                  type="button"
                  class="rounded-lg border py-2 text-sm transition"
                  :class="
                    store.selectedTime === slot
                      ? 'bg-gradient-to-b from-[#b6903f] to-[#8f7130] border-transparent text-[#1a1408] font-semibold'
                      : 'border-white/10 text-white/70 hover:border-white/25'
                  "
                  @click="store.selectTime(slot)"
                >
                  {{ slot }}
                </button>
              </div>
            </template>

            <!-- Step 4: Datos -->
            <template v-else-if="store.currentStep === 'Datos'">
              <div class="border border-white/10 rounded-xl p-4 mb-6">
                <p class="text-xs tracking-wide text-primary mb-3">RESUMEN</p>
                <div class="grid grid-cols-2 gap-4">
                  <div>
                    <p class="text-xs text-white/40 mb-0.5">Barbero</p>
                    <p class="text-sm font-semibold text-white">{{ store.selectedBarbero?.name }}</p>
                  </div>
                  <div>
                    <p class="text-xs text-white/40 mb-0.5">Servicio</p>
                    <p class="text-sm font-semibold text-white">{{ store.selectedService?.name }}</p>
                  </div>
                  <div>
                    <p class="text-xs text-white/40 mb-0.5">Fecha</p>
                    <p class="text-sm font-semibold text-white">{{ fechaLarga }}</p>
                  </div>
                  <div>
                    <p class="text-xs text-white/40 mb-0.5">Hora</p>
                    <p class="text-sm font-semibold text-white">{{ store.selectedTime }}</p>
                  </div>
                </div>
              </div>

              <div class="space-y-4">
                <div>
                  <label class="block text-xs tracking-wide text-white/40 mb-2">
                    NOMBRE COMPLETO <span class="text-primary">*</span>
                  </label>
                  <input
                    v-model="store.customer.name"
                    type="text"
                    placeholder="Tu nombre completo"
                    class="w-full bg-[#151515] border border-white/10 rounded-lg px-4 py-2.5 text-sm text-white placeholder-white/30 focus:outline-none focus:border-primary/50"
                  />
                </div>
                <div>
                  <label class="block text-xs tracking-wide text-white/40 mb-2">
                    TELÉFONO / WHATSAPP <span class="text-primary">*</span>
                  </label>
                  <input
                    v-model="store.customer.phone"
                    type="tel"
                    placeholder="+57 300 000 0000"
                    class="w-full bg-[#151515] border border-white/10 rounded-lg px-4 py-2.5 text-sm text-white placeholder-white/30 focus:outline-none focus:border-primary/50"
                  />
                </div>
                <div>
                  <label class="block text-xs tracking-wide text-white/40 mb-2">CORREO (OPCIONAL)</label>
                  <input
                    v-model="store.customer.email"
                    type="email"
                    placeholder="tu@email.com"
                    class="w-full bg-[#151515] border border-white/10 rounded-lg px-4 py-2.5 text-sm text-white placeholder-white/30 focus:outline-none focus:border-primary/50"
                  />
                </div>
                <div>
                  <label class="block text-xs tracking-wide text-white/40 mb-2">NOTAS (OPCIONAL)</label>
                  <textarea
                    v-model="store.customer.notes"
                    rows="3"
                    placeholder="Alguna indicación especial..."
                    class="w-full bg-[#151515] border border-white/10 rounded-lg px-4 py-2.5 text-sm text-white placeholder-white/30 focus:outline-none focus:border-primary/50 resize-none"
                  ></textarea>
                </div>
              </div>
            </template>

            <!-- Step 5: Productos -->
            <template v-else-if="store.currentStep === 'Productos'">
              <div class="flex items-center gap-3 mb-4">
                <span class="w-9 h-9 rounded-lg bg-primary/10 border border-primary/30 flex items-center justify-center text-primary shrink-0">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z" />
                    <path d="M3 6h18" />
                    <path d="M16 10a4 4 0 0 1-8 0" />
                  </svg>
                </span>
                <div>
                  <p class="text-sm font-semibold text-white">Lleva algo para casa</p>
                  <p class="text-xs text-white/40">Agrega productos para mantener tu estilo</p>
                </div>
              </div>

              <div class="space-y-3 mb-6">
                <button
                  v-for="product in store.products"
                  :key="product.id"
                  type="button"
                  class="w-full flex items-center justify-between px-4 py-3.5 rounded-xl border transition text-left"
                  :class="
                    store.selectedProductIds.has(product.id)
                      ? 'border-primary/60 bg-primary/5'
                      : 'border-white/10 hover:border-white/25'
                  "
                  @click="store.toggleProduct(product.id)"
                >
                  <div class="flex items-center gap-3">
                    <span class="w-9 h-9 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shrink-0">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" />
                        <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
                        <line x1="12" y1="22.08" x2="12" y2="12" />
                      </svg>
                    </span>
                    <div>
                      <p class="text-sm font-semibold text-white">{{ product.name }}</p>
                      <p class="text-xs text-white/40">{{ product.brand }}</p>
                    </div>
                  </div>
                  <div class="flex items-center gap-3 shrink-0 ml-4">
                    <p class="text-sm font-bold text-primary">{{ formatCOP(product.price) }}</p>
                    <span
                      class="w-7 h-7 rounded-md flex items-center justify-center border"
                      :class="
                        store.selectedProductIds.has(product.id)
                          ? 'bg-gradient-to-b from-[#b6903f] to-[#8f7130] border-transparent text-[#1a1408]'
                          : 'border-white/15 text-white/40'
                      "
                    >
                      <svg v-if="store.selectedProductIds.has(product.id)" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                      <svg v-else width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <line x1="12" y1="5" x2="12" y2="19" />
                        <line x1="5" y1="12" x2="19" y2="12" />
                      </svg>
                    </span>
                  </div>
                </button>
              </div>

              <div class="border border-white/10 rounded-xl p-4">
                <p class="text-xs tracking-wide text-white/40 mb-3">RESUMEN DEL PEDIDO</p>
                <div class="space-y-1.5 mb-3">
                  <div v-if="store.selectedService" class="flex items-center justify-between text-sm">
                    <span class="text-white/70">{{ store.selectedService.name }}</span>
                    <span class="text-white/90">{{ formatCOP(store.selectedService.price) }}</span>
                  </div>
                  <div v-for="product in store.selectedProducts" :key="product.id" class="flex items-center justify-between text-sm">
                    <span class="text-white/70">{{ product.name }} x1</span>
                    <span class="text-white/90">{{ formatCOP(product.price) }}</span>
                  </div>
                </div>
                <div class="flex items-center justify-between pt-3 border-t border-white/10">
                  <span class="text-sm font-bold text-white">Total</span>
                  <span class="text-lg font-bold text-primary">{{ formatCOP(store.total) }}</span>
                </div>
              </div>
            </template>
          </div>

          <!-- Footer -->
          <div v-if="!store.isConfirmed" class="flex items-center justify-between px-6 py-4 border-t border-white/10 shrink-0">
            <button
              v-if="store.currentStepIndex > 0"
              type="button"
              class="flex items-center gap-1 text-sm text-white/50 hover:text-white transition"
              @click="store.back"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="15 18 9 12 15 6" /></svg>
              Anterior
            </button>
            <span v-else></span>

            <p v-if="footerHint" class="text-xs text-white/40">{{ footerHint }}</p>

            <button
              v-else-if="store.currentStep === 'Fecha'"
              type="button"
              :disabled="!store.isFechaValid"
              class="flex items-center gap-1 bg-gradient-to-b from-[#b6903f] to-[#8f7130] hover:from-[#c39c47] hover:to-[#9c7c37] disabled:opacity-40 disabled:cursor-not-allowed text-[#1a1408] font-semibold text-sm rounded-lg px-4 py-2 transition"
              @click="store.next"
            >
              Continuar
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6" /></svg>
            </button>

            <button
              v-else-if="store.currentStep === 'Datos'"
              type="button"
              :disabled="!store.isDatosValid"
              class="flex items-center gap-1 bg-gradient-to-b from-[#b6903f] to-[#8f7130] hover:from-[#c39c47] hover:to-[#9c7c37] disabled:opacity-40 disabled:cursor-not-allowed text-[#1a1408] font-semibold text-sm rounded-lg px-4 py-2 transition"
              @click="store.next"
            >
              Continuar
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6" /></svg>
            </button>

            <button
              v-else-if="store.currentStep === 'Productos'"
              type="button"
              class="flex items-center gap-1.5 bg-gradient-to-b from-[#b6903f] to-[#8f7130] hover:from-[#c39c47] hover:to-[#9c7c37] text-[#1a1408] font-semibold text-sm rounded-lg px-4 py-2 transition"
              @click="store.confirmBooking"
            >
              Confirmar — {{ formatCOP(store.total) }}
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12" /></svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>
