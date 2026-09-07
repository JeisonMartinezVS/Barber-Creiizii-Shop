<script setup lang="ts">
import { ref } from 'vue'
import DashboardStats from '../components/dashboard/DashboardStats.vue'
import EmptyState from '../components/dashboard/EmptyState.vue'

interface Cliente {
  id: string
}

// TODO: replace with real clientes fetched from Firestore.
const clientes = ref<Cliente[]>([])

const usersIcon = `<svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></svg>`
</script>

<template>
  <div>
    <DashboardStats />

    <h1 class="font-serif text-xl font-bold text-white mb-4">Clientes</h1>

    <div class="bg-[#0e0e0e] border border-white/10 rounded-xl min-h-[280px] flex items-center justify-center">
      <EmptyState v-if="clientes.length === 0" :icon="usersIcon" text="Sin clientes registrados" />
      <ul v-else class="w-full divide-y divide-white/5">
        <!-- TODO: render real cliente rows here -->
      </ul>
    </div>
  </div>
</template>
