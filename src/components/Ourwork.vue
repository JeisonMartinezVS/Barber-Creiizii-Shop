<script setup lang="ts">
// Instagram's own "Profile Embed" iframe — no API keys, no Cloud Function.
const instagramUsername = 'creiizii_barber_shop'
</script>

<template>
  <section class="py-16 md:py-24 px-6">
    <div class="max-w-3xl mx-auto text-center">
      <h2 class="font-gothic text-white text-4xl md:text-5xl mb-3">Nuestro Trabajo</h2>
      <p class="text-gray-400 mb-8">Síguenos en Instagram para ver más de nuestros cortes</p>
        <a
        href="https://instagram.com/creiizii_barber_shop"
        target="_blank"
        rel="noopener"
        class="inline-flex items-center gap-2 text-primary text-sm font-semibold hover:underline mb-10"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <rect x="2" y="2" width="20" height="20" rx="5" />
          <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37Z" />
          <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
        </svg>
        @creiizii_barber_shop
      </a>
      <iframe
        :src="`https://www.instagram.com/${instagramUsername}/embed`"
        width="100%"
        height="600"
        frameborder="0"
        scrolling="no"
        class="w-full min-h-[400px] md:min-h-[600px] rounded-xl border border-white/10"
      ></iframe>
    </div>
  </section>
</template>