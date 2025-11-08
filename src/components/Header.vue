<script lang="ts">
import Whatsapp from '../../public/icons/Whatsapp.vue'
import Instagram from '../../public/icons/Instagram.vue'
import { defineComponent, getCurrentInstance, computed } from 'vue'

export default defineComponent({
  components: {
    Whatsapp,
    Instagram,
  },
  setup() {
    const { proxy } = getCurrentInstance() as any

    // accedemos al plugin global
    const config = computed(() => proxy.$config)

    return {
      config,
    }
  },
})
</script>

<template>
  <header
    class="fixed top-0 left-0 w-full bg-background text-neutral-50 border-b border-neutral-800 p-4 z-50"
  >
    <div class="flex justify-between items-center max-w-10/12 mx-auto">
      <!-- Logo -->
      <div class="flex items-center gap-2">
        <div class="w-2 h-2 rotate-45 border-2 border-yellow-400" />
      </div>

      <!-- Menu -->
      <div class="hidden md:flex justify-center items-center gap-4">
        <router-link
          v-for="value in config?.menu"
          :key="value.name"
          :to="value.link"
          class="text-base font-bold hover:text-yellow-400"
          >{{ value.name }}</router-link
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
