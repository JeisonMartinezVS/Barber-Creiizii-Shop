<script setup lang="ts">

interface DisplayProduct {
  id: string
  name: string
  description: string
  price: string
  image: string
  bg: string
}

// TODO: replace with real productos fetched from Firestore — note this list's
// names/prices don't fully match the ones used in the reservation modal yet
// (those came from a separate mockup); point both at the same collection
// once it exists.
const products: DisplayProduct[] = [
  {
    id: 'fuerte',
    name: 'Gel Fijación Fuerte',
    description: 'Gel de alta fijación para estilos que duran todo el día. Acabado brillante y control máximo.',
    price: '$25.000 COP',
    image: '',
    bg: 'bg-black',
  },
  {
    id: 'media',
    name: 'Gel Fijación Media',
    description: 'Gel versátil con fijación media. Perfecto para looks naturales con control moderado.',
    price: '$22.000 COP',
    image: '',
    bg: 'bg-white',
  },
  {
    id: 'mojado',
    name: 'Gel Efecto Mojado',
    description: 'Gel con acabado húmedo para un look clásico y elegante. Fijación duradera.',
    price: '$24.000 COP',
    image: '',
    bg: 'bg-sky-100',
  },
  {
    id: 'mate',
    name: 'Gel Mate',
    description: 'Gel con acabado mate para un estilo natural sin brillo. Fijación flexible.',
    price: '$26.000 COP',
    image: '',
    bg: 'bg-slate-800',
  },
]

const whatsappUrl = 'https://wa.me/573006282601?text=' + encodeURIComponent('Hola, quiero consultar disponibilidad de productos')
</script>

<template>
  <section class="py-16 md:py-24 px-6">
    <div class="max-w-6xl mx-auto text-center">
      <h1 class="font-gothic text-white text-4xl md:text-5xl mb-4">Nuestros Productos</h1>
      <p class="text-gray-400 max-w-xl mx-auto mb-4">
        Geles profesionales de alta calidad para mantener tu estilo impecable
      </p>
      <div class="flex items-center justify-center gap-3 mb-12">
        <span class="w-10 h-px bg-primary/40"></span>
        <span class="w-1.5 h-1.5 rotate-45 border border-primary"></span>
        <span class="w-10 h-px bg-primary/40"></span>
      </div>

      <div class="grid grid-cols-2 md:grid-cols-4 gap-5 text-left">
        <div
          v-for="product in products"
          :key="product.id"
          class="bg-[#0e0e0e] border border-white/10 rounded-xl overflow-hidden flex flex-col"
        >
          <div :class="['aspect-square flex items-center justify-center', product.bg]">
            <img v-if="product.image" :src="product.image" :alt="product.name" class="w-full h-full object-cover" />
            <svg v-else width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" class="text-black/20">
              <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" />
              <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
              <line x1="12" y1="22.08" x2="12" y2="12" />
            </svg>
          </div>
          <div class="p-4 flex flex-col grow">
            <p class="text-sm font-bold text-white mb-1">{{ product.name }}</p>
            <p class="text-xs text-white/40 mb-3 grow">{{ product.description }}</p>
            <p class="text-sm">
              <span class="font-bold text-primary">{{ product.price.split(' ')[0] }}</span>
              <span class="text-white/30 ml-1">COP</span>
            </p>
          </div>
        </div>
      </div>

      <p class="text-gray-400 text-sm mt-12 mb-4">¿Interesado en nuestros productos? Contáctanos por WhatsApp</p>
      <a
        :href="whatsappUrl"
        target="_blank"
        rel="noopener"
        class="inline-flex items-center gap-2 bg-green-600 hover:bg-green-500 text-white font-semibold text-sm rounded-lg px-5 py-3 transition"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38a9.9 9.9 0 0 0 4.74 1.21h.01c5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.82 9.82 0 0 0 12.04 2Z" />
        </svg>
        Consultar Disponibilidad
      </a>
    </div>
  </section>
</template>
