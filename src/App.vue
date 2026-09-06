<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'

import Header from './components/Header.vue'
import Footer from './components/Footer.vue'
import ModalReservation from './components/ModalReservation.vue'
import { useBookingStore } from './stores/booking'

const route = useRoute()
const bookingStore = useBookingStore()

const isAdminRoute = computed(() => route.meta.layout === 'admin')
</script>

<template>
  <template v-if="!isAdminRoute">
    <Header />

    <main class="pt-16">
      <router-view />
    </main>

    <Footer />

    <!-- Global so Header's "Reservar" button works from any public page,
         not just while Hero is mounted. -->
    <ModalReservation v-if="bookingStore.isOpen" />
  </template>

  <template v-else>
    <router-view />
  </template>
</template>