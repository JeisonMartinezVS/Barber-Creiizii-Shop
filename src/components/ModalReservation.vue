<script setup lang="ts">
const iframeSrc =
  'https://colavo.link/r/cMtWyRz?fbclid=PAZXh0bgNhZW0CMTEAAae1i8hmrmZhNaeE3ZFeCwb-lOO2FsJmyhx-kGn9JkZVr1KGgqJY_URlDUZ03w_aem_5ekWvzbtoSGU0eGq6PpyBQ&channel=instagram&expire=1762061655'
</script>

<template>
  <Teleport to="body">
    <div class="fixed inset-0 bg-black/70 z-50 flex items-center justify-center">
      <div class="flex items-center justify-center relative h-11/12 w-96">
        <button
          @click="$emit('close')"
          class="absolute top-5 -right-1 text-white rounded-full px-2 py-1 bg-red-700 cursor-pointer justify-center items-center flex hover:scale-105"
        >
          ✕
        </button>
        <iframe :src="iframeSrc" class="h-11/12 w-96"></iframe>
      </div>
    </div>
  </Teleport>
</template>
