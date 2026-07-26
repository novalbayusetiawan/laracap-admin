<script setup lang="ts">
import { Pencil, Plus, Trash2 } from 'lucide-vue-next'
import { formatBytes, formatDate } from '~/utils/ui'
import { useToast } from '~/composables/useToast'

definePageMeta({ middleware: 'admin-auth', layout: 'admin' })

const { data: rows, refresh } = await useFetch('/api/admin/bundles')
const { data: allChannels } = await useFetch('/api/admin/channels')
const { success } = useToast()

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
  success('Bundle deleted')
}

// ----- edit -----
const showEdit = ref(false)
const editId = ref<number | null>(null)
const editAppId = ref<number | null>(null)
const editForm = reactive({
  name: '',
  description: '',
  channel_id: null as number | null,
  android_min_version_code: '' as string | number,
  android_max_version_code: '' as string | number,
  android_eq_version_code: '' as string | number,
  ios_min_version_code: '' as string | number,
  ios_max_version_code: '' as string | number,
  ios_eq_version_code: '' as string | number,
})
const editError = ref('')
const editPending = ref(false)

const channelOptions = computed(() => [
  { value: null, label: '— No channel —' },
  ...(allChannels.value ?? [])
    .filter((c: any) => c.application_id === editAppId.value)
    .map((c: any) => ({ value: c.id, label: c.name })),
])

function openEdit(b: any) {
  editId.value = b.id
  editAppId.value = b.application_id
  Object.assign(editForm, {
    name: b.name ?? '',
    description: b.description ?? '',
    channel_id: b.channel_id,
    android_min_version_code: b.android_min_version_code ?? '',
    android_max_version_code: b.android_max_version_code ?? '',
    android_eq_version_code: b.android_eq_version_code ?? '',
    ios_min_version_code: b.ios_min_version_code ?? '',
    ios_max_version_code: b.ios_max_version_code ?? '',
    ios_eq_version_code: b.ios_eq_version_code ?? '',
  })
  editError.value = ''
  showEdit.value = true
}

async function saveEdit() {
  editError.value = ''
  editPending.value = true
  try {
    await $fetch(`/api/admin/bundles/${editId.value}`, { method: 'PATCH', body: editForm })
    showEdit.value = false
    await refresh()
    success('Bundle updated')
  } catch (e: any) {
    editError.value = apiErrorMessage(e, 'Update failed')
  } finally {
    editPending.value = false
  }
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
            <td class="px-4 py-3">
              <div class="flex justify-end gap-1">
                <UiButton variant="ghost" size="icon" title="Edit" @click="openEdit(b)">
                  <Pencil class="h-4 w-4" />
                </UiButton>
                <UiButton variant="ghost" size="icon" title="Delete" @click="remove(b.id)">
                  <Trash2 class="h-4 w-4 text-destructive" />
                </UiButton>
              </div>
            </td>
          </tr>
          <tr v-if="!rows?.length">
            <td colspan="7" class="px-4 py-10 text-center text-muted-foreground">No bundles yet.</td>
          </tr>
        </tbody>
      </table>
    </div>

    <UiDialog v-model:open="showEdit" title="Edit Bundle">
      <form class="space-y-4" @submit.prevent="saveEdit">
        <UiInput v-model="editForm.name" placeholder="Version / name" />
        <UiInput v-model="editForm.description" placeholder="Description (optional)" />
        <UiSelect v-model="editForm.channel_id" :options="channelOptions" placeholder="Channel" />
        <div>
          <p class="mb-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">Android version codes</p>
          <div class="grid grid-cols-3 gap-2">
            <UiInput v-model="editForm.android_min_version_code" type="number" placeholder="Min" />
            <UiInput v-model="editForm.android_max_version_code" type="number" placeholder="Max" />
            <UiInput v-model="editForm.android_eq_version_code" type="number" placeholder="Exact" />
          </div>
        </div>
        <div>
          <p class="mb-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">iOS version codes</p>
          <div class="grid grid-cols-3 gap-2">
            <UiInput v-model="editForm.ios_min_version_code" type="number" placeholder="Min" />
            <UiInput v-model="editForm.ios_max_version_code" type="number" placeholder="Max" />
            <UiInput v-model="editForm.ios_eq_version_code" type="number" placeholder="Exact" />
          </div>
        </div>
        <p v-if="editError" class="text-sm text-destructive">{{ editError }}</p>
        <UiButton type="submit" class="w-full" :disabled="editPending">
          {{ editPending ? 'Saving…' : 'Save changes' }}
        </UiButton>
      </form>
    </UiDialog>
  </div>
</template>
