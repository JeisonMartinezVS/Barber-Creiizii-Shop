<script setup lang="ts">
import Whatsapp from '../../public/icons/Whatsapp.vue'
import Instagram from '../../public/icons/Instagram.vue'
const menu = [
  { name: 'Inicio', link: '/' },
  { name: 'Servicios', link: '/products' },
  { name: 'Contacto', link: '/about' },
  { name: 'Producto', link: '/contact' },
]
</script>

<template>
  <header class="w-full text-neutral-50 border-b border-neutral-800 p-4">
    <div class="flex justify-between items-center max-w-10/12 mx-auto">
      <!-- Logo -->
      <div class="flex items-center gap-2">
        <div class="w-2 h-2 rotate-45 border-2 border-yellow-400" />
      </div>

      <!-- Menu -->
      <div class="hidden md:flex justify-center items-center gap-4">
        <a
          v-for="value in menu"
          :href="value.link"
          class="text-base font-bold hover:text-yellow-400"
          >{{ value.name }}</a
        >
      </div>

      <!-- Redes -->
      <div class="flex items-center">
        <Whatsapp />
        <Instagram />
      </div>
    </div>
  </header>
</template>
