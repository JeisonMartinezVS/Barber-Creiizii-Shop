<script setup lang="ts">
import { computed, onMounted, onUnmounted, reactive, ref } from 'vue'
import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  writeBatch,
} from 'firebase/firestore'
import { db } from '../config/firebase'
import { LOW_STOCK_THRESHOLD } from '../stores/booking'
import { PRODUCT_CATALOG } from '../config/productCatalog'
import DashboardStats from '../components/dashboard/DashboardStats.vue'
import ToggleSwitch from '../ui/ToggleSwitch.vue'

interface Producto {
  id: string
  name: string
  brand: string
  price: number
  stock: number
  description: string
  active: boolean
  image?: string
}

const catalogIds = new Set(PRODUCT_CATALOG.map((p) => p.id))
const isCatalogProduct = (producto: Producto) => catalogIds.has(producto.id)

const productos = ref<Producto[]>([])
let unsubscribe: (() => void) | null = null

onMounted(() => {
  const q = query(collection(db, 'productos'), orderBy('name'))
  unsubscribe = onSnapshot(q, (snapshot) => {
    productos.value = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }) as Producto)
  })
})
onUnmounted(() => unsubscribe?.())

// Productos del catálogo que todavía no están en Firestore.
const missingCount = computed(() => {
  const existing = new Set(productos.value.map((p) => p.id))
  return PRODUCT_CATALOG.filter((p) => !existing.has(p.id)).length
})

// --- Guardar catálogo en Firestore ----------------------------------------
// Crea los productos que falten (stock 0, activos) y refresca en los que ya
// existen la imagen, marca, precio y descripción del catálogo. Nunca pisa el
// nombre ni el stock, que se editan desde este panel.
const isSyncing = ref(false)
const syncMessage = ref('')
const syncError = ref(false)

async function syncCatalog() {
  isSyncing.value = true
  syncMessage.value = ''
  syncError.value = false
  try {
    const snapshot = await getDocs(collection(db, 'productos'))
    const existing = new Set(snapshot.docs.map((d) => d.id))
    const batch = writeBatch(db)
    let created = 0
    for (const item of PRODUCT_CATALOG) {
      const productRef = doc(db, 'productos', item.id)
      const fixed = { image: item.image, brand: item.brand, price: item.price, description: item.description }
      if (existing.has(item.id)) {
        batch.update(productRef, fixed)
      } else {
        batch.set(productRef, { ...fixed, name: item.name, stock: 0, active: true, createdAt: serverTimestamp() })
        created++
      }
    }
    await batch.commit()
    syncMessage.value = created
      ? `Se crearon ${created} producto${created === 1 ? '' : 's'}. Ahora asígnales stock.`
      : 'Productos actualizados.'
  } catch (err) {
    console.error('No se pudo guardar el catálogo', err)
    syncError.value = true
    syncMessage.value = 'No se pudieron guardar los productos.'
  } finally {
    isSyncing.value = false
  }
}

// --- Formulario en línea (solo nombre y stock) -----------------------------
const editingProduct = ref<Producto | null>(null)
const isSaving = ref(false)
const formError = ref('')

const form = reactive({
  name: '',
  stock: '',
})

function openEditForm(producto: Producto) {
  editingProduct.value = producto
  form.name = producto.name
  form.stock = String(producto.stock ?? 0)
  formError.value = ''
}
function closeForm() {
  if (isSaving.value) return
  editingProduct.value = null
}

async function saveProduct() {
  if (!editingProduct.value) return
  formError.value = ''
  const name = String(form.name).trim()
  if (!name) {
    formError.value = 'El nombre es obligatorio.'
    return
  }
  const stockRaw = String(form.stock).trim()
  const stock = stockRaw ? Number(stockRaw) : 0
  if (!Number.isInteger(stock) || stock < 0) {
    formError.value = 'El stock debe ser un número entero mayor o igual a 0.'
    return
  }

  isSaving.value = true
  try {
    await updateDoc(doc(db, 'productos', editingProduct.value.id), { name, stock })
    editingProduct.value = null
  } catch (err) {
    console.error('No se pudo guardar el producto', err)
    formError.value = 'No se pudo guardar el producto.'
  } finally {
    isSaving.value = false
  }
}

