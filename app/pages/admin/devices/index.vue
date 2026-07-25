<script setup lang="ts">
import { Copy, Trash2 } from 'lucide-vue-next'
import { formatDate } from '~/utils/ui'

definePageMeta({ middleware: 'admin-auth', layout: 'admin' })

const { data: rows, refresh } = await useFetch('/api/admin/devices')

const platformVariant: Record<string, 'muted' | 'success' | 'info'> = {
  ios: 'muted',
  android: 'success',
  web: 'info',
}

async function copyId(id: string) {
  await navigator.clipboard.writeText(id)
}

async function remove(id: number) {
  if (!confirm('Delete this device? It will re-register on next check-in.')) return
  await $fetch(`/api/admin/devices/${id}`, { method: 'DELETE' })
  await refresh()
}
</script>

<template>
  <div>
    <h1 class="mb-6 text-2xl font-semibold">Devices</h1>

    <div class="overflow-hidden rounded-lg border">
      <table class="w-full text-sm">
        <thead class="border-b bg-muted/50 text-left">
          <tr>
            <th class="px-4 py-3 font-medium">Device UUID</th>
            <th class="px-4 py-3 font-medium">Platform</th>
            <th class="px-4 py-3 font-medium">Application</th>
            <th class="px-4 py-3 font-medium">Current Bundle</th>
            <th class="px-4 py-3 font-medium">IP</th>
            <th class="px-4 py-3 font-medium">Location</th>
            <th class="px-4 py-3 font-medium">Last Active</th>
            <th class="px-4 py-3" />
          </tr>
        </thead>
        <tbody>
          <tr v-for="d in rows" :key="d.id" class="border-b last:border-0 hover:bg-muted/30">
            <td class="px-4 py-3">
              <button class="inline-flex items-center gap-1 font-mono text-xs hover:text-primary" title="Copy full UUID" @click="copyId(d.device_identifier)">
                {{ d.device_identifier.slice(0, 12) }}…
                <Copy class="h-3 w-3" />
              </button>
            </td>
            <td class="px-4 py-3">
              <UiBadge v-if="d.platform" :variant="platformVariant[d.platform] ?? 'muted'">{{ d.platform }}</UiBadge>
              <span v-else class="text-muted-foreground">—</span>
            </td>
            <td class="px-4 py-3 text-muted-foreground">{{ d.application_name ?? '—' }}</td>
            <td class="px-4 py-3">{{ d.bundle_name ?? '—' }}</td>
            <td class="px-4 py-3 font-mono text-xs text-muted-foreground">{{ d.ip_address ?? '—' }}</td>
            <td class="px-4 py-3 text-muted-foreground">{{ d.location }}</td>
            <td class="px-4 py-3 text-muted-foreground">{{ formatDate(d.last_active_at) }}</td>
            <td class="px-4 py-3 text-right">
              <UiButton variant="ghost" size="icon" title="Delete" @click="remove(d.id)">
                <Trash2 class="h-4 w-4 text-destructive" />
              </UiButton>
            </td>
          </tr>
          <tr v-if="!rows?.length">
            <td colspan="8" class="px-4 py-10 text-center text-muted-foreground">No devices yet — they appear after their first update check.</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
