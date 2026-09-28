<script setup lang="ts">
import { computed, defineAsyncComponent } from 'vue'
import { useRoute } from 'vue-router'

import Header from './components/Header.vue'
import ActiveBookingBanner from './components/ActiveBookingBanner.vue'

// Carga diferida: el footer queda al final de la página y el modal de
// reservas solo se descarga cuando alguien lo abre.
const Footer = defineAsyncComponent(() => import('./components/Footer.vue'))
const ModalReservation = defineAsyncComponent(() => import('./components/ModalReservation.vue'))
import { useBookingStore } from './stores/booking'

const route = useRoute()
const bookingStore = useBookingStore()

const isAdminRoute = computed(() => route.meta.layout === 'admin')
</script>

<template>
  <template v-if="!isAdminRoute">
    <Header />

    <main class="pt-16">
      <ActiveBookingBanner />
      <router-view />
    </main>

    <Footer />

    <!-- Global para que el botón "Reservar" del Header funcione en cualquier página pública,
         no solo mientras el Hero está montado. -->
    <ModalReservation v-if="bookingStore.isOpen" />
  </template>

  <template v-else>
    <router-view />
  </template>
</template>
