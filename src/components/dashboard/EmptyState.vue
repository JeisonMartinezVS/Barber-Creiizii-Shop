<script setup lang="ts">
defineProps<{ icon: string; text: string }>()
</script>

<template>
  <div class="flex flex-col items-center justify-center py-16 text-center">
    <span class="text-white/20 mb-3 [&_svg]:mx-auto" v-html="icon"></span>
    <p class="text-sm text-white/40">{{ text }}</p>
  </div>
</template>
