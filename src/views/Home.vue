<script setup lang="ts">
import { defineAsyncComponent } from 'vue'
import Hero from '@/components/Hero.vue'

// El Hero es lo primero que se ve, así que se carga de inmediato. Las
// secciones de más abajo se descargan en paralelo, en su propio chunk.
const Services = defineAsyncComponent(() => import('@/components/Services.vue'))
const Ourwork = defineAsyncComponent(() => import('@/components/Ourwork.vue'))
// const Contact = defineAsyncComponent(() => import('@/components/Contact.vue'))
</script>

<template>
  <Hero />
  <div id="servicio" class="mt-12">
    <Services />
  </div>
  <!--
  <div id="contacto">
    <Contact />
  </div>
  -->
  <div id="nuestro-trabajo">
    <Ourwork />
  </div>
</template>
