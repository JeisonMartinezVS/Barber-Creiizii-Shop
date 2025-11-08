<template>
  <div class="flex flex-col justify-center items-center">
    <div class="flex items-center gap-4 my-4">
      <hr class="border border-border w-16" />
      <div class="w-2 h-2 rotate-45 border-2 border-primary" />
      <hr class="border border-border w-16" />
    </div>
    <p class="text-neutral-content font-bold text-4xl my-3">Contáctanos</p>
    <p class="text-base text-muted-foreground my-3 w-1/3 text-center">
      Estamos aquí para atenderte. Comunícate con nosotros por WhatsApp o síguenos en Instagram para
      ver nuestro trabajo.
    </p>

    <div class="flex items-center justify-center my-3 gap-4">
      <div
        class="text-neutral-content flex items-center justify-center bg-green-400 p-1 rounded-xs"
      >
        <Whatsapp />
        <a href="" class=""> WhatsApp </a>
      </div>
      <div
        class="hover:bg-accent hover:text-black flex items-center justify-center text-primary px-2 py-1 rounded-xs border border-primary w-full"
      >
        <Instagram />
        <a href="" class=""> Instagram </a>
      </div>
    </div>

    <div class="flex items-center gap-4 my-4">
      <hr class="border border-border w-16" />
      <div class="w-2 h-2 rotate-45 border-2 border-primary" />
      <hr class="border border-border w-16" />
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, computed, getCurrentInstance } from 'vue'
import Whatsapp from '../../public/icons/Whatsapp.vue'
import Instagram from '../../public/icons/Instagram.vue'

export default defineComponent({
  components: { Whatsapp, Instagram },
  setup() {
    const { proxy } = getCurrentInstance() as any
    const config = computed(() => proxy.$config)
    return {
      config,
    }
  },
})
</script>
