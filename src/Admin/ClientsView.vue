<script setup lang="ts">
import { computed, onUnmounted, ref } from 'vue'
import { collection, onSnapshot, orderBy, query, type Timestamp } from 'firebase/firestore'
import { db } from '../config/firebase'
import { normalizePhone } from '../stores/booking'
import DashboardStats from '../components/dashboard/DashboardStats.vue'
import EmptyState from '../components/dashboard/EmptyState.vue'

interface Cliente {
  id: string // celular normalizado (ver normalizePhone)
  name: string
  phone: string
  createdAt: Date | null
}

// Se crean solos desde el modal de reserva, uno por celular.
const clientes = ref<Cliente[]>([])
const isLoading = ref(true)
const loadError = ref('')
const search = ref('')

const unsubscribe = onSnapshot(
  query(collection(db, 'clientes'), orderBy('createdAt', 'desc')),
  (snapshot) => {
    clientes.value = snapshot.docs.map((d) => {
      const data = d.data()
      return {
        id: d.id,
        name: String(data.name ?? ''),
        phone: String(data.phone ?? d.id),
        createdAt: (data.createdAt as Timestamp | undefined)?.toDate() ?? null,
      }
    })
    isLoading.value = false
    loadError.value = ''
  },
  (err) => {
    console.error('No se pudieron cargar los clientes', err)
    loadError.value = 'No se pudieron cargar los clientes.'
    isLoading.value = false
  },
)
onUnmounted(unsubscribe)

const filteredClientes = computed(() => {
  const term = search.value.trim().toLowerCase()
  if (!term) return clientes.value
  const digits = term.replace(/\D/g, '')
  return clientes.value.filter(
    (c) => c.name.toLowerCase().includes(term) || (digits && c.id.includes(digits)),
  )
})

const MONTH_ABBR = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sept', 'oct', 'nov', 'dic']
function formatDate(d: Date | null) {
  return d ? `${d.getDate()} ${MONTH_ABBR[d.getMonth()]} ${d.getFullYear()}` : '—'
}

function whatsappUrl(phone: string) {
  const digits = normalizePhone(phone)
  return `https://wa.me/${digits.length === 10 ? `57${digits}` : digits}`
}

function initial(name: string) {
  return name.charAt(0).toUpperCase() || '?'
}

const usersIcon = `<svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></svg>`
</script>

<template>
  <div>
    <DashboardStats />

    <div class="flex flex-wrap items-center justify-between gap-3 mb-4">
      <h1 class="font-serif text-xl font-bold text-white">
        Clientes
        <span v-if="clientes.length" class="text-sm font-sans font-normal text-white/40">({{ clientes.length }})</span>
      </h1>
      <input
        v-if="clientes.length"
        v-model="search"
        type="search"
        placeholder="Buscar por nombre o celular"
        class="w-full sm:w-64 bg-[#151515] border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-white/30 focus:outline-none focus:border-primary/50"
      />
    </div>

    <div class="bg-[#0e0e0e] border border-white/10 rounded-xl min-h-[280px] flex items-center justify-center">
      <p v-if="isLoading" class="text-sm text-white/30">Cargando clientes...</p>
      <p v-else-if="loadError" class="text-sm text-red-400">{{ loadError }}</p>
      <EmptyState v-else-if="clientes.length === 0" :icon="usersIcon" text="Sin clientes registrados" />
      <p v-else-if="filteredClientes.length === 0" class="text-sm text-white/30">Ningún cliente coincide.</p>
      <ul v-else class="w-full self-start divide-y divide-white/5">
        <li v-for="cliente in filteredClientes" :key="cliente.id" class="flex items-center justify-between gap-3 px-5 py-3.5">
          <div class="flex items-center gap-3 min-w-0">
            <div class="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold text-[#8cb8f5] bg-gradient-to-b from-[#1a3a6b] to-[#0f2140] border border-primary/30 shrink-0">
              {{ initial(cliente.name) }}
            </div>
            <div class="min-w-0">
              <p class="text-sm font-semibold text-white truncate">{{ cliente.name }}</p>
              <p class="text-xs text-white/40">{{ cliente.phone }}</p>
            </div>
          </div>
          <div class="flex items-center gap-4 shrink-0">
            <span class="hidden sm:block text-xs text-white/40">Desde {{ formatDate(cliente.createdAt) }}</span>
            <a
              :href="whatsappUrl(cliente.phone)"
              target="_blank"
              rel="noopener"
              class="text-xs font-semibold text-primary hover:underline"
            >
              WhatsApp
            </a>
          </div>
        </li>
      </ul>
    </div>
  </div>
</template>
