<script setup lang="ts">
import { computed, defineAsyncComponent } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()

// Solo lo ven los empleados en su primer ingreso: se descarga cuando hace falta.
const ChangePasswordModal = defineAsyncComponent(() => import('../components/dashboard/ChangePasswordModal.vue'))

interface NavItem {
  name: string
  label: string
  icon: string
  enabled: boolean
  adminOnly?: boolean
}

// Empleados solo ven Agenda y Horarios — todo lo demás es admin-only, tanto
// aquí (visual) como en las reglas de Firestore (lo que de verdad protege).
const navItems: NavItem[] = [
  {
    name: 'Agenda',
    label: 'Agenda',
    enabled: true,
    icon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>`,
  },
  {
    name: 'reportes',
    label: 'Reportes',
    enabled: true,
    icon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>`,
  },
  {
    name: 'clientes',
    label: 'Clientes',
    enabled: false,
    adminOnly: true,
    icon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></svg>`,
  },
  {
    name: 'empleados',
    label: 'Empleados',
    enabled: true,
    adminOnly: true,
    icon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/><polyline points="17 11 19 13 23 9"/></svg>`,
  },
  {
    name: 'cortes',
    label: 'Cortes',
    enabled: true,
    adminOnly: true,
    icon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="6" cy="6" r="3" /><circle cx="6" cy="18" r="3" />
            <line x1="20" y1="4" x2="8.12" y2="15.88" /><line x1="14.47" y1="14.48" x2="20" y2="20" /><line x1="8.12" y1="8.12" x2="12" y2="12" />
          </svg>`,
  },
  {
    name: 'productos',
    label: 'Productos',
    enabled: true,
    adminOnly: true,
    icon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>`,
  },
  {
    name: 'horarios',
    label: 'Horarios',
    enabled: true,
    icon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>`,
  },
]

const visibleNavItems = computed(() => navItems.filter((item) => !item.adminOnly || authStore.isAdmin))

function goTo(item: NavItem) {
  if (item.enabled) router.push({ name: item.name })
}

async function handleLogout() {
  await authStore.logout()
  router.push({ name: 'Login' })
}
</script>

<template>
  <div class="min-h-screen flex flex-col md:flex-row bg-[#050505]">
    <!-- ===== Mobile top bar + horizontal nav (< md) ===== -->
    <div class="md:hidden border-b border-white/10 sticky top-0 bg-[#050505] z-20">
      <div class="flex items-center justify-between px-4 py-3">
        <div class="flex items-center gap-2">
          <img src="../../public/icon.png" alt="Creiizii" class="w-8 h-8">
          <span class="text-white font-serif font-bold text-base">Bienvenido, {{ authStore.name || authStore.user?.displayName || authStore.user?.email }}</span>
        </div>
        <button
          type="button"
          class="w-8 h-8 flex items-center justify-center text-white/50 hover:text-white transition"
          aria-label="Cerrar sesión"
          @click="handleLogout"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
            <polyline points="16 17 21 12 16 7" />
            <line x1="21" y1="12" x2="9" y2="12" />
          </svg>
        </button>
      </div>

      <nav class="flex overflow-x-auto px-2 pb-2 gap-1">
        <button
          v-for="item in visibleNavItems"
          :key="item.name"
          type="button"
          class="flex flex-col items-center gap-1 px-3 py-1.5 rounded-lg shrink-0 border-b-2 transition"
          :class="
            route.name === item.name
              ? 'text-[#c9a24b] border-[#c9a24b]'
              : item.enabled
                ? 'text-white/50 border-transparent hover:text-white/80'
                : 'text-white/20 border-transparent cursor-not-allowed'
          "
          @click="goTo(item)"
        >
          <span v-html="item.icon"></span>
          <span class="text-[11px] font-medium whitespace-nowrap">{{ item.label }}</span>
        </button>
      </nav>
    </div>

    <!-- ===== Desktop sidebar (md+) ===== -->
    <aside class="hidden md:flex w-60 shrink-0 border-r border-white/10 flex-col justify-between">
      <div>
        <div class="flex items-center gap-3 px-5 py-5 border-b border-white/10">
          <div class="w-9 h-9 rounded-md bg-black border border-white/10 overflow-hidden flex items-center justify-center">
            <img src="" alt="Creiizii" class="w-full h-full object-cover" />
          </div>
          <div>
            <p class="text-white font-serif font-bold text-sm leading-tight">Creiizii</p>
            <p class="flex items-center gap-1 text-[11px] text-white/40">
              <span class="w-1.5 h-1.5 rounded-full bg-[#c9a24b]"></span>
              {{ authStore.isAdmin ? 'Administrador' : 'Empleado' }}
            </p>
          </div>
        </div>

        <nav class="px-3 py-4 space-y-1">
          <button
            v-for="item in visibleNavItems"
            :key="item.name"
            type="button"
            class="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition"
            :class="[
              route.name === item.name
                ? 'bg-[#3a2f12] text-[#e2b95a] border border-[#c9a24b]/30'
                : item.enabled
                  ? 'text-white/60 hover:bg-white/5 hover:text-white/90'
                  : 'text-white/20 cursor-not-allowed',
            ]"
            @click="goTo(item)"
          >
            <span v-html="item.icon"></span>
            {{ item.label }}
          </button>
        </nav>
      </div>

      <div class="px-3 py-4 border-t border-white/10 space-y-1">
        <button
          type="button"
          class="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-white/40 hover:text-white/70 hover:bg-white/5 transition"
          @click="handleLogout"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
            <polyline points="16 17 21 12 16 7" />
            <line x1="21" y1="12" x2="9" y2="12" />
          </svg>
          Cerrar sesión
        </button>
      </div>
    </aside>

    <!-- Content -->
    <main class="flex-1 min-w-0 p-4 md:p-6">
      <router-view />
    </main>

    <!-- Primer ingreso de un empleado: obliga a cambiar la contraseña temporal -->
    <ChangePasswordModal v-if="authStore.mustChangePassword" />
  </div>
</template>
