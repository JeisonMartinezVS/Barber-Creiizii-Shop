<script setup lang="ts">
import { computed, onUnmounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  Timestamp,
  where,
  type QueryDocumentSnapshot,
} from 'firebase/firestore'
import { db } from '../config/firebase'
import { useAuthStore } from '../stores/auth'
import { formatLocalDate, formatTime12 } from '../stores/booking'
import { STATUS_LABELS, type AuditCategory } from '../lib/audit'

// Vista exclusiva del super admin: consulta de todo lo que pasa en la página
// (colección `auditoria`). Solo lectura: los registros no se pueden editar.

interface AuditLog {
  id: string
  at: Date
  action: string
  category: LogCategory
  summary: string
  source: 'web' | 'panel' | 'sistema'
  userAgent: string
  actorType: 'cliente' | 'personal' | 'sistema'
  actorUid: string
  actorName: string
  actorRole: string
  citaId: string
  customerName: string
  customerPhone: string
  barberoId: string
  targetId: string
  changes?: Record<string, { from: unknown; to: unknown }>
  data?: Record<string, unknown>
}

const router = useRouter()
const authStore = useAuthStore()

// 'sistema' solo lo escribe la limpieza diaria (scripts/cleanupDisponibilidad.mjs).
type LogCategory = AuditCategory | 'sistema'

const CATEGORIES: Array<{ id: LogCategory; label: string; color: string }> = [
  { id: 'cita', label: 'Citas', color: '#4a8fe7' },
  { id: 'cliente', label: 'Clientes', color: '#a78bfa' },
  { id: 'empleado', label: 'Empleados', color: '#f2994a' },
  { id: 'producto', label: 'Productos', color: '#34d399' },
  { id: 'venta', label: 'Ventas', color: '#2dd4bf' },
  { id: 'servicio', label: 'Servicios', color: '#f472b6' },
  { id: 'horario', label: 'Horarios', color: '#facc15' },
  { id: 'sesion', label: 'Sesiones', color: '#94a3b8' },
  { id: 'sistema', label: 'Sistema', color: '#64748b' },
]
const CATEGORY_BY_ID = Object.fromEntries(CATEGORIES.map((c) => [c.id, c]))

const ACTION_LABELS: Record<string, string> = {
  'cita.creada': 'Reserva creada',
  'cita.cancelada': 'Cancelada por el cliente',
  'cita.estado': 'Cambio de estado',
  'cita.hora': 'Cambio de hora',
  'cita.eliminada': 'Cita eliminada',
  'cliente.registrado': 'Cliente registrado',
  'cliente.asociado': 'Cliente asociado',
  'cliente.eliminado': 'Cliente eliminado',
  'empleado.creado': 'Empleado creado',
  'empleado.editado': 'Empleado editado',
  'empleado.activado': 'Empleado activado',
  'empleado.desactivado': 'Empleado desactivado',
  'empleado.eliminado': 'Empleado eliminado',
  'producto.catalogo': 'Catálogo sincronizado',
  'producto.editado': 'Producto editado',
  'producto.activado': 'Producto activado',
  'producto.desactivado': 'Producto desactivado',
  'producto.eliminado': 'Producto eliminado',
  'venta.registrada': 'Venta registrada',
  'venta.anulada': 'Venta anulada',
  'servicio.creado': 'Corte creado',
  'servicio.editado': 'Corte editado',
  'servicio.activado': 'Corte activado',
  'servicio.desactivado': 'Corte desactivado',
  'servicio.eliminado': 'Corte eliminado',
  'horario.actualizado': 'Horario actualizado',
  'sesion.inicio': 'Inicio de sesión',
  'sesion.cierre': 'Cierre de sesión',
  'sesion.contrasena': 'Cambio de contraseña',
  'sistema.limpieza': 'Limpieza de horarios',
}
const ROLE_LABELS: Record<string, string> = {
  cliente: 'Cliente',
  admin: 'Admin',
  empleado: 'Empleado',
  superadmin: 'Super admin',
  sistema: 'Automático',
}

