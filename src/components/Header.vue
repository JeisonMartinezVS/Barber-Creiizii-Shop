<script lang="ts">
import Whatsapp from '../../public/icons/Whatsapp.vue'
import Instagram from '../../public/icons/Instagram.vue'
import { defineComponent, getCurrentInstance, computed, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
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
    const route = useRoute()

    const mobileMenuOpen = ref(false)

    function toggleMobileMenu() {
      mobileMenuOpen.value = !mobileMenuOpen.value
    }
    function closeMobileMenu() {
      mobileMenuOpen.value = false
    }
    function openReservationFromMobile() {
      closeMobileMenu()
      bookingStore.open()
    }

    // Close the panel automatically if the route changes (nav link clicked).
    watch(
      () => route.fullPath,
      () => closeMobileMenu(),
    )

    return {
      config,
      bookingStore,
      mobileMenuOpen,
      toggleMobileMenu,
      closeMobileMenu,
      openReservationFromMobile,
    }
  },
})
</script>

<template>
  <header
    class="fixed top-0 left-0 w-full bg-background text-neutral-50 border-b border-neutral-800 z-50"
  >
    <div class="flex justify-between items-center max-w-10/12 mx-auto p-4">
      <!-- Logo -->
      <router-link to="/" class="font-gothic text-2xl text-white" @click="closeMobileMenu">
        Creiizii
      </router-link>

      <!-- Menu (desktop) -->
      <div class="hidden md:flex justify-center items-center gap-6">
        <router-link
          v-for="value in config?.menu"
          :key="value.name"
          :to="value.link"
          class="text-sm font-semibold text-white/80 hover:text-[#c9a24b] transition"
          >{{ value.name }}</router-link
        >
      </div>

      <!-- Redes + Reservar (desktop) -->
      <div class="hidden md:flex items-center gap-2">
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

      <!-- Hamburger (mobile only) -->
      <button
        type="button"
        class="md:hidden w-9 h-9 flex items-center justify-center text-white"
        :aria-label="mobileMenuOpen ? 'Cerrar menú' : 'Abrir menú'"
        @click="toggleMobileMenu"
      >
        <svg v-if="!mobileMenuOpen" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="3" y1="6" x2="21" y2="6" />
          <line x1="3" y1="12" x2="21" y2="12" />
          <line x1="3" y1="18" x2="21" y2="18" />
        </svg>
        <svg v-else width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </button>
    </div>

    <!-- Mobile menu panel -->
    <div v-if="mobileMenuOpen" class="md:hidden border-t border-neutral-800 bg-background px-6 pt-4 pb-8">
      <nav class="flex flex-col gap-1">
        <router-link
          v-for="value in config?.menu"
          :key="value.name"
          :to="value.link"
          class="py-3 text-base text-white/90 hover:text-[#c9a24b] transition border-b border-white/5"
          >{{ value.name }}</router-link
        >
      </nav>

      <div class="grid grid-cols-2 gap-3 mt-6">
        <a
          href="#"
          class="flex items-center justify-center gap-2 border border-green-500/40 text-green-400 rounded-lg py-2.5 text-sm font-semibold hover:bg-green-500/10 transition"
        >
          <Whatsapp class="w-4 h-4" />
          WhatsApp
        </a>
        <a
          href="#"
          class="flex items-center justify-center gap-2 border border-pink-500/40 text-pink-400 rounded-lg py-2.5 text-sm font-semibold hover:bg-pink-500/10 transition"
        >
          <Instagram class="w-4 h-4" />
          Instagram
        </a>
      </div>

      <button
        type="button"
        class="w-full flex items-center justify-center gap-2 bg-gradient-to-b from-[#b6903f] to-[#8f7130] hover:from-[#c39c47] hover:to-[#9c7c37] text-[#1a1408] font-semibold text-sm rounded-lg py-3 mt-4 transition"
        @click="openReservationFromMobile"
      >
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <rect x="3" y="4" width="18" height="18" rx="2" />
          <path d="M16 2v4M8 2v4M3 10h18" />
        </svg>
        Reservar Cita
      </button>
    </div>
  </header>
</template>