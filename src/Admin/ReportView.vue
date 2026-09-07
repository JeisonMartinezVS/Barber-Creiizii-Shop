<script setup lang="ts">
import DashboardStats from '../components/dashboard/DashboardStats.vue'
import StatCard from '../components/dashboard/StatCard.vue'

// TODO: replace with real aggregates from Firestore.
const reportStats = [
  { label: 'Total reservas', value: '0', accent: '#ffffff' },
  { label: 'Completadas', value: '0', accent: '#34d399' },
  { label: 'No asistió', value: '0', accent: '#f2994a' },
  { label: 'Ingresos totales', value: '$0', accent: '#c9a24b' },
]

const trendingIcon = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>`
const scissorsIcon = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="6" cy="6" r="3"/><circle cx="6" cy="18" r="3"/><line x1="20" y1="4" x2="8.12" y2="15.88"/><line x1="14.47" y1="14.48" x2="20" y2="20"/><line x1="8.12" y1="8.12" x2="12" y2="12"/></svg>`
</script>

<template>
  <div>
    <DashboardStats />

    <h1 class="font-serif text-xl font-bold text-white mb-4">Reportes</h1>

    <div class="grid grid-cols-4 gap-4 mb-6">
      <StatCard
        v-for="stat in reportStats"
        :key="stat.label"
        :label="stat.label"
        :value="stat.value"
        icon=""
        :accent="stat.accent"
      />
    </div>

    <div class="grid grid-cols-2 gap-4">
      <div class="bg-[#0e0e0e] border border-white/10 rounded-xl p-5 min-h-[220px]">
        <p class="flex items-center gap-2 text-sm font-semibold text-white mb-4">
          <span class="text-white/60" v-html="trendingIcon"></span>
          Ingresos del mes
        </p>
        <div class="h-[140px] flex items-center justify-center">
          <p class="text-sm text-white/30">Sin datos completados aún</p>
        </div>
      </div>

      <div class="bg-[#0e0e0e] border border-white/10 rounded-xl p-5 min-h-[220px]">
        <p class="flex items-center gap-2 text-sm font-semibold text-white mb-4">
          <span class="text-white/60" v-html="scissorsIcon"></span>
          Distribución de estados
        </p>
        <div class="h-[140px] flex items-center justify-center">
          <p class="text-sm text-white/30">Sin datos aún</p>
        </div>
      </div>
    </div>
  </div>
</template>
