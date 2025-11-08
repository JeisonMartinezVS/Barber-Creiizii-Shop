<script lang="ts">
import { defineComponent } from 'vue'
import Hero from '@/components/Hero.vue'
import Services from '@/components/Services.vue'
import Contact from '@/components/Contact.vue'

export default defineComponent({
  components: { Hero, Services, Contact },
})
</script>

<template>
  <Hero />
  <div id="servicio" class="mt-12">
    <Services />
  </div>
  <div id="contacto">
    <Contact />
  </div>
</template>
