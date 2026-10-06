<script setup lang="ts">
import { computed, onUnmounted, reactive, ref } from 'vue'
import {
  collection,
  doc,
  increment,
  onSnapshot,
  query,
  serverTimestamp,
  writeBatch,
  type Timestamp,
} from 'firebase/firestore'
import { db } from '../../config/firebase'
import { useAuthStore } from '../../stores/auth'
import { formatCOP, formatLocalDate } from '../../stores/booking'

// Informe de ventas de productos. Suma dos fuentes:
//  - productos de citas COMPLETADAS (ya están dentro del total de la cita),
//  - ventas directas (colección `ventas`), que se registran aquí y solo se
//    reflejan en esta sección, no en Reportes.
const props = defineProps<{
  productos: Array<{ id: string; name: string; price: number; stock: number }>
}>()

const authStore = useAuthStore()

interface CitaProducts {
  date: string
  status: string
  products: Array<{ id: string; name: string; price: number }>
}
interface Venta {
  id: string
  productId: string
  productName: string
  quantity: number
  unitPrice: number
  total: number
  date: string
  createdAt: Date | null
}

const citas = ref<CitaProducts[]>([])
const ventas = ref<Venta[]>([])
const loadError = ref('')

const unsubscribeCitas = onSnapshot(
  query(collection(db, 'citas')),
  (snapshot) => {
    citas.value = snapshot.docs
      .map((d) => {
        const data = d.data()
        const dateTime = (data.dateTime as Timestamp | undefined)?.toDate()
        return {
          date: String(data.date ?? (dateTime ? formatLocalDate(dateTime) : '')),
          status: String(data.status ?? ''),
          products: Array.isArray(data.products) ? data.products : [],
        }
      })
      .filter((c) => c.products.length > 0)
  },
  (err) => {
    console.error('No se pudieron cargar las citas', err)
    loadError.value = 'No se pudieron cargar las ventas.'
  },
)

const unsubscribeVentas = onSnapshot(
  query(collection(db, 'ventas')),
  (snapshot) => {
    ventas.value = snapshot.docs
      .map((d) => {
        const data = d.data()
        return {
          id: d.id,
          productId: String(data.productId ?? ''),
          productName: String(data.productName ?? ''),
          quantity: Number(data.quantity ?? 0),
          unitPrice: Number(data.unitPrice ?? 0),
          total: Number(data.total ?? 0),
          date: String(data.date ?? ''),
          createdAt: (data.createdAt as Timestamp | undefined)?.toDate() ?? null,
        }
      })
      .sort((a, b) => (a.date === b.date ? (b.createdAt?.getTime() ?? 0) - (a.createdAt?.getTime() ?? 0) : b.date.localeCompare(a.date)))
  },
  (err) => {
    console.error('No se pudieron cargar las ventas', err)
    loadError.value = 'No se pudieron cargar las ventas.'
  },
)

onUnmounted(() => {
  unsubscribeCitas()
  unsubscribeVentas()
})

