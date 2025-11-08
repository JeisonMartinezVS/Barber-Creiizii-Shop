<script lang="ts">
import { defineComponent } from 'vue'
import ModalReservation from './ModalReservation.vue'

export default defineComponent({
  components: {
    ModalReservation,
  },
  data() {
    const activeModal = false
    return {
      activeModal,
    }
  },
})
</script>

<template>
  <div class="relative mt-8 w-full max-w-11/12 mx-auto text-center py-8 px-6 overflow-hidden">
    <!-- Esquinas decorativas -->
    <div class="absolute left-0 top-0 w-10 h-10 border-l border-t border-primary opacity-40"></div>
    <div class="absolute right-0 top-0 w-10 h-10 border-r border-t border-primary opacity-40"></div>
    <div
      class="absolute left-0 bottom-0 w-10 h-10 border-l border-b border-primary opacity-40"
    ></div>
    <div
      class="absolute right-0 bottom-0 w-10 h-10 border-r border-b border-primary opacity-40"
    ></div>

    <!-- Contenido dentro del marco -->
    <div class="relative z-10 flex flex-col items-center justify-center gap-4">
      <img src="../../public/logo.jpg" alt="" class="h-80 object-contain" />
      <h2 class="text-white text-5xl font-bold">Estilo y Distinción</h2>
      <p class="text-gray-300 max-w-xl">
        Donde la tradición se encuentra con la modernidad. Cada corte es una obra de arte diseñado
        para realzar tu personalidad.
      </p>
      <div
        class="bg-primary/80 hover:scale-105 font-bold py-3 px-6 rounded-md mt-4 transition-all duration-300 cursor-pointer"
      >
        <button class="text-neutral" @click="activeModal = !activeModal">
          Reserva tu cita ahora
        </button>
      </div>
    </div>
  </div>

  <ModalReservation v-if="activeModal" @close="activeModal = false" />
</template>
