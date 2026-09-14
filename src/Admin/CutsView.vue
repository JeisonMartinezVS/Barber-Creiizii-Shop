```vue
<script setup lang="ts">
import { onMounted, onUnmounted, reactive, ref } from 'vue'
import { collection, doc, onSnapshot, updateDoc } from 'firebase/firestore'
import { db } from '../config/firebase'
import DashboardStats from '../components/dashboard/DashboardStats.vue'
import ToggleSwitch from '../ui/ToggleSwitch.vue'

interface Item {
  name?: string
  price?: string
  active?: boolean
  [key: string]: unknown
}

interface Service {
  title?: string
  items?: Item[]
  [key: string]: unknown
}

interface Config {
  services?: Service[]
  [key: string]: unknown
}

interface Producto {
  id: string
  serviceIndex: number
  itemIndex: number
  name: string
  price: string
  title: string
  active: boolean
}

const productos = ref<Producto[]>([])
const services = ref<Service[]>([])
const serviceTitles = ref<string[]>([])
const loading = ref(true)
const loadError = ref('')

let unsubscribe: (() => void) | null = null
let configDocumentId = ''

onMounted(() => {
  const configCollection = collection(db, 'config')

  unsubscribe = onSnapshot(
    configCollection,
    (snapshot) => {
      loading.value = false
      loadError.value = ''

      if (snapshot.empty) {
        productos.value = []
        services.value = []
        serviceTitles.value = []
        loadError.value = 'No existen configuraciones en Firebase.'
        return
      }

      const configDocument = snapshot.docs[0]

      if (!configDocument) {
        productos.value = []
        services.value = []
        serviceTitles.value = []
        loadError.value = 'No se pudo leer la configuración de Firebase.'
        return
      }

      configDocumentId = configDocument.id

      console.log('Configuración encontrada:', configDocumentId)

      const data = configDocument.data() as Config

      services.value = data.services || []

      const items: Producto[] = []
      const titles = new Set<string>()

      services.value.forEach((service, serviceIndex) => {
        const title = String(service.title || '').trim()

        if (title) {
          titles.add(title)
        }

        ;(service.items || []).forEach((item, itemIndex) => {
          items.push({
            id: `${serviceIndex}-${itemIndex}`,
            serviceIndex,
            itemIndex,
            name: String(item.name || ''),
            price: String(item.price || ''),
            title,
            active: item.active !== false,
          })
        })
      })

      productos.value = items
      serviceTitles.value = Array.from(titles)

      console.log('Servicios encontrados:', serviceTitles.value)
      console.log('Cortes encontrados:', productos.value)
    },
    (error) => {
      loading.value = false
      loadError.value = 'No se pudieron consultar los datos de Firebase.'
      console.error('Error consultando config:', error)
    },
  )
})

onUnmounted(() => unsubscribe?.())

// --- Formulario -----------------------------------------------------------
const isFormOpen = ref(false)
const editingId = ref<string | null>(null)
const isSaving = ref(false)
const formError = ref('')

const form = reactive({
  name: '',
  price: '',
  title: '',
})

function resetForm() {
  form.name = ''
  form.price = ''
  form.title = serviceTitles.value[0] || ''
  formError.value = ''
}

function openCreateForm() {
  editingId.value = null
  resetForm()
  isFormOpen.value = true
}

function openEditForm(producto: Producto) {
  editingId.value = producto.id
  form.name = producto.name
  form.price = producto.price
  form.title = producto.title
  formError.value = ''
  isFormOpen.value = true
}

function closeForm() {
  if (isSaving.value) return
  isFormOpen.value = false
}

async function saveProduct() {
  formError.value = ''

  if (!form.name.trim() || !form.price.trim() || !form.title.trim()) {
    formError.value = 'Nombre, precio y servicio son obligatorios.'
    return
  }

  if (!configDocumentId) {
    formError.value = 'No se encontró la configuración.'
    return
  }

  isSaving.value = true

  try {
    const configRef = doc(db, 'config', configDocumentId)

    const updatedServices = services.value.map((service) => ({
      ...service,
      items: [...(service.items || [])],
    }))

    if (editingId.value !== null) {
      const producto = productos.value.find(
        (item) => item.id === editingId.value,
      )

      if (!producto) {
        formError.value = 'No se encontró el corte.'
        return
      }

      const currentService = updatedServices[producto.serviceIndex]

      if (!currentService?.items?.[producto.itemIndex]) {
        formError.value = 'No se encontró el corte en Firebase.'
        return
      }

      const newServiceIndex = updatedServices.findIndex(
        (service) =>
          String(service.title || '').trim() === form.title.trim(),
      )

      if (newServiceIndex === -1) {
        formError.value = 'No se encontró el servicio seleccionado.'
        return
      }

      const item = currentService.items[producto.itemIndex]

      if (!item) {
        formError.value = 'No se encontró el corte en Firebase.'
        return
      }

      if (newServiceIndex === producto.serviceIndex) {
        currentService.items[producto.itemIndex] = {
          ...item,
          name: form.name.trim(),
          price: form.price.trim(),
        }
      } else {
        const newService = updatedServices[newServiceIndex]

        if (!newService) {
          formError.value = 'No se encontró el servicio seleccionado.'
          return
        }

        if (!newService.items) {
          newService.items = []
        }

        newService.items.push({
          ...item,
          name: form.name.trim(),
          price: form.price.trim(),
        })

        currentService.items.splice(producto.itemIndex, 1)
      }
    } else {
      const serviceIndex = updatedServices.findIndex(
        (service) =>
          String(service.title || '').trim() === form.title.trim(),
      )

      if (serviceIndex === -1) {
        formError.value = 'No se encontró el servicio seleccionado.'
        return
      }

      const service = updatedServices[serviceIndex]

      if (!service) {
        formError.value = 'No se encontró el servicio seleccionado.'
        return
      }

      if (!service.items) {
        service.items = []
      }

      service.items.push({
        name: form.name.trim(),
        price: form.price.trim(),
        active: true,
      })
    }

    await updateDoc(configRef, {
      services: updatedServices,
    })

    isFormOpen.value = false
  } catch (err) {
    console.error('No se pudo guardar el corte:', err)
    formError.value = 'No se pudo guardar el corte.'
  } finally {
    isSaving.value = false
  }
}

// --- Activar / desactivar -------------------------------------------------
async function toggleActive(producto: Producto) {
  if (!configDocumentId) return

  try {
    const configRef = doc(db, 'config', configDocumentId)

    const updatedServices = services.value.map((service) => ({
      ...service,
      items: [...(service.items || [])],
    }))

    const service = updatedServices[producto.serviceIndex]

    if (!service?.items?.[producto.itemIndex]) return

    service.items[producto.itemIndex] = {
      ...service.items[producto.itemIndex],
      active: !producto.active,
    }

    await updateDoc(configRef, {
      services: updatedServices,
    })
  } catch (err) {
    console.error('No se pudo actualizar el estado:', err)
  }
}

// --- Eliminar -------------------------------------------------------------
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
  if (!productToDelete.value || !configDocumentId) return

  isDeleting.value = true

  try {
    const configRef = doc(db, 'config', configDocumentId)

    const updatedServices = services.value.map((service) => ({
      ...service,
      items: [...(service.items || [])],
    }))

    const producto = productToDelete.value
    const service = updatedServices[producto.serviceIndex]

    if (!service?.items) return

    service.items.splice(producto.itemIndex, 1)

    await updateDoc(configRef, {
      services: updatedServices,
    })

    productToDelete.value = null
  } catch (err) {
    console.error('No se pudo eliminar el corte:', err)
  } finally {
    isDeleting.value = false
  }
}
</script>

<template>
  <div>
    <DashboardStats />

    <div class="flex items-center justify-between mb-4">
      <h1 class="font-serif text-xl font-bold text-white">Cortes</h1>

      <button
        v-if="!isFormOpen"
        type="button"
        class="flex items-center gap-2 bg-gradient-to-b from-[#b6903f] to-[#8f7130] hover:from-[#c39c47] hover:to-[#9c7c37] text-[#1a1408] font-semibold text-sm rounded-lg px-4 py-2 transition"
        @click="openCreateForm"
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
        >
          <line x1="12" y1="5" x2="12" y2="19" />
          <line x1="5" y1="12" x2="19" y2="12" />
        </svg>
        Nuevo corte
      </button>
    </div>

    <!-- Formulario en línea -->
    <div
      v-if="isFormOpen"
      class="bg-[#0e0e0e] border border-white/10 rounded-xl p-5 mb-6"
    >
      <p class="text-sm font-semibold text-[#c9a24b] mb-4">
        {{ editingId ? 'Editar corte' : 'Nuevo corte' }}
      </p>

      <form class="space-y-4" @submit.prevent="saveProduct">
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label class="block text-xs tracking-wide text-white/40 mb-1.5">
              NOMBRE <span class="text-[#c9a24b]">*</span>
            </label>

            <input
              v-model="form.name"
              type="text"
              placeholder="Nombre del corte"
              class="w-full bg-[#151515] border border-white/10 rounded-lg px-4 py-2.5 text-sm text-white placeholder-white/30 focus:outline-none focus:border-[#c9a24b]/50"
            />
          </div>

          <div>
            <label class="block text-xs tracking-wide text-white/40 mb-1.5">
              PRECIO <span class="text-[#c9a24b]">*</span>
            </label>

            <input
              v-model="form.price"
              type="text"
              placeholder="25.000"
              class="w-full bg-[#151515] border border-white/10 rounded-lg px-4 py-2.5 text-sm text-white placeholder-white/30 focus:outline-none focus:border-[#c9a24b]/50"
            />
          </div>
        </div>

        <div>
          <label class="block text-xs tracking-wide text-white/40 mb-1.5">
            SERVICIO <span class="text-[#c9a24b]">*</span>
          </label>

          <select
            v-model="form.title"
            class="w-full bg-[#151515] border border-white/10 rounded-lg px-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#c9a24b]/50"
          >
            <option
              v-for="title in serviceTitles"
              :key="title"
              :value="title"
              class="bg-[#151515]"
            >
              {{ title }}
            </option>
          </select>
        </div>

        <p v-if="formError" class="text-xs text-red-400">
          {{ formError }}
        </p>

        <div class="flex items-center gap-3">
          <button
            type="submit"
            :disabled="isSaving"
            class="flex items-center gap-2 bg-gradient-to-b from-[#b6903f] to-[#8f7130] hover:from-[#c39c47] hover:to-[#9c7c37] disabled:opacity-50 text-[#1a1408] font-semibold text-sm rounded-lg px-4 py-2 transition"
          >
            <svg
              width="15"
              height="15"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
            >
              <path
                d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2Z"
              />
              <polyline points="17 21 17 13 7 13 7 21" />
              <polyline points="7 3 7 8 15 8" />
            </svg>

            {{ isSaving ? 'Guardando...' : 'Guardar' }}
          </button>

          <button
            type="button"
            :disabled="isSaving"
            class="flex items-center gap-2 text-sm font-semibold text-white/70 border border-white/10 rounded-lg px-4 py-2 hover:border-white/25 hover:text-white transition"
            @click="closeForm"
          >
            <svg
              width="15"
              height="15"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>

            Cancelar
          </button>
        </div>
      </form>
    </div>

    <!-- Error de Firebase -->
    <p
      v-if="loadError"
      class="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-3 mb-4"
    >
      {{ loadError }}
    </p>

    <!-- Cargando -->
    <p
      v-if="loading"
      class="text-sm text-white/30 text-center py-10"
    >
      Cargando cortes...
    </p>

    <!-- Lista de servicios y cortes -->
    <div
      v-else
      class="grid grid-cols-1 md:grid-cols-2 gap-4"
    >
      <template
        v-for="producto in productos"
        :key="producto.id"
      >
        <div
          class="bg-[#0e0e0e] border border-white/10 rounded-xl px-5 py-4 flex items-center justify-between"
        >
          <div class="flex items-center gap-4 min-w-0">
            <div
              class="w-10 h-10 shrink-0 rounded-lg flex items-center justify-center bg-[#3a2f12] text-[#c9a24b] border border-[#c9a24b]/20"
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
              >
                <path
                  d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"
                />
                <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
                <line x1="12" y1="22.08" x2="12" y2="12" />
              </svg>
            </div>

            <div class="min-w-0">
              <p class="text-sm font-semibold text-white truncate">
                {{ producto.name || 'Sin nombre' }}
              </p>

              <p class="text-xs text-white/40 mb-1 truncate">
                {{ producto.title || 'Sin servicio' }}
              </p>

              <p class="text-xs">
                <span class="text-[#c9a24b] font-semibold">
                  ${{ producto.price || '0' }}
                </span>
              </p>
            </div>
          </div>

          <div class="flex items-center gap-2 shrink-0">
            <ToggleSwitch
              :model-value="producto.active"
              @update:model-value="toggleActive(producto)"
            />

            <button
              type="button"
              class="w-9 h-9 flex items-center justify-center rounded-lg border border-white/10 text-white/50 hover:text-white hover:border-white/20 transition"
              aria-label="Editar"
              @click="openEditForm(producto)"
            >
              <svg
                width="15"
                height="15"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
              >
                <path
                  d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"
                />
                <path
                  d="M18.5 2.5a2.12 2.12 0 0 1 3 3L12 15l-4 1 1-4Z"
                />
              </svg>
            </button>

            <button
              type="button"
              class="w-9 h-9 flex items-center justify-center rounded-lg border border-white/10 text-white/50 hover:text-red-400 hover:border-red-400/30 transition"
              aria-label="Eliminar"
              @click="askDelete(producto)"
            >
              <svg
                width="15"
                height="15"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
              >
                <polyline points="3 6 5 6 21 6" />
                <path
                  d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"
                />
              </svg>
            </button>
          </div>
        </div>
      </template>

      <p
        v-if="productos.length === 0"
        class="text-sm text-white/30 text-center py-10 md:col-span-2"
      >
        Sin cortes registrados todavía.
      </p>
    </div>

    <!-- Modal: confirmar eliminación -->
    <Teleport to="body">
      <div
        v-if="productToDelete"
        class="fixed inset-0 bg-black/70 z-50 flex items-center justify-center px-4"
      >
        <div
          class="w-full max-w-sm bg-[#0e0e0e] border border-white/10 rounded-2xl shadow-2xl overflow-hidden"
        >
          <div class="px-6 pt-6 pb-4 text-center">
            <div
              class="w-12 h-12 mx-auto mb-4 rounded-full bg-red-500/10 border border-red-500/30 flex items-center justify-center text-red-400"
            >
              <svg
                width="22"
                height="22"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
              >
                <polyline points="3 6 5 6 21 6" />
                <path
                  d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"
                />
              </svg>
            </div>

            <h2 class="font-serif text-lg font-bold text-white mb-1">
              ¿Eliminar este corte?
            </h2>

            <p class="text-sm text-white/50">
              <span class="text-white font-semibold">
                {{ productToDelete.name }}
              </span>
              se eliminará permanentemente.
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
```
