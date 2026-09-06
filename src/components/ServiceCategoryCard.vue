<script setup lang="ts">
import { useBookingStore } from '../stores/booking'

export interface ServiceItem {
  name: string
  duration: string
  price: string
}

defineProps<{
  title: string
  icon: string
  items: ServiceItem[]
}>()

const bookingStore = useBookingStore()
</script>

<template>
  <div class="bg-[#0e0e0e] border border-white/10 rounded-xl overflow-hidden flex flex-col">
    <div class="flex items-center gap-3 px-6 py-5 border-b border-white/10">
      <span
        class="w-9 h-9 shrink-0 rounded-lg bg-[#3a2f12] border border-[#c9a24b]/30 flex items-center justify-center text-[#c9a24b]"
        v-html="icon"
      ></span>
      <h3 class="font-serif font-bold text-white text-lg">{{ title }}</h3>
    </div>

    <div class="px-6">
      <div
        v-for="item in items"
        :key="item.name"
        class="flex items-center justify-between py-4 border-b border-white/5 last:border-b-0"
      >
        <div>
          <p class="text-sm text-white">{{ item.name }}</p>
          <p class="text-xs text-white/40">{{ item.duration }}</p>
        </div>
        <p class="text-sm font-bold text-[#c9a24b] shrink-0 ml-4">{{ item.price }}</p>
      </div>
    </div>

    <div class="px-6 pt-4 pb-6">
      <button
        type="button"
        class="w-full border border-[#c9a24b]/40 text-[#c9a24b] hover:bg-[#c9a24b]/10 text-xs font-bold tracking-wide rounded-lg py-3 transition"
        @click="bookingStore.open"
      >
        RESERVAR CITA
      </button>
    </div>
  </div>
</template>