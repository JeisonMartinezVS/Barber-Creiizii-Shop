<script setup lang="ts">
import { computed, onUnmounted, ref } from 'vue'
import { collection, deleteDoc, doc, onSnapshot, orderBy, query, where, type Timestamp } from 'firebase/firestore'
import { db } from '../config/firebase'
import { useAuthStore } from '../stores/auth'
import { normalizePhone, useBookingStore } from '../stores/booking'
import DashboardStats from '../components/dashboard/DashboardStats.vue'
import EmptyState from '../components/dashboard/EmptyState.vue'
import NewClientModal from '../components/dashboard/NewClientModal.vue'

const authStore = useAuthStore()
const bookingStore = useBookingStore() // nombres de los barberos para el filtro del admin
const myUid = authStore.user?.uid ?? ''

interface Cliente {
  id: string // celular normalizado (ver normalizePhone)
  name: string
  phone: string
  createdAt: Date | null
  barberoIds: string[] // barberos a los que se asoció al registrarlo desde el panel
  createdBy: string // quien lo registró desde el panel ('' si reservó en la web)
}

// Se crean solos desde el modal de reserva (uno por celular) o desde aquí.
const clientes = ref<Cliente[]>([])
const isLoading = ref(true)
const loadError = ref('')
const search = ref('')