function toLog(d: QueryDocumentSnapshot): AuditLog {
  const data = d.data({ serverTimestamps: 'estimate' })
  const at = data.at instanceof Timestamp ? data.at.toDate() : new Date()
  return { id: d.id, ...(data as Omit<AuditLog, 'id' | 'at'>), at }
}

// --- Consulta principal: rango de fechas, en vivo ----------------------------
const MAX_RESULTS = 2000
const todayStr = formatLocalDate(new Date())
const dateFrom = ref(todayStr)
const dateTo = ref(todayStr)

function parseLocalDate(value: string) {
  const [y, m, d] = value.split('-').map(Number)
  return new Date(y!, m! - 1, d!)
}

const logs = ref<AuditLog[]>([])
const isLoading = ref(true)
const loadError = ref('')
let unsubscribe: (() => void) | null = null

function subscribe() {
  unsubscribe?.()
  if (!dateFrom.value || !dateTo.value) return
  const start = parseLocalDate(dateFrom.value <= dateTo.value ? dateFrom.value : dateTo.value)
  const end = parseLocalDate(dateFrom.value <= dateTo.value ? dateTo.value : dateFrom.value)
  end.setDate(end.getDate() + 1)
  isLoading.value = true
  loadError.value = ''
  // Un solo campo con rango + orden por ese mismo campo: no necesita índice compuesto.
  unsubscribe = onSnapshot(
    query(
      collection(db, 'auditoria'),
      where('at', '>=', Timestamp.fromDate(start)),
      where('at', '<', Timestamp.fromDate(end)),
      orderBy('at', 'desc'),
      limit(MAX_RESULTS),
    ),
    (snapshot) => {
      logs.value = snapshot.docs.map(toLog)
      isLoading.value = false
    },
    (err) => {
      console.error('No se pudo cargar la auditoría', err)
      loadError.value = 'No se pudo cargar la auditoría. Revisa que tu cuenta tenga el permiso de super admin.'
      isLoading.value = false
    },
  )
}
watch([dateFrom, dateTo], subscribe, { immediate: true })
onUnmounted(() => unsubscribe?.())

function setRange(days: number) {
  const from = new Date()
  from.setDate(from.getDate() - (days - 1))
  dateFrom.value = formatLocalDate(from)
  dateTo.value = todayStr
}

// --- Filtros locales -----------------------------------------------------------
const search = ref('')
const selectedCategories = ref<Set<LogCategory>>(new Set())
const actorFilter = ref<'todos' | 'cliente' | 'personal'>('todos')

function toggleCategory(id: LogCategory) {
  const next = new Set(selectedCategories.value)
  if (next.has(id)) next.delete(id)
  else next.add(id)
  selectedCategories.value = next
}

function normalize(text: string) {
  return text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
}

const filteredLogs = computed(() => {
  const terms = normalize(search.value.trim()).split(/\s+/).filter(Boolean)
  return logs.value.filter((log) => {
    if (selectedCategories.value.size && !selectedCategories.value.has(log.category)) return false
    if (actorFilter.value !== 'todos' && log.actorType !== actorFilter.value) return false
    if (!terms.length) return true
    const haystack = normalize(
      [
        log.summary,
        log.actorName,
        log.customerName,
        log.customerPhone,
        log.citaId,
        log.targetId,
        log.action,
        ACTION_LABELS[log.action] ?? '',
      ].join(' '),
    )
    return terms.every((t) => haystack.includes(t))
  })
})

