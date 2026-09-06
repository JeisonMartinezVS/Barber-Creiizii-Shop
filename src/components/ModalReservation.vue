<script setup lang="ts">
import { computed } from 'vue'
import { STEPS, useBookingStore } from '../stores/booking'

const store = useBookingStore()

const stepIcons: Record<string, string> = {
  Barbero: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><polyline points="17 11 19 13 23 9"/></svg>`,
  Servicio: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="6" cy="6" r="3"/><circle cx="6" cy="18" r="3"/><line x1="20" y1="4" x2="8.12" y2="15.88"/><line x1="14.47" y1="14.48" x2="20" y2="20"/><line x1="8.12" y1="8.12" x2="12" y2="12"/></svg>`,
  Fecha: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>`,
  Datos: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>`,
  Productos: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>`,
}

// Only the "Barbero" step has a real hint; the rest have nothing to validate yet.
const footerHint = computed(() => {
  if (store.currentStep === 'Barbero' && !store.selectedBarbero) {
    return 'Selecciona un barbero para continuar'
  }
  return ''
})

function initial(name: string) {
  return name.charAt(0).toUpperCase()
}
</script>

<template>
  <Teleport to="body">
    <div class="fixed inset-0 bg-black/70 z-50 flex items-center justify-center px-4">
      <div class="relative w-full max-w-lg">
        <div
          class="absolute inset-x-6 -top-px h-px bg-gradient-to-r from-transparent via-[#c9a24b] to-transparent"
        ></div>
        <div class="bg-[#0e0e0e] border border-white/10 rounded-2xl shadow-2xl overflow-hidden">
          <!-- Header -->
          <div class="flex items-start justify-between px-6 pt-5 pb-4 border-b border-white/10">
            <div>
              <h2 class="font-serif text-xl font-bold text-white">Reservar Cita</h2>
              <p class="text-xs text-[#c9a24b] mt-1">
                Paso {{ store.currentStepIndex + 1 }} de {{ STEPS.length }} — {{ store.currentStep }}
              </p>
            </div>
            <button
              type="button"
              class="w-8 h-8 rounded-full border border-white/10 flex items-center justify-center text-white/50 hover:text-white hover:border-white/30 transition"
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
          <div class="flex items-center justify-center gap-2 px-4 py-3 border-b border-white/10 overflow-x-auto">
            <template v-for="(step, index) in STEPS" :key="step">
              <div class="flex items-center gap-1.5 shrink-0">
                <span
                  class="w-6 h-6 rounded-full border flex items-center justify-center"
                  :class="
                    index === store.currentStepIndex
                      ? 'border-[#c9a24b] text-[#c9a24b]'
                      : 'border-white/15 text-white/30'
                  "
                  v-html="stepIcons[step]"
                ></span>
                <span
                  class="text-xs whitespace-nowrap"
                  :class="index === store.currentStepIndex ? 'text-[#c9a24b]' : 'text-white/30'"
                >
                  {{ step }}
                </span>
              </div>
              <span v-if="index < STEPS.length - 1" class="text-white/15 text-xs">›</span>
            </template>
          </div>

          <!-- Body -->
          <div class="px-6 py-5 max-h-[60vh] overflow-y-auto">
            <template v-if="store.currentStep === 'Barbero'">
              <p class="text-xs tracking-wide text-white/40 mb-3">ELIGE TU BARBERO</p>
              <div class="space-y-3">
                <button
                  v-for="barbero in store.barberos"
                  :key="barbero.id"
                  type="button"
                  class="w-full flex items-center justify-between px-4 py-3.5 rounded-xl border transition text-left"
                  :class="
                    store.selectedBarberoId === barbero.id
                      ? 'border-[#c9a24b]/60 bg-[#c9a24b]/5'
                      : 'border-white/10 hover:border-white/25'
                  "
                  @click="store.selectBarbero(barbero.id)"
                >
                  <div class="flex items-center gap-3">
                    <div
                      class="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold text-[#e2b95a] bg-gradient-to-b from-[#5a4420] to-[#3a2f12] border border-[#c9a24b]/30"
                    >
                      {{ initial(barbero.name) }}
                    </div>
                    <div>
                      <p class="text-sm font-semibold text-white">{{ barbero.name }}</p>
                      <p class="text-xs text-white/40">{{ barbero.role }}</p>
                    </div>
                  </div>
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                    class="text-white/30 shrink-0"
                  >
                    <polyline points="9 18 15 12 9 6" />
                  </svg>
                </button>
              </div>
            </template>

            <!-- TODO: swap these for the real designs as they come in. -->
            <template v-else>
              <div class="py-14 text-center">
                <p class="text-sm text-white/40">Este paso todavía se está construyendo.</p>
              </div>
            </template>
          </div>

          <!-- Footer -->
          <div class="flex items-center justify-between px-6 py-4 border-t border-white/10">
            <button
              v-if="store.currentStepIndex > 0"
              type="button"
              class="text-sm text-white/50 hover:text-white transition"
              @click="store.goToStep(store.currentStepIndex - 1)"
            >
              ← Atrás
            </button>
            <span v-else></span>

            <p v-if="footerHint" class="text-xs text-white/40">{{ footerHint }}</p>
            <button
              v-else-if="store.currentStepIndex < STEPS.length - 1"
              type="button"
              class="bg-gradient-to-b from-[#b6903f] to-[#8f7130] hover:from-[#c39c47] hover:to-[#9c7c37] text-[#1a1408] font-semibold text-sm rounded-lg px-4 py-2 transition"
              @click="store.goToStep(store.currentStepIndex + 1)"
            >
              Continuar
            </button>
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>