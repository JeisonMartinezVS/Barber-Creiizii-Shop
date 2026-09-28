<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { collection, onSnapshot, query, where } from 'firebase/firestore'
import { db } from '../../config/firebase'
import { LOW_STOCK_THRESHOLD } from '../../stores/booking'
import { useAuthStore } from '../../stores/auth'

// Aviso para admin y empleados cuando un producto activo queda con
// LOW_STOCK_THRESHOLD unidades o menos. Se puede omitir; vuelve a salir si el
// stock de ese producto baja todavía más.

interface LowStockProduct {
  id: string
  name: string
  stock: number
}

const authStore = useAuthStore()
const products = ref<LowStockProduct[]>([])

// Omitidos en este navegador: { productId: stock que tenía al omitirlo }.
const DISMISSED_KEY = 'creiizii_low_stock_dismissed'
function readDismissed(): Record<string, number> {
  try {
    return JSON.parse(localStorage.getItem(DISMISSED_KEY) ?? '{}') as Record<string, number>
  } catch {
    return {}
  }
}
const dismissed = ref<Record<string, number>>(readDismissed())

let unsubscribe: (() => void) | null = null
onMounted(() => {
  unsubscribe = onSnapshot(
    query(collection(db, 'productos'), where('active', '==', true)),
    (snapshot) => {
      products.value = snapshot.docs
        .map((d) => ({ id: d.id, name: String(d.data().name ?? ''), stock: Number(d.data().stock ?? 0) }))
        .filter((p) => p.stock <= LOW_STOCK_THRESHOLD)
        .sort((a, b) => a.stock - b.stock)
    },
    (err) => console.error('No se pudo revisar el stock de productos', err),
  )
})
onUnmounted(() => unsubscribe?.())

const visible = computed(() =>
  products.value.filter((p) => dismissed.value[p.id] === undefined || p.stock < dismissed.value[p.id]!),
)

function dismiss() {
  const next = { ...dismissed.value }
  for (const p of visible.value) next[p.id] = p.stock
  // Se olvidan los productos que ya se reabastecieron.
  for (const id of Object.keys(next)) {
    if (!products.value.some((p) => p.id === id)) delete next[id]
  }
  dismissed.value = next
  try {
    localStorage.setItem(DISMISSED_KEY, JSON.stringify(next))
  } catch {
    // Sin almacenamiento local: se omite solo durante esta sesión.
  }
}

function stockLabel(stock: number) {
  if (stock <= 0) return 'agotado'
  return stock === 1 ? 'queda 1' : `quedan ${stock}`
}
</script>

<template>
  <div
    v-if="visible.length > 0"
    role="alert"
    class="mb-4 flex items-start gap-3 rounded-xl border border-[#f2b705]/30 bg-[#f2b705]/10 px-4 py-3"
  >
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="text-[#f2b705] shrink-0 mt-0.5">
      <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z" />
      <line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
    <div class="min-w-0 flex-1">
      <p class="text-sm font-semibold text-[#f2b705]">
        {{ visible.length === 1 ? 'Un producto está por agotarse' : `${visible.length} productos están por agotarse` }}
      </p>
      <ul class="mt-1 text-xs text-white/70 space-y-0.5">
        <li v-for="p in visible" :key="p.id">
          <span class="font-semibold text-white">{{ p.name }}</span>
          <span :class="p.stock <= 0 ? 'text-red-400' : 'text-white/50'"> — {{ stockLabel(p.stock) }}</span>
        </li>
      </ul>
      <router-link
        v-if="authStore.isAdmin"
        :to="{ name: 'productos' }"
        class="inline-block mt-2 text-xs font-semibold text-[#f2b705] hover:underline"
      >
        Ir a productos
      </router-link>
    </div>
    <button
      type="button"
      class="shrink-0 text-xs font-semibold text-white/50 hover:text-white border border-white/10 hover:border-white/30 rounded-lg px-3 py-1.5 transition"
      @click="dismiss"
    >
      Omitir
    </button>
  </div>
</template>
