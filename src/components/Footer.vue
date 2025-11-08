<template>
  <footer class="relative bg-linear-to-b from-background to-card border-t border-primary/20">
    <div
      class="absolute top-0 left-0 right-0 h-1 bg-linear-to-r from-transparent via-primary to-transparent"
    />

    <div class="max-w-11/12 w-full mx-auto py-16">
      <div class="grid grid-cols-4 items-center justify-center gap-4">
        <div class="flex flex-col gap-3">
          <span class="text-neutral-content text-xl">Creiizii</span>
          <p class="text-muted-foreground">
            Barbería de excelencia donde cada detalle cuenta. Tu estilo, nuestra pasión.
          </p>
        </div>
        <div class="flex flex-col gap-3">
          <span class="text-neutral-content text-xl">Contacto</span>
          <p class="text-muted-foreground">
            Barbería de excelencia donde cada detalle cuenta. Tu estilo, nuestra pasión.
          </p>
        </div>
        <div class="flex flex-col gap-3">
          <span class="text-neutral-content text-xl">Horario</span>
          <p class="text-muted-foreground">
            Barbería de excelencia donde cada detalle cuenta. Tu estilo, nuestra pasión.
          </p>
        </div>
        <div class="flex flex-col gap-3">
          <span class="text-neutral-content text-xl">Ubicacion</span>
          <div class="">
            <p class="text-muted-foreground">95 #88-40</p>
            <p class="text-muted-foreground">Aures II, Medellín</p>
            <p class="text-muted-foreground">Antioquia, Colombia</p>

            <iframe
              src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3966.0234!2d-75.6279!3d6.2886!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x8e44299c8c8c8c8d%3A0x8c8c8c8c8c8c8c8c!2sCra.%2095%20%2388-40%2C%20Medell%C3%ADn%2C%20Antioquia!5e0!3m2!1ses!2sco!4v1234567890"
              width="80%"
              class="mt-8"
            />
          </div>
        </div>
      </div>
      <div class="mt-16 pt-8 border-t border-primary/20">
        <div class="flex flex-col items-center gap-4">
          <div class="flex items-center gap-3">
            <div class="w-12 h-px bg-linear-to-r from-transparent to-primary" />
            <div class="w-2 h-2 rotate-45 border border-primary" />
            <div class="w-3 h-3 rotate-45 border-2 border-primary" />
            <div class="w-2 h-2 rotate-45 border border-primary" />
            <div class="w-12 h-px bg-linear-to-l from-transparent to-primary" />
          </div>
          <p class="text-center text-muted-foreground text-sm">
            &copy; {{ new Date().getFullYear() }} Barber Creiizii Shop. Todos los derechos
            reservados.
          </p>
        </div>
      </div>
    </div>
  </footer>
</template>

<script lang="ts">
import { defineComponent } from 'vue'
export default defineComponent({})
</script>
