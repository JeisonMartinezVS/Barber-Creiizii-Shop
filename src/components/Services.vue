<script setup lang="ts">
import ServiceCategoryCard, { type ServiceItem } from './ServiceCategoryCard.vue'

interface ServiceCategory {
  title: string
  icon: string
  items: ServiceItem[]
}

// TODO: replace with real servicios fetched from Firestore once that
// collection exists — this mirrors the Productos pattern from the admin panel.
const categories: ServiceCategory[] = [
  {
    title: 'Cortes de Cabello',
    icon: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="6" cy="6" r="3"/><circle cx="6" cy="18" r="3"/><line x1="20" y1="4" x2="8.12" y2="15.88"/><line x1="14.47" y1="14.48" x2="20" y2="20"/><line x1="8.12" y1="8.12" x2="12" y2="12"/></svg>`,
    items: [
      { name: 'Corte de Cabello', duration: '30 min', price: '$15.000' },
      { name: 'Corte Pigmentado', duration: '45 min', price: '$18.000' },
      { name: 'Corte y Barba', duration: '50 min', price: '$18.000' },
      { name: 'Corte y Barba Pigmentado', duration: '60 min', price: '$22.000' },
      { name: 'Marcada', duration: '20 min', price: '$7.000' },
      { name: 'Corte de Puntas (Mujeres)', duration: '30 min', price: '$10.000' },
    ],
  },
  {
    title: 'Barba',
    icon: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 3v3m0 0 2.5 2.5M12 6 9.5 8.5M5 12h3m0 0 2.5-2.5M8 12l2.5 2.5M19 12h-3m0 0-2.5-2.5M16 12l-2.5 2.5M12 19v2"/></svg>`,
    items: [
      { name: 'Barba Caballero', duration: '20 min', price: '$7.000' },
      { name: 'Barba Pigmentada', duration: '30 min', price: '$12.000' },
    ],
  },
  {
    title: 'Cejas',
    icon: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7Z"/><circle cx="12" cy="12" r="3"/></svg>`,
    items: [
      { name: 'Cejas', duration: '15 min', price: '$5.000' },
      { name: 'Cejas Pigmentadas', duration: '20 min', price: '$10.000' },
    ],
  },
]
</script>

<template>
  <section id="servicios" class="py-16 md:py-24 px-6">
    <div class="max-w-6xl mx-auto text-center">
      <p class="flex items-center justify-center gap-3 text-xs tracking-[0.3em] text-[#c9a24b] mb-4">
        <span class="w-8 h-px bg-[#c9a24b]/50"></span>
        CATÁLOGO
        <span class="w-8 h-px bg-[#c9a24b]/50"></span>
      </p>
      <h2 class="font-gothic text-white text-4xl md:text-5xl mb-4">Nuestros Servicios</h2>
      <p class="text-gray-400 max-w-xl mx-auto mb-12">
        Servicios profesionales de barbería adaptados a tu estilo personal
      </p>

      <div class="grid grid-cols-1 md:grid-cols-3 gap-6 text-left items-stretch">
        <ServiceCategoryCard
          v-for="category in categories"
          :key="category.title"
          :title="category.title"
          :icon="category.icon"
          :items="category.items"
        />
      </div>
    </div>
  </section>
</template>