const stats = computed(() => {
  const count = (action: string) => logs.value.filter((l) => l.action === action).length
  return [
    { label: 'Eventos', value: logs.value.length, color: '#ffffff' },
    { label: 'Reservas', value: count('cita.creada'), color: '#4a8fe7' },
    {
      label: 'Cancelaciones',
      value:
        count('cita.cancelada') +
        logs.value.filter((l) => l.action === 'cita.estado' && l.changes?.status?.to === 'cancelada').length,
      color: '#f87171',
    },
    { label: 'Cambios de estado', value: count('cita.estado'), color: '#a78bfa' },
    { label: 'Eliminaciones', value: logs.value.filter((l) => l.action.endsWith('.eliminada') || l.action.endsWith('.eliminado')).length, color: '#f2994a' },
  ]
})

// --- Detalle --------------------------------------------------------------------
const expandedId = ref<string | null>(null)
function toggleExpanded(id: string) {
  expandedId.value = expandedId.value === id ? null : id
}

function formatValue(value: unknown): string {
  if (value === null || value === undefined || value === '') return '—'
  if (typeof value === 'boolean') return value ? 'Sí' : 'No'
  if (typeof value === 'string') {
    if (STATUS_LABELS[value]) return STATUS_LABELS[value]!
    if (/^\d{2}:\d{2}$/.test(value)) return formatTime12(value)
    return value
  }
  if (Array.isArray(value)) return value.length ? value.map(formatValue).join(', ') : '—'
  return JSON.stringify(value)
}

const DATA_LABELS: Record<string, string> = {
  date: 'Fecha',
  time: 'Hora',
  serviceName: 'Servicio',
  barberoName: 'Barbero',
  total: 'Total',
  products: 'Productos',
  status: 'Estado',
  slotReleased: 'Horario liberado',
  oldSlotReleased: 'Hora anterior liberada',
  name: 'Nombre',
  username: 'Usuario',
  phone: 'Celular',
  role: 'Rol',
  title: 'Categoría',
  price: 'Precio',
  duration: 'Duración',
  quantity: 'Cantidad',
  unitPrice: 'Precio unitario',
  productName: 'Producto',
  created: 'Creados',
  deleted: 'Borrados',
  barberoIds: 'Barberos',
}
const CHANGE_LABELS: Record<string, string> = { status: 'Estado', time: 'Hora', active: 'Activo', name: 'Nombre', phone: 'Celular', stock: 'Stock' }

function dataEntries(log: AuditLog) {
  return Object.entries(log.data ?? {})
    .filter(([key, v]) => !['productId', 'before', 'after'].includes(key) && v !== '' && v !== null)
    .map(([key, v]) => ({ key: DATA_LABELS[key] ?? key, value: formatValue(v) }))
}

function formatDateTime(d: Date) {
  return d.toLocaleString('es-CO', {
    day: '2-digit',
    month: 'short',
    hour: 'numeric',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
  })
}
function formatClock(d: Date) {
  return d.toLocaleTimeString('es-CO', { hour: 'numeric', minute: '2-digit', second: '2-digit', hour12: true })
}
function formatDay(d: Date) {
  return d.toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long' })
}

const groupedLogs = computed(() => {
  const groups: Array<{ key: string; label: string; logs: AuditLog[] }> = []
  for (const log of filteredLogs.value) {
    const key = formatLocalDate(log.at)
    let group = groups[groups.length - 1]
    if (!group || group.key !== key) {
      group = { key, label: formatDay(log.at), logs: [] }
      groups.push(group)
    }
    group.logs.push(log)
  }
  return groups
})

// --- Historial de una cita o de un cliente (todo el tiempo) ------------------------
interface HistoryPanel {
  title: string
  subtitle: string
  logs: AuditLog[]
  isLoading: boolean
  current: string
}
const history = ref<HistoryPanel | null>(null)