// --- Periodo ------------------------------------------------------------------
const today = new Date()
const currentMonth = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`
const selectedMonth = ref(currentMonth) // "YYYY-MM" o '' = todo el historial

const periodLabel = computed(() => {
  if (!selectedMonth.value) return 'todo el historial'
  const [y, m] = selectedMonth.value.split('-').map(Number)
  return new Date(y!, m! - 1, 1).toLocaleDateString('es-CO', { month: 'long', year: 'numeric' })
})

const inPeriod = (date: string) => !selectedMonth.value || date.startsWith(selectedMonth.value)

const periodCitas = computed(() => citas.value.filter((c) => inPeriod(c.date)))
const periodVentas = computed(() => ventas.value.filter((v) => inPeriod(v.date)))

// --- Resumen por producto --------------------------------------------------------
interface Row {
  id: string
  name: string
  citaUnits: number
  citaIncome: number
  directUnits: number
  directIncome: number
  reserved: number
}

const rows = computed<Row[]>(() => {
  const map = new Map<string, Row>()
  const row = (id: string, name: string) => {
    let r = map.get(id)
    if (!r) {
      const current = props.productos.find((p) => p.id === id)
      r = { id, name: current?.name ?? name, citaUnits: 0, citaIncome: 0, directUnits: 0, directIncome: 0, reserved: 0 }
      map.set(id, r)
    }
    return r
  }
  for (const cita of periodCitas.value) {
    for (const product of cita.products) {
      const r = row(product.id, product.name)
      if (cita.status === 'completada') {
        r.citaUnits++
        r.citaIncome += Number(product.price) || 0
      } else if (cita.status === 'pendiente' || cita.status === 'confirmada') {
        r.reserved++
      }
    }
  }
  for (const venta of periodVentas.value) {
    const r = row(venta.productId, venta.productName)
    r.directUnits += venta.quantity
    r.directIncome += venta.total
  }
  return [...map.values()]
    .filter((r) => r.citaUnits + r.directUnits + r.reserved > 0)
    .sort((a, b) => b.citaUnits + b.directUnits - (a.citaUnits + a.directUnits))
})

const totals = computed(() =>
  rows.value.reduce(
    (acc, r) => ({
      units: acc.units + r.citaUnits + r.directUnits,
      citaIncome: acc.citaIncome + r.citaIncome,
      directIncome: acc.directIncome + r.directIncome,
      reserved: acc.reserved + r.reserved,
    }),
    { units: 0, citaIncome: 0, directIncome: 0, reserved: 0 },
  ),
)

const kpis = computed(() => [
  { label: 'Unidades vendidas', value: String(totals.value.units), accent: '#4a8fe7' },
  { label: 'Ingresos por productos', value: formatCOP(totals.value.citaIncome + totals.value.directIncome), accent: '#34d399' },
  { label: 'Ventas directas', value: formatCOP(totals.value.directIncome), accent: '#8cb8f5' },
  { label: 'Reservados en citas', value: String(totals.value.reserved), accent: '#f2b705' },
])

// --- Registrar venta directa ----------------------------------------------------
const isSaleFormOpen = ref(false)
const isSavingSale = ref(false)
const saleError = ref('')
const saleForm = reactive({ productId: '', quantity: '1', unitPrice: '', date: formatLocalDate(today) })

const saleProduct = computed(() => props.productos.find((p) => p.id === saleForm.productId) ?? null)
const saleTotal = computed(() => (Number(saleForm.quantity) || 0) * (Number(saleForm.unitPrice) || 0))

function openSaleForm() {
  saleForm.productId = ''
  saleForm.quantity = '1'
  saleForm.unitPrice = ''
  saleForm.date = formatLocalDate(new Date())
  saleError.value = ''
  isSaleFormOpen.value = true
}
function onSaleProductChange() {
  saleForm.unitPrice = saleProduct.value ? String(saleProduct.value.price ?? 0) : ''
}

async function saveSale() {
  saleError.value = ''
  const product = saleProduct.value
  const quantity = Number(saleForm.quantity)
  const unitPrice = Number(saleForm.unitPrice)
  if (!product) return (saleError.value = 'Elige el producto.')
  if (!Number.isInteger(quantity) || quantity < 1) return (saleError.value = 'La cantidad debe ser un número entero mayor a 0.')
  if (quantity > product.stock) return (saleError.value = `Solo hay ${product.stock} en stock.`)
  if (!Number.isFinite(unitPrice) || unitPrice < 0) return (saleError.value = 'Revisa el precio.')
  if (!saleForm.date || saleForm.date > formatLocalDate(new Date())) return (saleError.value = 'Elige una fecha válida (hoy o antes).')

  isSavingSale.value = true
  try {
    // La venta y el descuento de stock van en el mismo lote.
    const batch = writeBatch(db)
    batch.set(doc(collection(db, 'ventas')), {
      productId: product.id,
      productName: product.name,
      quantity,
      unitPrice,
      total: quantity * unitPrice,
      date: saleForm.date,
      createdAt: serverTimestamp(),
      createdBy: authStore.user?.uid ?? '',
    })
    batch.update(doc(db, 'productos', product.id), { stock: increment(-quantity) })
    await batch.commit()
    isSaleFormOpen.value = false
  } catch (err) {
    console.error('No se pudo registrar la venta', err)
    saleError.value = 'No se pudo registrar la venta. Intenta de nuevo.'
  } finally {
    isSavingSale.value = false
  }
}

// --- Anular venta directa (devuelve el stock) ----------------------------------
const ventaToDelete = ref<Venta | null>(null)
const isDeletingVenta = ref(false)

async function confirmDeleteVenta() {
  const venta = ventaToDelete.value
  if (!venta) return
  isDeletingVenta.value = true
  try {
    const batch = writeBatch(db)
    batch.delete(doc(db, 'ventas', venta.id))
    if (props.productos.some((p) => p.id === venta.productId)) {
      batch.update(doc(db, 'productos', venta.productId), { stock: increment(venta.quantity) })
    }
    await batch.commit()
    ventaToDelete.value = null
  } catch (err) {
    console.error('No se pudo anular la venta', err)
    loadError.value = 'No se pudo anular la venta. Intenta de nuevo.'
    ventaToDelete.value = null
  } finally {
    isDeletingVenta.value = false
  }
}

function formatDay(date: string) {
  const [y, m, d] = date.split('-').map(Number)
  return new Date(y!, m! - 1, d!).toLocaleDateString('es-CO', { day: '2-digit', month: 'short' })
}

const inputClass =
  'w-full bg-[#151515] border border-white/10 rounded-lg px-4 py-2.5 text-sm text-white placeholder-white/30 focus:outline-none focus:border-[#4a8fe7]/50'
</script>

<template>
  <div class="bg-[#0e0e0e] border border-white/10 rounded-xl p-5 mb-6">
    <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-4">
      <p class="text-sm font-semibold text-white">
        Informe de ventas <span class="text-white/40 font-normal">— {{ periodLabel }}</span>
      </p>
      <div class="flex flex-wrap items-center gap-2">
        <input
          v-model="selectedMonth"
          type="month"
          title="Filtrar por mes"
          class="bg-[#161616] border border-white/10 rounded-lg px-3 py-2 text-sm text-white/80 focus:outline-none focus:border-[#4a8fe7]/50"
        />
        <button
          type="button"
          class="px-3 py-2 text-xs rounded-lg border transition-colors"
          :class="selectedMonth ? 'border-white/10 text-white/60 hover:text-white hover:border-white/30' : 'border-[#4a8fe7]/60 bg-[#4a8fe7]/15 text-[#4a8fe7]'"
          @click="selectedMonth = selectedMonth ? '' : currentMonth"
        >
          {{ selectedMonth ? 'Ver todo' : 'Ver este mes' }}
        </button>
        <button
          v-if="!isSaleFormOpen"
          type="button"
          class="flex items-center gap-2 bg-gradient-to-b from-[#3f7fd6] to-[#2b5fa8] hover:from-[#5596ea] hover:to-[#336bb8] text-white font-semibold text-xs rounded-lg px-3 py-2 transition"
          @click="openSaleForm"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          Registrar venta
        </button>
      </div>
    </div>

    <p v-if="loadError" class="mb-4 text-sm text-red-400 bg-red-400/10 border border-red-400/20 rounded-lg px-4 py-2.5">
      {{ loadError }}
    </p>

    <!-- Registrar venta directa -->
    <form v-if="isSaleFormOpen" class="border border-white/10 rounded-xl p-4 mb-5 space-y-4" @submit.prevent="saveSale">
      <p class="text-xs tracking-wide text-[#4a8fe7]">VENTA DIRECTA (SIN CITA)</p>
      <div class="grid grid-cols-1 sm:grid-cols-4 gap-3">
        <div class="sm:col-span-2">
          <label class="block text-xs tracking-wide text-white/40 mb-1.5">PRODUCTO</label>
          <select v-model="saleForm.productId" :class="inputClass" @change="onSaleProductChange">
            <option value="" disabled class="bg-[#151515]">Elige un producto</option>
            <option v-for="p in productos" :key="p.id" :value="p.id" :disabled="p.stock <= 0" class="bg-[#151515]">
              {{ p.name }} — stock {{ p.stock }}
            </option>
          </select>
        </div>
        <div>
          <label class="block text-xs tracking-wide text-white/40 mb-1.5">CANTIDAD</label>
          <input v-model="saleForm.quantity" type="number" min="1" step="1" :max="saleProduct?.stock" :class="inputClass" />
        </div>
        <div>
          <label class="block text-xs tracking-wide text-white/40 mb-1.5">PRECIO C/U</label>
          <input v-model="saleForm.unitPrice" type="number" min="0" step="100" placeholder="25000" :class="inputClass" />
        </div>
        <div>
          <label class="block text-xs tracking-wide text-white/40 mb-1.5">FECHA</label>
          <input v-model="saleForm.date" type="date" :max="formatLocalDate(new Date())" :class="inputClass" />
        </div>
      </div>
      <p class="text-sm text-white/60">
        Total: <span class="font-bold text-[#4a8fe7]">{{ formatCOP(saleTotal) }}</span>
      </p>
      <p v-if="saleError" class="text-xs text-red-400">{{ saleError }}</p>
      <div class="flex items-center gap-3">
        <button
          type="submit"
          :disabled="isSavingSale"
          class="bg-gradient-to-b from-[#3f7fd6] to-[#2b5fa8] hover:from-[#5596ea] hover:to-[#336bb8] disabled:opacity-50 text-white font-semibold text-sm rounded-lg px-4 py-2 transition"
        >
          {{ isSavingSale ? 'Guardando...' : 'Guardar venta' }}
        </button>
        <button
          type="button"
          :disabled="isSavingSale"
          class="text-sm font-semibold text-white/70 border border-white/10 rounded-lg px-4 py-2 hover:border-white/25 hover:text-white transition"
          @click="isSaleFormOpen = false"
        >
          Cancelar
        </button>
      </div>
    </form>

    <!-- KPIs -->
    <div class="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
      <div v-for="kpi in kpis" :key="kpi.label" class="bg-[#151515] border border-white/10 rounded-xl p-4">
        <p class="text-xs text-white/50 mb-2 leading-tight">{{ kpi.label }}</p>
        <p class="text-lg font-bold" :style="{ color: kpi.accent }">{{ kpi.value }}</p>
      </div>
    </div>

    <!-- Por producto -->
    <p v-if="rows.length === 0" class="text-sm text-white/30 text-center py-6">Sin ventas en este periodo.</p>
    <div v-else class="overflow-x-auto -mx-5 px-5">
      <table class="w-full text-sm min-w-[620px]">
        <thead>
          <tr class="text-left text-xs text-white/40 border-b border-white/10">
            <th class="py-2 pr-4 font-medium">Producto</th>
            <th class="py-2 pr-4 font-medium text-right">En citas</th>
            <th class="py-2 pr-4 font-medium text-right">Venta directa</th>
            <th class="py-2 pr-4 font-medium text-right">Total vendidos</th>
            <th class="py-2 pr-4 font-medium text-right">Reservados</th>
            <th class="py-2 pl-4 font-medium text-right">Ingresos</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="row in rows" :key="row.id" class="border-b border-white/5 last:border-0">
            <td class="py-2.5 pr-4 text-white/80">{{ row.name }}</td>
            <td class="py-2.5 pr-4 text-right text-white/60">{{ row.citaUnits }}</td>
            <td class="py-2.5 pr-4 text-right text-white/60">{{ row.directUnits }}</td>
            <td class="py-2.5 pr-4 text-right text-white font-semibold">{{ row.citaUnits + row.directUnits }}</td>
            <td class="py-2.5 pr-4 text-right text-[#f2b705]/80">{{ row.reserved || '—' }}</td>
            <td class="py-2.5 pl-4 text-right text-[#34d399] font-medium">{{ formatCOP(row.citaIncome + row.directIncome) }}</td>
          </tr>
        </tbody>
      </table>
    </div>
    <p class="text-[11px] text-white/30 mt-3">
      "En citas" cuenta solo citas completadas. "Reservados" son productos de citas pendientes o confirmadas. Las ventas
      directas solo suman aquí, no en Reportes.
    </p>

    <!-- Ventas directas del periodo -->
    <div v-if="periodVentas.length" class="mt-5 pt-4 border-t border-white/10">
      <p class="text-xs tracking-wide text-white/40 mb-2">VENTAS DIRECTAS</p>
      <ul class="divide-y divide-white/5">
        <li v-for="venta in periodVentas" :key="venta.id" class="flex items-center justify-between gap-3 py-2.5 text-sm">
          <span class="min-w-0 truncate text-white/80">
            <span class="text-white/40 mr-2">{{ formatDay(venta.date) }}</span>
            {{ venta.quantity }} × {{ venta.productName }}
          </span>
          <span class="flex items-center gap-3 shrink-0">
            <span class="text-[#34d399] font-medium">{{ formatCOP(venta.total) }}</span>
            <button
              type="button"
              class="text-xs text-white/40 hover:text-red-400 transition"
              @click="ventaToDelete = venta"
            >
              Anular
            </button>
          </span>
        </li>
      </ul>
    </div>

    <!-- Modal: anular venta -->
    <Teleport to="body">
      <div v-if="ventaToDelete" class="fixed inset-0 bg-black/70 z-50 flex items-center justify-center px-4">
        <div class="w-full max-w-sm bg-[#0e0e0e] border border-white/10 rounded-2xl shadow-2xl overflow-hidden">
          <div class="px-6 pt-6 pb-4 text-center">
            <h2 class="font-serif text-lg font-bold text-white mb-1">¿Anular esta venta?</h2>
            <p class="text-sm text-white/50">
              {{ ventaToDelete.quantity }} × <span class="text-white font-semibold">{{ ventaToDelete.productName }}</span>
              ({{ formatCOP(ventaToDelete.total) }}). Las unidades vuelven al stock.
            </p>
          </div>
          <div class="flex items-center gap-3 px-6 pb-6 pt-2">
            <button
              type="button"
              :disabled="isDeletingVenta"
              class="flex-1 text-sm font-semibold text-white/70 border border-white/10 rounded-lg py-2.5 hover:border-white/25 hover:text-white transition disabled:opacity-50"
              @click="ventaToDelete = null"
            >
              Cancelar
            </button>
            <button
              type="button"
              :disabled="isDeletingVenta"
              class="flex-1 text-sm font-semibold text-white bg-red-600 hover:bg-red-500 rounded-lg py-2.5 transition disabled:opacity-50"
              @click="confirmDeleteVenta"
            >
              {{ isDeletingVenta ? 'Anulando...' : 'Anular' }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>
