<template>
  <div class="flex flex-col justify-center items-center">
    <p class="text-neutral-content font-bold text-5xl">Nuestros Servicios</p>
    <div class="flex items-center gap-4 my-4">
      <hr class="border border-border w-16" />
      <div class="w-2 h-2 rotate-45 border-2 border-primary" />
      <hr class="border border-border w-16" />
    </div>
    <p class="text-base text-muted-foreground">
      Servicios profesionales diseñados para realzar tu estilo personal
    </p>
    <div class="my-2 w-full pb-28">
      <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8 max-w-10/12 mx-auto">
        <div
          v-for="(service, index) in config?.services"
          :key="index"
          class="bg-card border border-border hover:border-primary p-6 rounded-lg shadow-md hover:shadow-xl transition-shadow duration-300"
        >
          <div class="flex items-center gap-4 mb-4">
            <div class="w-2 h-2 rotate-45 border-2 border-primary" />
            <h3 class="text-2xl font-semibold mb-2 text-neutral-content">
              {{ service.title }}
            </h3>
          </div>
          <ul>
            <li
              v-for="(value, i) in service.items"
              :key="i"
              class="flex justify-between border-b border-border py-3"
            >
              <span class="text-neutral-content text-base"> {{ value.name }} </span>
              <span class="text-primary"> ${{ value.price }}</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, computed, getCurrentInstance } from 'vue'

export default defineComponent({
  setup() {
    const { proxy } = getCurrentInstance() as any
    const config = computed(() => proxy.$config)
    return {
      config,
    }
  },
})
</script>
