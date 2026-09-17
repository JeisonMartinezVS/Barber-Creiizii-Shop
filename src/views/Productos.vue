<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue'
import { collection, onSnapshot, orderBy, query, where } from 'firebase/firestore'
import { db } from '../config/firebase'

interface DisplayProduct {
  id: string
  name: string
  brand: string
  description: string
  price: number
  image: string
}

const products = ref<DisplayProduct[]>([])
const isLoading = ref(true)
let unsubscribe: (() => void) | null = null

onMounted(() => {
  // Solo productos activos — lo que el admin apague con el toggle
  // desaparece de aquí automáticamente.
  const q = query(collection(db, 'productos'), where('active', '==', true), orderBy('name'))
  unsubscribe = onSnapshot(
    q,
    (snapshot) => {
      products.value = snapshot.docs.map((d) => {
        const data = d.data()
        return {
          id: d.id,
          name: data.name,
          brand: data.brand ?? '',
          description: data.description ?? '',
          price: data.price ?? 0,
          image: data.image ?? '',
        }
      })
      isLoading.value = false
    },
    () => {
      isLoading.value = false
    },
  )
})
onUnmounted(() => unsubscribe?.())

const whatsappUrl =
  'https://wa.me/573006282601?text=' + encodeURIComponent('Hola, quiero consultar disponibilidad de productos')
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

      <p v-if="isLoading" class="text-white/30 text-sm py-10">Cargando productos...</p>
      <p v-else-if="products.length === 0" class="text-white/30 text-sm py-10">
        Muy pronto vas a encontrar aquí nuestros productos.
      </p>

      <div v-else class="grid grid-cols-2 md:grid-cols-4 gap-5 text-left">
        <div
          v-for="product in products"
          :key="product.id"
          class="bg-[#0e0e0e] border border-white/10 rounded-xl overflow-hidden flex flex-col"
        >
          <div class="aspect-square flex items-center justify-center bg-white/5">
            <img v-if="product.image" :src="product.image" :alt="product.name" class="w-full h-full object-cover" />
            <svg v-else width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" class="text-white/15">
              <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" />
              <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
              <line x1="12" y1="22.08" x2="12" y2="12" />
            </svg>
          </div>
          <div class="p-4 flex flex-col grow">
            <p class="text-sm font-bold text-white mb-1">{{ product.name }}</p>
            <p v-if="product.description" class="text-xs text-white/40 mb-3 grow">{{ product.description }}</p>
            <p v-else class="grow"></p>
            <p class="text-sm">
              <span class="font-bold text-primary">${{ product.price.toLocaleString('es-CO') }}</span>
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
