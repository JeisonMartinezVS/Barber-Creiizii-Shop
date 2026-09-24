<script setup lang="ts">
import { onMounted, onUnmounted, ref, watch } from 'vue'
import { LEGAL_UPDATED_AT, type LegalDoc } from '../content/legal'

const props = defineProps<{ doc: LegalDoc }>()
const emit = defineEmits<{ close: [] }>()

const body = ref<HTMLElement | null>(null)

function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape') emit('close')
}

// Bloquea el scroll de la página mientras el modal está abierto.
onMounted(() => {
  document.addEventListener('keydown', onKeydown)
  document.body.style.overflow = 'hidden'
})
onUnmounted(() => {
  document.removeEventListener('keydown', onKeydown)
  document.body.style.overflow = ''
})

// Si se cambia de documento sin cerrar el modal, vuelve arriba.
watch(
  () => props.doc.id,
  () => body.value?.scrollTo({ top: 0 }),
)
</script>

<template>
  <Teleport to="body">
    <div
      class="fixed inset-0 bg-black/70 z-50 flex items-center justify-center px-4 py-8"
      @click.self="emit('close')"
    >
      <div
        class="relative w-full max-w-2xl"
        role="dialog"
        aria-modal="true"
        :aria-labelledby="`legal-title-${doc.id}`"
      >
        <div
          class="absolute inset-x-6 -top-px h-px bg-linear-to-r from-transparent via-primary to-transparent"
        ></div>
        <div
          class="bg-[#0e0e0e] border border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]"
        >
          <!-- Header -->
          <div class="flex items-start justify-between gap-4 px-6 pt-5 pb-4 border-b border-white/10 shrink-0">
            <div>
              <h2 :id="`legal-title-${doc.id}`" class="font-serif text-xl font-bold text-white">
                {{ doc.title }}
              </h2>
              <p class="text-xs text-primary mt-1">Última actualización: {{ LEGAL_UPDATED_AT }}</p>
            </div>
            <button
              type="button"
              class="w-8 h-8 rounded-full border border-white/10 flex items-center justify-center text-white/50 hover:text-white hover:border-white/30 transition shrink-0"
              aria-label="Cerrar"
              @click="emit('close')"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>

          <!-- Contenido -->
          <div ref="body" class="overflow-y-auto px-6 py-5 space-y-5 text-sm leading-relaxed">
            <p class="text-white/70">{{ doc.intro }}</p>

            <section v-for="section in doc.sections" :key="section.heading">
              <h3 class="text-white font-semibold mb-2">{{ section.heading }}</h3>
              <p
                v-for="(paragraph, i) in section.paragraphs"
                :key="i"
                class="text-white/60 mb-2 last:mb-0"
              >
                {{ paragraph }}
              </p>
              <ul v-if="section.list" class="mt-2 space-y-1.5">
                <li v-for="(item, i) in section.list" :key="i" class="flex gap-2 text-white/60">
                  <span class="mt-2 w-1 h-1 rotate-45 bg-primary shrink-0"></span>
                  <span>{{ item }}</span>
                </li>
              </ul>
            </section>
          </div>

          <!-- Footer -->
          <div class="px-6 py-4 border-t border-white/10 flex justify-end shrink-0">
            <button
              type="button"
              class="bg-linear-to-b from-[#b6903f] to-[#8f7130] hover:from-[#c39c47] hover:to-[#9c7c37] text-[#1a1408] font-semibold text-sm rounded-lg px-5 py-2 transition"
              @click="emit('close')"
            >
              Entendido
            </button>
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>
