<script setup lang="ts">
defineProps<{
  label: string
  value: string
  icon: string
  accent: string // tailwind-arbitrary hex, e.g. '#c9a24b'
}>()
</script>

<template>
  <div class="bg-[#0e0e0e] border border-white/10 rounded-xl p-5">
    <div class="flex items-center justify-between mb-3">
      <p class="text-sm text-white/50">{{ label }}</p>
      <span :style="{ color: accent }" v-html="icon"></span>
    </div>
    <p class="text-2xl font-bold" :style="{ color: accent }">{{ value }}</p>
  </div>
</template>