<script setup lang="ts">
import { Cpu, LayoutGrid, Radio, Smartphone, Users } from 'lucide-vue-next'
import { formatBytes } from '~/utils/ui'

definePageMeta({ middleware: 'admin-auth', layout: 'admin' })

const { user } = useUserSession()
const [{ data: stats }, { data: charts }] = await Promise.all([
  useFetch('/api/admin/stats'),
  useFetch('/api/admin/charts'),
])

const cards = computed(() => [
  { label: 'Applications', value: stats.value?.applications ?? 0, icon: LayoutGrid },
  { label: 'Channels', value: stats.value?.channels ?? 0, icon: Radio },
  { label: 'Active Devices', value: stats.value?.active_devices ?? 0, icon: Smartphone },
  { label: 'Bundle Sizes', value: formatBytes(stats.value?.bundle_bytes ?? 0), icon: Cpu },
  ...(user.value?.isAdmin ? [{ label: 'Total Users', value: stats.value?.total_users ?? 0, icon: Users }] : []),
])

const dayLabels = computed(() =>
  (charts.value?.days ?? []).map((d) => new Date(`${d}T00:00:00Z`).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })))

const activitySeries = computed(() => [
  { name: 'Checks', values: charts.value?.checkins ?? [], color: 'hsl(38 92% 50%)' },
  { name: 'Downloads', values: charts.value?.downloads ?? [], color: 'hsl(160 84% 39%)' },
])
const uploadSeries = computed(() => [
  { name: 'Uploads', values: charts.value?.uploads ?? [], color: 'hsl(221 83% 53%)' },
])
</script>

<template>
  <div>
    <h1 class="mb-6 text-2xl font-semibold">Dashboard</h1>

    <div class="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
      <div
        v-for="card in cards"
        :key="card.label"
        class="rounded-lg border bg-card p-4 shadow-sm transition-shadow hover:shadow-md"
      >
        <div class="flex items-center justify-between">
          <p class="text-sm text-muted-foreground">{{ card.label }}</p>
          <component :is="card.icon" class="h-4 w-4 text-muted-foreground" />
        </div>
        <p class="mt-2 text-2xl font-semibold tabular-nums">{{ card.value }}</p>
      </div>
    </div>

    <div class="grid gap-4 lg:grid-cols-2">
      <div class="rounded-lg border bg-card p-4 shadow-sm">
        <h2 class="mb-3 text-sm font-medium">Device activity — last 14 days</h2>
        <UiAreaChart :labels="dayLabels" :series="activitySeries" />
      </div>
      <div class="rounded-lg border bg-card p-4 shadow-sm">
        <h2 class="mb-3 text-sm font-medium">Bundle uploads — last 14 days</h2>
        <UiAreaChart :labels="dayLabels" :series="uploadSeries" />
      </div>
    </div>
  </div>
</template>