async function openHistory(kind: 'cita' | 'cliente', log: AuditLog) {
  const isCita = kind === 'cita'
  history.value = {
    title: isCita ? 'Historial de la cita' : 'Historial del cliente',
    subtitle: isCita ? `${log.customerName || 'Cliente'} · ${log.citaId}` : `${log.customerName} · ${log.customerPhone}`,
    logs: [],
    isLoading: true,
    current: '',
  }
  try {
    // Igualdad en un solo campo: tampoco necesita índice compuesto.
    const snap = await getDocs(
      query(
        collection(db, 'auditoria'),
        isCita ? where('citaId', '==', log.citaId) : where('customerPhone', '==', log.customerPhone),
        limit(500),
      ),
    )
    const list = snap.docs.map(toLog).sort((a, b) => a.at.getTime() - b.at.getTime())
    let current = ''
    if (isCita) {
      const cita = await getDoc(doc(db, 'citas', log.citaId))
      current = cita.exists()
        ? `Estado actual: ${STATUS_LABELS[cita.data().status as string] ?? cita.data().status} · ${cita.data().date} a las ${formatTime12(cita.data().time as string)}`
        : 'La cita ya no existe (fue eliminada).'
    }
    if (history.value) history.value = { ...history.value, logs: list, isLoading: false, current }
  } catch (err) {
    console.error('No se pudo cargar el historial', err)
    if (history.value) history.value = { ...history.value, isLoading: false, current: 'No se pudo cargar el historial.' }
  }
}

