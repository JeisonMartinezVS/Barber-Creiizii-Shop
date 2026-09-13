<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useBookingStore } from '../stores/booking'

const store = useBookingStore()

onMounted(() => {
  store.refreshStoredBooking()
})

const label = computed(() => {
  const booking = store.storedBooking
  if (!booking) return ''
  const d = new Date(booking.dateTimeISO)
  const weekday = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'][d.getDay()]
  return `${weekday} ${d.getDate()}, ${booking.time}`
})
</script>

<template>
  <div
    v-if="store.storedBooking"
    class="bg-[#151515] border-b border-primary/20 px-4 py-2 flex items-center justify-center gap-3 text-xs sm:text-sm"
  >
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="text-primary shrink-0">
      <rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" />
    </svg>
    <span class="text-white/70 truncate">
      Tienes una cita agendada —
      <span class="text-primary font-semibold">{{ label }}</span>
    </span>
    <button type="button" class="text-primary font-semibold hover:underline shrink-0" @click="store.open()">
      Ver cita
    </button>
  </div>
</template>