async function toggleActive(producto: Producto) {
  await updateDoc(doc(db, 'productos', producto.id), { active: !producto.active })
}

// --- Eliminar (solo productos antiguos, fuera del catálogo) ---------------
const productToDelete = ref<Producto | null>(null)
const isDeleting = ref(false)

function askDelete(producto: Producto) {
  productToDelete.value = producto
}
function cancelDelete() {
  if (isDeleting.value) return
  productToDelete.value = null
}
async function confirmDelete() {
  if (!productToDelete.value) return
  isDeleting.value = true
  try {
    await deleteDoc(doc(db, 'productos', productToDelete.value.id))
    productToDelete.value = null
  } finally {
    isDeleting.value = false
  }
}
</script>

<template>
  <div>
    <DashboardStats />

    <div class="flex items-center justify-between mb-4">
      <h1 class="font-serif text-xl font-bold text-white">Productos</h1>
      <button
        type="button"
        :disabled="isSyncing"
        class="flex items-center gap-2 bg-gradient-to-b from-[#b6903f] to-[#8f7130] hover:from-[#c39c47] hover:to-[#9c7c37] disabled:opacity-50 text-[#1a1408] font-semibold text-sm rounded-lg px-4 py-2 transition"
        @click="syncCatalog"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2Z" /><polyline points="17 21 17 13 7 13 7 21" /><polyline points="7 3 7 8 15 8" />
        </svg>
        {{ isSyncing ? 'Guardando...' : 'Guardar productos' }}
      </button>
    </div>

    <p v-if="syncMessage" class="text-xs mb-4" :class="syncError ? 'text-red-400' : 'text-[#34d399]'">{{ syncMessage }}</p>
    <p v-else-if="missingCount > 0" class="text-xs text-[#f2b705] mb-4">
      Hay {{ missingCount }} producto{{ missingCount === 1 ? '' : 's' }} del catálogo sin guardar en Firebase. Pulsa
      «Guardar productos».
    </p>

    <!-- Formulario en línea: solo nombre y stock -->
    <div v-if="editingProduct" class="bg-[#0e0e0e] border border-white/10 rounded-xl p-5 mb-6">
      <p class="text-sm font-semibold text-[#c9a24b] mb-4">Editar producto</p>

      <form class="space-y-4" @submit.prevent="saveProduct">
        <div class="flex flex-col sm:flex-row gap-4">
          <img
            v-if="editingProduct.image"
            :src="editingProduct.image"
            :alt="editingProduct.name"
            class="w-24 h-24 shrink-0 rounded-lg object-cover border border-white/10"
          />
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 grow">
            <div>
              <label class="block text-xs tracking-wide text-white/40 mb-1.5">NOMBRE <span class="text-[#c9a24b]">*</span></label>
              <input
                v-model="form.name"
                type="text"
                placeholder="Nombre del producto"
                class="w-full bg-[#151515] border border-white/10 rounded-lg px-4 py-2.5 text-sm text-white placeholder-white/30 focus:outline-none focus:border-[#c9a24b]/50"
              />
            </div>
            <div>
              <label class="block text-xs tracking-wide text-white/40 mb-1.5">STOCK</label>
              <input
                v-model="form.stock"
                type="number"
                min="0"
                step="1"
                placeholder="10"
                class="w-full bg-[#151515] border border-white/10 rounded-lg px-4 py-2.5 text-sm text-white placeholder-white/30 focus:outline-none focus:border-[#c9a24b]/50"
              />
            </div>
          </div>
        </div>

        <p v-if="formError" class="text-xs text-red-400">{{ formError }}</p>

        <div class="flex items-center gap-3">
          <button
            type="submit"
            :disabled="isSaving"
            class="flex items-center gap-2 bg-gradient-to-b from-[#b6903f] to-[#8f7130] hover:from-[#c39c47] hover:to-[#9c7c37] disabled:opacity-50 text-[#1a1408] font-semibold text-sm rounded-lg px-4 py-2 transition"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2Z" /><polyline points="17 21 17 13 7 13 7 21" /><polyline points="7 3 7 8 15 8" />
            </svg>
            {{ isSaving ? 'Guardando...' : 'Guardar' }}
          </button>
          <button
            type="button"
            :disabled="isSaving"
            class="flex items-center gap-2 text-sm font-semibold text-white/70 border border-white/10 rounded-lg px-4 py-2 hover:border-white/25 hover:text-white transition"
            @click="closeForm"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
            Cancelar
          </button>
        </div>
      </form>
    </div>

    <!-- Lista de productos -->
    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div
        v-for="producto in productos"
        :key="producto.id"
        class="bg-[#0e0e0e] border border-white/10 rounded-xl px-5 py-4 flex items-center justify-between"
      >
        <div class="flex items-center gap-4 min-w-0">
          <img
            v-if="producto.image"
            :src="producto.image"
            :alt="producto.name"
            loading="lazy"
            class="w-12 h-12 shrink-0 rounded-lg object-cover border border-white/10"
          />
          <div
            v-else
            class="w-12 h-12 shrink-0 rounded-lg flex items-center justify-center bg-[#3a2f12] text-[#c9a24b] border border-[#c9a24b]/20"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" />
              <polyline points="3.27 6.96 12 12.01 20.73 6.96" /><line x1="12" y1="22.08" x2="12" y2="12" />
            </svg>
          </div>
          <div class="min-w-0">
            <p class="text-sm font-semibold text-white truncate">{{ producto.name }}</p>
            <p class="text-xs text-white/40 mb-1 truncate">{{ producto.brand }}</p>
            <p class="text-xs">
              <span class="text-[#c9a24b] font-semibold">${{ (producto.price ?? 0).toLocaleString('es-CO') }}</span>
              <span class="text-white/30 mx-1.5">·</span>
              <span v-if="producto.stock <= 0" class="text-red-400 font-semibold">Agotado</span>
              <span v-else-if="producto.stock <= LOW_STOCK_THRESHOLD" class="text-[#f2b705] font-semibold">
                Stock: {{ producto.stock }} · por agotarse
              </span>
              <span v-else class="text-[#34d399]">Stock: {{ producto.stock }}</span>
            </p>
          </div>
        </div>

        <div class="flex items-center gap-2 shrink-0">
          <ToggleSwitch :model-value="producto.active" @update:model-value="toggleActive(producto)" />
          <button
            type="button"
            class="w-9 h-9 flex items-center justify-center rounded-lg border border-white/10 text-white/50 hover:text-white hover:border-white/20 transition"
            aria-label="Editar"
            @click="openEditForm(producto)"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
              <path d="M18.5 2.5a2.12 2.12 0 0 1 3 3L12 15l-4 1 1-4Z" />
            </svg>
          </button>
          <button
            v-if="!isCatalogProduct(producto)"
            type="button"
            class="w-9 h-9 flex items-center justify-center rounded-lg border border-white/10 text-white/50 hover:text-red-400 hover:border-red-400/30 transition"
            aria-label="Eliminar"
            @click="askDelete(producto)"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="3 6 5 6 21 6" />
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
            </svg>
          </button>
        </div>
      </div>

      <p v-if="productos.length === 0" class="text-sm text-white/30 text-center py-10 md:col-span-2">
        Sin productos registrados todavía. Pulsa «Guardar productos» para cargar el catálogo.
      </p>
    </div>

    <!-- Modal: confirmar eliminación -->
    <Teleport to="body">
      <div v-if="productToDelete" class="fixed inset-0 bg-black/70 z-50 flex items-center justify-center px-4">
        <div class="w-full max-w-sm bg-[#0e0e0e] border border-white/10 rounded-2xl shadow-2xl overflow-hidden">
          <div class="px-6 pt-6 pb-4 text-center">
            <div class="w-12 h-12 mx-auto mb-4 rounded-full bg-red-500/10 border border-red-500/30 flex items-center justify-center text-red-400">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="3 6 5 6 21 6" />
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
              </svg>
            </div>
            <h2 class="font-serif text-lg font-bold text-white mb-1">¿Eliminar este producto?</h2>
            <p class="text-sm text-white/50">
              <span class="text-white font-semibold">{{ productToDelete.name }}</span> se eliminará permanentemente.
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
              {{ isDeleting ? 'Eliminando...' : 'Eliminar' }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>
