<script setup lang="ts">
import { Plus, Trash2 } from 'lucide-vue-next'
import { formatBytes, formatDate } from '~/utils/ui'

definePageMeta({ middleware: 'admin-auth', layout: 'admin' })

const { data: rows, refresh } = await useFetch('/api/admin/bundles')

function constraints(b: any): string {
  const parts: string[] = []
  if (b.android_min_version_code != null || b.android_max_version_code != null)
    parts.push(`Android: ${b.android_min_version_code ?? '∞'}–${b.android_max_version_code ?? '∞'}`)
  if (b.ios_min_version_code != null || b.ios_max_version_code != null)
    parts.push(`iOS: ${b.ios_min_version_code ?? '∞'}–${b.ios_max_version_code ?? '∞'}`)
  return parts.join(' · ') || 'Unconstrained'
}

async function remove(id: number) {
  if (!confirm('Delete this bundle? Devices on it will re-resolve on next check.')) return
  await $fetch(`/api/admin/bundles/${id}`, { method: 'DELETE' })
  await refresh()
}
</script>

<template>
  <div>
    <div class="mb-6 flex items-center justify-between">
      <h1 class="text-2xl font-semibold">Bundles</h1>
      <UiButton @click="navigateTo('/admin/bundles/create')">
        <Plus class="h-4 w-4" /> Create
      </UiButton>
    </div>

    <div class="overflow-hidden rounded-lg border">
      <table class="w-full text-sm">
        <thead class="border-b bg-muted/50 text-left">
          <tr>
            <th class="px-4 py-3 font-medium">Version</th>
            <th class="px-4 py-3 font-medium">Application</th>
            <th class="px-4 py-3 font-medium">Channel</th>
            <th class="px-4 py-3 font-medium">Size</th>
            <th class="px-4 py-3 font-medium">Constraints</th>
            <th class="px-4 py-3 font-medium">Uploaded</th>
            <th class="px-4 py-3" />
          </tr>
        </thead>
        <tbody>
          <tr v-for="b in rows" :key="b.id" class="border-b last:border-0 hover:bg-muted/30">
            <td class="px-4 py-3 font-medium">{{ b.name }}</td>
            <td class="px-4 py-3 text-muted-foreground">{{ b.application_name }}</td>
            <td class="px-4 py-3">
              <UiBadge v-if="b.channel_name" variant="info">{{ b.channel_name }}</UiBadge>
              <span v-else class="text-muted-foreground">—</span>
            </td>
            <td class="px-4 py-3">{{ formatBytes(b.size) }}</td>
            <td class="px-4 py-3 text-xs text-muted-foreground">{{ constraints(b) }}</td>
            <td class="px-4 py-3 text-muted-foreground">{{ formatDate(b.created_at) }}</td>
            <td class="px-4 py-3 text-right">
              <UiButton variant="ghost" size="icon" title="Delete" @click="remove(b.id)">
                <Trash2 class="h-4 w-4 text-destructive" />
              </UiButton>
            </td>
          </tr>
          <tr v-if="!rows?.length">
            <td colspan="7" class="px-4 py-10 text-center text-muted-foreground">No bundles yet.</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
