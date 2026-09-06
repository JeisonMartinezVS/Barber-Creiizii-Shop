<script lang="ts">
import { defineComponent, getCurrentInstance, computed } from 'vue'
import { useBookingStore } from '../stores/booking'

export default defineComponent({
  setup() {
    const { proxy } = getCurrentInstance() as any

    // accedemos al plugin global
    const config = computed(() => proxy.$config)
    const bookingStore = useBookingStore()

    return {
      config,
      bookingStore,
    }
  },
})
</script>

<template>
  <div class="relative mt-8 w-full max-w-11/12 mx-auto text-center py-8 px-6 overflow-hidden">
    <div class="absolute left-0 top-0 w-10 h-10 border-l border-t border-primary opacity-40"></div>
    <div class="absolute right-0 top-0 w-10 h-10 border-r border-t border-primary opacity-40"></div>
    <div
      class="absolute left-0 bottom-0 w-10 h-10 border-l border-b border-primary opacity-40"
    ></div>
    <div
      class="absolute right-0 bottom-0 w-10 h-10 border-r border-b border-primary opacity-40"
    ></div>

    <div class="relative z-10 flex flex-col items-center justify-center gap-3">
      <img src="../../public/logo.jpg" alt="Barber Creiizii Shop" class="h-64 md:h-80 object-contain" />

      <p class="flex items-center gap-3 text-xs tracking-[0.3em] text-[#c9a24b] mt-2">
        <span class="w-8 h-px bg-[#c9a24b]/50"></span>
        MEDELLÍN, COLOMBIA
        <span class="w-8 h-px bg-[#c9a24b]/50"></span>
      </p>

      <h1 class="font-serif italic font-black text-white text-5xl md:text-6xl leading-none">
        {{ config?.Titulo ?? 'Creiizii' }}
      </h1>
      <p class="text-[#c9a24b] tracking-[0.3em] text-sm md:text-base font-semibold">BARBER SHOP</p>

      <p class="text-gray-300 max-w-xl mt-2">
        Cada corte es una obra de arte. Tradición artesanal al servicio de tu imagen.
      </p>

      <button
        type="button"
        class="flex items-center gap-2 bg-gradient-to-b from-[#b6903f] to-[#8f7130] hover:from-[#c39c47] hover:to-[#9c7c37] text-[#1a1408] font-semibold rounded-lg px-6 py-3 mt-4 transition"
        @click="bookingStore.open"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <rect x="3" y="4" width="18" height="18" rx="2" />
          <path d="M16 2v4M8 2v4M3 10h18" />
        </svg>
        Reservar Cita Ahora
      </button>
      <p class="text-xs text-white/30">Sin esperas — elige tu horario en segundos</p>
    </div>
  </div>
</template>