<script setup lang="ts">
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()

interface NavItem {
  name: string
  label: string
  icon: string
  enabled: boolean
}

// Only "agenda" has a real page for now. The rest render greyed-out until
// their views exist — flip `enabled` to true as each one gets built.
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
    enabled: true,
    icon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></svg>`,
  },
  {
    name: 'empleados',
    label: 'Empleados',
    enabled: true,
    icon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/><polyline points="17 11 19 13 23 9"/></svg>`,
  },
  {
    name: 'productos',
    label: 'Productos',
    enabled: true,
    icon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>`,
  },
  {
    name: 'horarios',
    label: 'Horarios',
    enabled: true,
    icon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>`,
  },
]

function goTo(item: NavItem) {
  if (item.enabled) router.push({ name: item.name })
}

async function handleLogout() {
  await authStore.logout()
  router.push({ name: 'login' })
}
</script>

<template>
  <div class="min-h-screen flex bg-[#050505]">
    <!-- Sidebar -->
    <aside class="w-60 shrink-0 border-r border-white/10 flex flex-col justify-between">
      <div>
        <div class="flex items-center gap-3 px-5 py-5 border-b border-white/10">
          <div class="w-9 h-9 rounded-md bg-black border border-white/10 overflow-hidden flex items-center justify-center">
            <img src="../../public/logo.jpg" alt="Creiizii" class="w-full h-full object-cover" />
          </div>
          <div>
            <p class="text-white font-serif font-bold text-sm leading-tight">Creiizii</p>
            <p class="flex items-center gap-1 text-[11px] text-white/40">
              <span class="w-1.5 h-1.5 rounded-full bg-[#c9a24b]"></span>
              {{ authStore.user?.email?.startsWith('admin') ? 'Administrador' : 'Staff' }}
            </p>
          </div>
        </div>

        <nav class="px-3 py-4 space-y-1">
          <button
            v-for="item in navItems"
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
        <a
          href="/"
          target="_blank"
          rel="noopener"
          class="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-white/40 hover:text-white/70 hover:bg-white/5 transition"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
            <polyline points="15 3 21 3 21 9" />
            <line x1="10" y1="14" x2="21" y2="3" />
          </svg>
          Ver sitio web
        </a>
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
    <main class="flex-1 min-w-0 p-6">
      <router-view />
    </main>
  </div>
</template>
