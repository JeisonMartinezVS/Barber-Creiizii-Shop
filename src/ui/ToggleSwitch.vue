<script setup lang="ts">
defineProps<{
  modelValue: boolean
  color?: string // hex for the "on" state, defaults to green
}>()
defineEmits<{ (e: 'update:modelValue', value: boolean): void }>()
</script>

<template>
  <button
    type="button"
    role="switch"
    :aria-checked="modelValue"
    class="relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors"
    :style="{ backgroundColor: modelValue ? (color ?? '#22c55e') : 'rgba(255,255,255,0.12)' }"
    @click="$emit('update:modelValue', !modelValue)"
  >
    <span
      class="inline-block h-4 w-4 transform rounded-full bg-white transition-transform"
      :class="modelValue ? 'translate-x-6' : 'translate-x-1'"
    ></span>
  </button>
</template>