// --- Exportar ------------------------------------------------------------------------
function exportCsv() {
  const header = ['fecha', 'accion', 'categoria', 'resumen', 'actor', 'rol', 'origen', 'cliente', 'celular', 'citaId', 'cambios']
  const escape = (v: string) => `"${v.replace(/"/g, '""')}"`
  const rows = filteredLogs.value.map((l) =>
    [
      l.at.toISOString(),
      l.action,
      l.category,
      l.summary,
      l.actorName,
      l.actorRole,
      l.source,
      l.customerName,
      l.customerPhone,
      l.citaId,
      l.changes ? Object.entries(l.changes).map(([k, c]) => `${k}: ${formatValue(c.from)} → ${formatValue(c.to)}`).join('; ') : '',
    ]
      .map((v) => escape(String(v ?? '')))
      .join(','),
  )
  const blob = new Blob(['﻿' + [header.join(','), ...rows].join('\n')], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `auditoria_${dateFrom.value}_${dateTo.value}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

async function handleLogout() {
  await authStore.logout()
  router.push({ name: 'Login' })
}
</script>

<template>
  <div class="min-h-screen bg-[#050505] text-white">
    <!-- Barra superior -->
    <header class="sticky top-0 z-20 border-b border-white/10 bg-[#050505]/95 backdrop-blur">
      <div class="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
        <div class="flex items-center gap-3 min-w-0">
          <div class="w-9 h-9 shrink-0 rounded-lg bg-[#0f2140] border border-[#4a8fe7]/30 flex items-center justify-center text-[#4a8fe7]">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            </svg>
          </div>
          <div class="min-w-0">
            <p class="font-serif font-bold leading-tight">Auditoría</p>
            <p class="text-[11px] text-white/40 truncate">Super admin · {{ authStore.name }}</p>
          </div>
        </div>
        <button
          type="button"
          class="flex items-center gap-2 text-sm text-white/50 hover:text-white border border-white/10 hover:border-white/25 rounded-lg px-3 py-1.5 transition"
          @click="handleLogout"
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" />
          </svg>
          <span class="hidden sm:inline">Cerrar sesión</span>
        </button>
      </div>
    </header>

    <main class="max-w-6xl mx-auto px-4 py-5 space-y-4">
      <!-- Rango de fechas -->
      <section class="bg-[#0e0e0e] border border-white/10 rounded-xl p-4 space-y-3">
        <div class="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div class="flex flex-wrap items-end gap-2">
            <label class="text-xs text-white/40">
              Desde
              <input
                v-model="dateFrom"
                type="date"
                :max="todayStr"
                class="mt-1 block bg-[#151515] border border-white/10 rounded-lg px-3 py-2 text-sm text-white/80 focus:outline-none focus:border-[#4a8fe7]/50"
              />
            </label>
            <label class="text-xs text-white/40">
              Hasta
              <input
                v-model="dateTo"
                type="date"
                :max="todayStr"
                class="mt-1 block bg-[#151515] border border-white/10 rounded-lg px-3 py-2 text-sm text-white/80 focus:outline-none focus:border-[#4a8fe7]/50"
              />
            </label>
            <div class="flex gap-1">
              <button
                v-for="r in [{ d: 1, l: 'Hoy' }, { d: 7, l: '7 días' }, { d: 30, l: '30 días' }]"
                :key="r.d"
                type="button"
                class="text-xs text-white/60 border border-white/10 rounded-lg px-2.5 py-2 hover:border-[#4a8fe7]/50 hover:text-white transition"
                @click="setRange(r.d)"
              >
                {{ r.l }}
              </button>
            </div>
          </div>
          <button
            type="button"
            :disabled="!filteredLogs.length"
            class="flex items-center justify-center gap-2 text-xs font-semibold text-white/70 border border-white/10 rounded-lg px-3 py-2 hover:border-white/25 hover:text-white transition disabled:opacity-40"
            @click="exportCsv"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            Exportar CSV
          </button>
        </div>

        <!-- Búsqueda -->
        <div class="relative">
          <svg class="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            v-model="search"
            type="search"
            placeholder="Buscar por cliente, celular, empleado, id de cita o acción…"
            class="w-full bg-[#151515] border border-white/10 rounded-lg pl-9 pr-3 py-2.5 text-sm text-white placeholder-white/30 focus:outline-none focus:border-[#4a8fe7]/50"
          />
        </div>

        <!-- Categorías y origen -->
        <div class="flex flex-wrap items-center gap-1.5">
          <button
            v-for="cat in CATEGORIES"
            :key="cat.id"
            type="button"
            class="text-xs font-semibold rounded-full border px-3 py-1 transition"
            :style="
              selectedCategories.has(cat.id)
                ? { color: '#050505', backgroundColor: cat.color, borderColor: cat.color }
                : { color: cat.color, borderColor: cat.color + '55' }
            "
            @click="toggleCategory(cat.id)"
          >
            {{ cat.label }}
          </button>
          <span class="mx-1 h-4 w-px bg-white/10"></span>
          <select
            v-model="actorFilter"
            class="bg-[#151515] border border-white/10 rounded-full px-3 py-1 text-xs text-white/70 focus:outline-none"
          >
            <option value="todos">Clientes y personal</option>
            <option value="cliente">Solo clientes (web)</option>
            <option value="personal">Solo personal (panel)</option>
          </select>
        </div>
      </section>

      <!-- Resumen -->
      <section class="grid grid-cols-2 sm:grid-cols-5 gap-2">
        <div v-for="s in stats" :key="s.label" class="bg-[#0e0e0e] border border-white/10 rounded-xl px-4 py-3">
          <p class="text-[11px] text-white/40">{{ s.label }}</p>
          <p class="text-xl font-bold" :style="{ color: s.color }">{{ s.value }}</p>
        </div>
      </section>

      <p v-if="loadError" class="text-sm text-red-400 bg-red-400/10 border border-red-400/20 rounded-lg px-4 py-2.5">
        {{ loadError }}
      </p>
      <p v-if="logs.length >= MAX_RESULTS" class="text-xs text-[#f2b705]">
        Se muestran los {{ MAX_RESULTS }} eventos más recientes del rango. Acorta las fechas para ver el resto.
      </p>

      <!-- Resultados -->
      <section>
        <p class="text-xs text-white/40 mb-2">
          {{ filteredLogs.length }} de {{ logs.length }} eventos
          <span class="inline-flex items-center gap-1 ml-2 text-emerald-400/80">
            <span class="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span> en vivo
          </span>
        </p>

        <div v-if="isLoading" class="bg-[#0e0e0e] border border-white/10 rounded-xl py-16 text-center text-sm text-white/40">
          Cargando eventos…
        </div>
        <div
          v-else-if="!filteredLogs.length"
          class="bg-[#0e0e0e] border border-white/10 rounded-xl py-16 text-center text-sm text-white/40"
        >
          No hay eventos con estos filtros.
        </div>

        <div v-else class="space-y-6">
          <div v-for="group in groupedLogs" :key="group.key">
            <p class="text-xs font-semibold text-white/50 uppercase tracking-wider mb-2">{{ group.label }}</p>
            <div class="bg-[#0e0e0e] border border-white/10 rounded-xl divide-y divide-white/5 overflow-hidden">
              <div v-for="log in group.logs" :key="log.id">
                <button
                  type="button"
                  class="w-full text-left px-4 py-3 hover:bg-white/[0.02] transition flex gap-3"
                  :aria-expanded="expandedId === log.id"
                  @click="toggleExpanded(log.id)"
                >
                  <span
                    class="mt-1.5 w-2 h-2 shrink-0 rounded-full"
                    :style="{ backgroundColor: CATEGORY_BY_ID[log.category]?.color ?? '#888' }"
                  ></span>
                  <span class="min-w-0 flex-1">
                    <span class="flex flex-wrap items-center gap-x-2 gap-y-1">
                      <span class="text-xs font-mono text-white/40">{{ formatClock(log.at) }}</span>
                      <span
                        class="text-[11px] font-semibold rounded px-1.5 py-0.5"
                        :style="{
                          color: CATEGORY_BY_ID[log.category]?.color,
                          backgroundColor: (CATEGORY_BY_ID[log.category]?.color ?? '#888') + '1f',
                        }"
                      >
                        {{ ACTION_LABELS[log.action] ?? log.action }}
                      </span>
                      <span class="text-[11px] text-white/40">
                        {{ log.actorName || 'Sin nombre' }} · {{ ROLE_LABELS[log.actorRole] ?? log.actorRole }}
                        · {{ log.source === 'web' ? 'Web' : log.source === 'sistema' ? 'Sistema' : 'Panel' }}
                      </span>
                    </span>
                    <span class="block text-sm text-white/85 mt-1">{{ log.summary }}</span>
                  </span>
                  <svg
                    class="mt-1 shrink-0 text-white/30 transition-transform"
                    :class="expandedId === log.id ? 'rotate-180' : ''"
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                  >
                    <polyline points="6 9 12 15 18 9" />
                  </svg>
                </button>

                <!-- Detalle -->
                <div v-if="expandedId === log.id" class="px-4 pb-4 pl-9 space-y-3 text-xs">
                  <div v-if="log.changes && Object.keys(log.changes).length" class="space-y-1">
                    <p class="text-white/40 font-semibold uppercase tracking-wider text-[10px]">Cambios</p>
                    <div v-for="(c, key) in log.changes" :key="key" class="flex flex-wrap items-center gap-2">
                      <span class="text-white/50 w-24">{{ CHANGE_LABELS[key] ?? key }}</span>
                      <span class="text-red-300/80 line-through">{{ formatValue(c.from) }}</span>
                      <span class="text-white/30">→</span>
                      <span class="text-emerald-300 font-semibold">{{ formatValue(c.to) }}</span>
                    </div>
                  </div>

                  <div v-if="dataEntries(log).length" class="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1">
                    <div v-for="entry in dataEntries(log)" :key="entry.key" class="flex gap-2">
                      <span class="text-white/40 w-32 shrink-0">{{ entry.key }}</span>
                      <span class="text-white/80 break-words min-w-0">{{ entry.value }}</span>
                    </div>
                  </div>

                  <div class="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1 text-white/40">
                    <p>Fecha exacta: <span class="text-white/70">{{ formatDateTime(log.at) }}</span></p>
                    <p v-if="log.customerPhone">
                      Cliente: <span class="text-white/70">{{ log.customerName }} · {{ log.customerPhone }}</span>
                    </p>
                    <p v-if="log.citaId" class="break-all">Id cita: <span class="font-mono text-white/70">{{ log.citaId }}</span></p>
                    <p v-if="log.actorUid" class="break-all">Id de quien actuó: <span class="font-mono text-white/70">{{ log.actorUid }}</span></p>
                    <p v-if="log.targetId && log.targetId !== log.citaId" class="break-all">
                      Id del registro: <span class="font-mono text-white/70">{{ log.targetId }}</span>
                    </p>
                    <p class="sm:col-span-2 break-words">Dispositivo: <span class="text-white/60">{{ log.userAgent || '—' }}</span></p>
                  </div>

                  <div class="flex flex-wrap gap-2 pt-1">
                    <button
                      v-if="log.citaId"
                      type="button"
                      class="font-semibold text-[#4a8fe7] border border-[#4a8fe7]/30 rounded-lg px-3 py-1.5 hover:bg-[#4a8fe7]/10 transition"
                      @click="openHistory('cita', log)"
                    >
                      Historial de esta cita
                    </button>
                    <button
                      v-if="log.customerPhone"
                      type="button"
                      class="font-semibold text-[#a78bfa] border border-[#a78bfa]/30 rounded-lg px-3 py-1.5 hover:bg-[#a78bfa]/10 transition"
                      @click="openHistory('cliente', log)"
                    >
                      Historial del cliente
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>

    <!-- Panel: historial de una cita o de un cliente -->
    <Teleport to="body">
      <div v-if="history" class="fixed inset-0 z-50 bg-black/70 flex justify-end" @click.self="history = null">
        <aside class="w-full max-w-md h-full bg-[#0e0e0e] border-l border-white/10 flex flex-col">
          <div class="flex items-start justify-between gap-3 px-5 py-4 border-b border-white/10">
            <div class="min-w-0">
              <p class="font-serif font-bold">{{ history.title }}</p>
              <p class="text-xs text-white/40 truncate">{{ history.subtitle }}</p>
            </div>
            <button
              type="button"
              class="w-8 h-8 shrink-0 rounded-full border border-white/10 flex items-center justify-center text-white/50 hover:text-white"
              aria-label="Cerrar"
              @click="history = null"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
          <div class="flex-1 overflow-y-auto px-5 py-4">
            <p v-if="history.current" class="mb-4 text-xs text-white/70 bg-white/5 border border-white/10 rounded-lg px-3 py-2">
              {{ history.current }}
            </p>
            <p v-if="history.isLoading" class="text-sm text-white/40">Cargando…</p>
            <p v-else-if="!history.logs.length" class="text-sm text-white/40">Sin eventos registrados.</p>
            <ol v-else class="relative border-l border-white/10 ml-1.5 space-y-4">
              <li v-for="log in history.logs" :key="log.id" class="pl-4 relative">
                <span
                  class="absolute -left-[5px] top-1.5 w-2.5 h-2.5 rounded-full"
                  :style="{ backgroundColor: CATEGORY_BY_ID[log.category]?.color ?? '#888' }"
                ></span>
                <p class="text-[11px] text-white/40">{{ formatDateTime(log.at) }}</p>
                <p class="text-xs font-semibold" :style="{ color: CATEGORY_BY_ID[log.category]?.color }">
                  {{ ACTION_LABELS[log.action] ?? log.action }}
                  <span class="text-white/40 font-normal">· {{ log.actorName }} ({{ ROLE_LABELS[log.actorRole] ?? log.actorRole }})</span>
                </p>
                <p class="text-sm text-white/80">{{ log.summary }}</p>
              </li>
            </ol>
          </div>
        </aside>
      </div>
    </Teleport>
  </div>
</template>