const unsubscribeClientes = onSnapshot(
  query(collection(db, 'clientes'), orderBy('createdAt', 'desc')),
  (snapshot) => {
    clientes.value = snapshot.docs.map((d) => {
      const data = d.data()
      return {
        id: d.id,
        name: String(data.name ?? ''),
        phone: String(data.phone ?? d.id),
        createdAt: (data.createdAt as Timestamp | undefined)?.toDate() ?? null,
        barberoIds: Array.isArray(data.barberoIds) ? (data.barberoIds as string[]) : [],
        createdBy: String(data.createdBy ?? ''),
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

// --- A qué barbero pertenece cada cliente -------------------------------------
// Un cliente es de un barbero si tiene citas con él o si se le asoció al
// registrarlo desde el panel. Un empleado solo puede leer sus propias citas,
// así que solo ve los clientes que son suyos; el admin ve todas las citas.
const citaOwners = ref<Map<string, Set<string>>>(new Map())

const citasQuery = authStore.isAdmin
  ? query(collection(db, 'citas'))
  : query(collection(db, 'citas'), where('barberoId', '==', myUid || '__none__'))

const unsubscribeCitas = onSnapshot(
  citasQuery,
  (snapshot) => {
    const owners = new Map<string, Set<string>>()
    for (const d of snapshot.docs) {
      const data = d.data()
      const phoneId = normalizePhone(String(data.customerPhone ?? ''))
      if (!phoneId || !data.barberoId) continue
      const set = owners.get(phoneId) ?? new Set<string>()
      set.add(String(data.barberoId))
      owners.set(phoneId, set)
    }
    citaOwners.value = owners
  },
  (err) => console.error('No se pudieron cargar las citas de los clientes', err),
)

onUnmounted(() => {
  unsubscribeClientes()
  unsubscribeCitas()
})

function ownersOf(cliente: Cliente): Set<string> {
  const owners = new Set(cliente.barberoIds)
  citaOwners.value.get(cliente.id)?.forEach((id) => owners.add(id))
  return owners
}

// Admin: 'todos' o el id de un barbero. Empleado: siempre él mismo.
const selectedBarbero = ref<string>(authStore.isAdmin ? 'todos' : myUid)

const visibleClientes = computed(() => {
  if (selectedBarbero.value === 'todos') return clientes.value
  return clientes.value.filter((c) => ownersOf(c).has(selectedBarbero.value))
})

const filteredClientes = computed(() => {
  const term = search.value.trim().toLowerCase()
  if (!term) return visibleClientes.value
  const digits = term.replace(/\D/g, '')
  return visibleClientes.value.filter(
    (c) => c.name.toLowerCase().includes(term) || (digits && c.id.includes(digits)),
  )
})

function ownerNames(cliente: Cliente): string {
  return [...ownersOf(cliente)]
    .map((id) => bookingStore.barberos.find((b) => b.id === id)?.name)
    .filter(Boolean)
    .join(', ')
}

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

// --- Nuevo cliente / agendar cita --------------------------------------------
// null = cerrado; { existing: null } = cliente nuevo; con existing = agendar.
const modal = ref<{ existing: { name: string; phone: string } | null } | null>(null)
const successMessage = ref('')
const errorMessage = ref('')

function openNewClient() {
  successMessage.value = ''
  errorMessage.value = ''
  modal.value = { existing: null }
}
function openBooking(cliente: Cliente) {
  successMessage.value = ''
  errorMessage.value = ''
  modal.value = { existing: { name: cliente.name, phone: cliente.phone } }
}
function onSaved(message: string) {
  modal.value = null
  successMessage.value = message
}

// --- Eliminar cliente ---------------------------------------------------------
// El admin puede eliminar cualquier cliente; un empleado, los que él registró.
// Sus citas no se borran: quedan en la agenda y en los reportes.
function canDelete(cliente: Cliente) {
  return authStore.isAdmin || (!!myUid && cliente.createdBy === myUid)
}

const clienteToDelete = ref<Cliente | null>(null)
const isDeleting = ref(false)

function askDelete(cliente: Cliente) {
  successMessage.value = ''
  errorMessage.value = ''
  clienteToDelete.value = cliente
}
function cancelDelete() {
  if (isDeleting.value) return
  clienteToDelete.value = null
}
async function confirmDelete() {
  const cliente = clienteToDelete.value
  if (!cliente) return
  isDeleting.value = true
  try {
    await deleteDoc(doc(db, 'clientes', cliente.id))
    successMessage.value = `Cliente ${cliente.name} eliminado.`
  } catch (err) {
    console.error('No se pudo eliminar el cliente', err)
    errorMessage.value = 'No se pudo eliminar el cliente. Intenta de nuevo.'
  } finally {
    isDeleting.value = false
    clienteToDelete.value = null
  }
}

const usersIcon = `<svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></svg>`
</script>

<template>
  <div>
    <DashboardStats />

    <div class="flex flex-wrap items-center justify-between gap-3 mb-4">
      <h1 class="font-serif text-xl font-bold text-white">
        {{ authStore.isAdmin ? 'Clientes' : 'Mis clientes' }}
        <span v-if="visibleClientes.length" class="text-sm font-sans font-normal text-white/40">({{ visibleClientes.length }})</span>
      </h1>
      <div class="flex flex-col sm:flex-row w-full sm:w-auto sm:items-center gap-2">
        <select
          v-if="authStore.isAdmin"
          v-model="selectedBarbero"
          class="bg-[#151515] border border-white/10 rounded-lg px-3 py-2 text-sm text-white/80 focus:outline-none focus:border-primary/50"
        >
          <option value="todos">Todos los clientes</option>
          <option v-for="barbero in bookingStore.barberos" :key="barbero.id" :value="barbero.id">
            {{ barbero.id === myUid ? `Mis clientes (${barbero.name})` : barbero.name }}
          </option>
        </select>
        <div class="flex items-center gap-2">
          <input
            v-if="clientes.length"
            v-model="search"
            type="search"
            placeholder="Buscar por nombre o celular"
            class="flex-1 sm:w-64 bg-[#151515] border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-white/30 focus:outline-none focus:border-primary/50"
          />
          <button
            type="button"
            class="shrink-0 flex items-center gap-2 bg-gradient-to-b from-[#3f7fd6] to-[#2b5fa8] hover:from-[#5596ea] hover:to-[#336bb8] text-white font-semibold text-sm rounded-lg px-4 py-2 transition"
            @click="openNewClient"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            Nuevo cliente
          </button>
        </div>
      </div>
    </div>

    <p
      v-if="successMessage"
      class="mb-4 text-sm text-[#34d399] bg-[#34d399]/10 border border-[#34d399]/20 rounded-lg px-4 py-2.5"
    >
      {{ successMessage }}
    </p>
    <p
      v-if="errorMessage"
      class="mb-4 text-sm text-red-400 bg-red-400/10 border border-red-400/20 rounded-lg px-4 py-2.5"
    >
      {{ errorMessage }}
    </p>

    <div class="bg-[#0e0e0e] border border-white/10 rounded-xl min-h-[280px] flex items-center justify-center">
      <p v-if="isLoading" class="text-sm text-white/30">Cargando clientes...</p>
      <p v-else-if="loadError" class="text-sm text-red-400">{{ loadError }}</p>
      <EmptyState v-else-if="visibleClientes.length === 0" :icon="usersIcon" text="Sin clientes registrados" />
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
              <p v-if="authStore.isAdmin && ownerNames(cliente)" class="text-[11px] text-[#8cb8f5]/70 truncate">
                {{ ownerNames(cliente) }}
              </p>
            </div>
          </div>
          <div class="flex items-center gap-4 shrink-0">
            <span class="hidden sm:block text-xs text-white/40">Desde {{ formatDate(cliente.createdAt) }}</span>
            <button type="button" class="text-xs font-semibold text-white/60 hover:text-white transition" @click="openBooking(cliente)">
              Agendar
            </button>
            <a
              :href="whatsappUrl(cliente.phone)"
              target="_blank"
              rel="noopener"
              class="text-xs font-semibold text-primary hover:underline"
            >
              WhatsApp
            </a>
            <button
              v-if="canDelete(cliente)"
              type="button"
              class="w-8 h-8 flex items-center justify-center rounded-lg border border-white/10 text-white/50 hover:text-red-400 hover:border-red-400/30 transition"
              aria-label="Eliminar cliente"
              title="Eliminar cliente"
              @click="askDelete(cliente)"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="3 6 5 6 21 6" />
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
              </svg>
            </button>
          </div>
        </li>
      </ul>
    </div>

    <NewClientModal v-if="modal" :existing="modal.existing" @close="modal = null" @saved="onSaved" />

    <!-- Modal: confirmar eliminación -->
    <Teleport to="body">
      <div v-if="clienteToDelete" class="fixed inset-0 bg-black/70 z-50 flex items-center justify-center px-4" @click.self="cancelDelete">
        <div class="w-full max-w-sm bg-[#0e0e0e] border border-white/10 rounded-2xl shadow-2xl overflow-hidden">
          <div class="px-6 pt-6 pb-4 text-center">
            <div class="w-12 h-12 mx-auto mb-4 rounded-full bg-red-500/10 border border-red-500/30 flex items-center justify-center text-red-400">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="3 6 5 6 21 6" />
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
              </svg>
            </div>
            <h2 class="font-serif text-lg font-bold text-white mb-1">¿Seguro que quieres eliminar este cliente?</h2>
            <p class="text-sm text-white/50">
              <span class="text-white font-semibold">{{ clienteToDelete.name }}</span> ({{ clienteToDelete.phone }}) se
              eliminará de la lista de clientes. Sus citas no se borran.
            </p>
          </div>
          <div class="flex items-center gap-3 px-6 pb-6 pt-2">
            <button
              type="button"
              :disabled="isDeleting"
              class="flex-1 text-sm font-semibold text-white/70 border border-white/10 rounded-lg py-2.5 hover:border-white/25 hover:text-white transition disabled:opacity-50"
              @click="cancelDelete"
            >
              Cancelar
            </button>
            <button
              type="button"
              :disabled="isDeleting"
              class="flex-1 text-sm font-semibold text-white bg-red-600 hover:bg-red-500 rounded-lg py-2.5 transition disabled:opacity-50"
              @click="confirmDelete"
            >
              {{ isDeleting ? 'Eliminando...' : 'Sí, eliminar' }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>
