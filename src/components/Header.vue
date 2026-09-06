<script lang="ts">
import Whatsapp from '../../public/icons/Whatsapp.vue'
import Instagram from '../../public/icons/Instagram.vue'
import { defineComponent, getCurrentInstance, computed } from 'vue'
import { useBookingStore } from '../stores/booking'

export default defineComponent({
  components: {
    Whatsapp,
    Instagram,
  },
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
  <header
    class="fixed top-0 left-0 w-full bg-background text-neutral-50 border-b border-neutral-800 p-4 z-50"
  >
    <div class="flex justify-between items-center max-w-10/12 mx-auto">
      <!-- Logo -->
      <router-link to="/" class="font-serif italic font-black text-2xl text-white tracking-wide">
        Creiizii
      </router-link>

      <!-- Menu -->
      <div class="hidden md:flex justify-center items-center gap-6">
        <router-link
          v-for="value in config?.menu"
          :key="value.name"
          :to="value.link"
          class="text-sm font-semibold text-white/80 hover:text-[#c9a24b] transition"
          >{{ value.name }}</router-link
        >
      </div>

      <!-- Redes + Reservar -->
      <div class="flex items-center gap-2">
        <a
          href="#"
          class="w-9 h-9 rounded-md bg-white/5 border border-white/10 flex items-center justify-center text-white/70 hover:text-white hover:border-white/25 transition"
          aria-label="WhatsApp"
        >
          <Whatsapp class="w-4 h-4" />
        </a>
        <a
          href="#"
          class="w-9 h-9 rounded-md bg-white/5 border border-white/10 flex items-center justify-center text-white/70 hover:text-white hover:border-white/25 transition"
          aria-label="Instagram"
        >
          <Instagram class="w-4 h-4" />
        </a>
        <button
          type="button"
          class="flex items-center gap-2 bg-gradient-to-b from-[#b6903f] to-[#8f7130] hover:from-[#c39c47] hover:to-[#9c7c37] text-[#1a1408] font-semibold text-sm rounded-lg px-4 py-2 transition"
          @click="bookingStore.open"
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="3" y="4" width="18" height="18" rx="2" />
            <path d="M16 2v4M8 2v4M3 10h18" />
          </svg>
          Reservar
        </button>
      </div>
    </div>
  </header>
</template>