<script setup lang="ts">
import { ref } from 'vue'
import { useBookingStore } from '../stores/booking'

export interface ServiceItem {
  name: string
  description: string
  duration: string
  price: string
}

defineProps<{
  title: string
  icon: string
  items: ServiceItem[]
}>()

const bookingStore = useBookingStore()

// Las descripciones largas se muestran recortadas hasta que se pide "Ver más".
const expanded = ref<Set<string>>(new Set())
function toggleExpanded(name: string) {
  const next = new Set(expanded.value)
  if (next.has(name)) next.delete(name)
  else next.add(name)
  expanded.value = next
}
</script>

<template>
  <div class="bg-[#0e0e0e] border border-white/10 rounded-xl overflow-hidden flex flex-col">
    <div class="flex items-center gap-3 px-6 py-5 border-b border-white/10">
      <span
        class="w-9 h-9 shrink-0 rounded-lg bg-[#0f2140] border border-[#4a8fe7]/30 flex items-center justify-center text-[#4a8fe7]"
        v-html="icon"
      ></span>
      <h3 class="font-serif font-bold text-white text-lg">{{ title }}</h3>
    </div>

    <div class="px-6 grow">
      <div
        v-for="item in items"
        :key="item.name"
        class="py-4 border-b border-white/5 last:border-b-0"
      >
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm text-white">{{ item.name }}</p>
            <p class="text-xs text-white/40">{{ item.duration }}</p>
          </div>
          <p class="text-sm font-bold text-[#4a8fe7] shrink-0 ml-4">{{ item.price }}</p>
        </div>
        <template v-if="item.description">
          <p
            class="text-xs text-white/50 mt-2 whitespace-pre-line"
            :class="expanded.has(item.name) ? '' : 'line-clamp-3'"
          >
            {{ item.description }}
          </p>
          <button
            v-if="item.description.length > 140"
            type="button"
            class="text-[11px] font-semibold text-[#4a8fe7] hover:underline mt-1"
            @click="toggleExpanded(item.name)"
          >
            {{ expanded.has(item.name) ? 'Ver menos' : 'Ver más' }}
          </button>
        </template>
      </div>
    </div>

    <div class="px-6 pt-4 pb-6">
      <button
        type="button"
        class="w-full border border-[#4a8fe7]/40 text-[#4a8fe7] hover:bg-[#4a8fe7]/10 text-xs font-bold tracking-wide rounded-lg py-3 transition"
        @click="bookingStore.open"
      >
        RESERVAR CITA
      </button>
    </div>
  </div>
</template>
