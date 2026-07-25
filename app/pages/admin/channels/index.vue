<script setup lang="ts">
import { Plus, Trash2 } from 'lucide-vue-next'
import { formatDate } from '~/utils/ui'

definePageMeta({ middleware: 'admin-auth', layout: 'admin' })

const { data: rows, refresh } = await useFetch('/api/admin/channels')
const { data: apps } = await useFetch('/api/admin/applications')

const showCreate = ref(false)
const form = reactive({ name: '', application_id: null as number | null })
const error = ref('')
const pending = ref(false)

const appOptions = computed(() => (apps.value ?? []).map((a) => ({ value: a.id, label: a.name })))

async function create() {
  error.value = ''
  pending.value = true
  try {
    await $fetch('/api/admin/channels', { method: 'POST', body: form })
    showCreate.value = false
    Object.assign(form, { name: '', application_id: null })
    await refresh()
  } catch (e: any) {
    error.value = apiErrorMessage(e, 'Create failed')
  } finally {
    pending.value = false
  }
}

async function remove(id: number) {
  if (!confirm('Delete this channel? Its bundles will become unassigned.')) return
  await $fetch(`/api/admin/channels/${id}`, { method: 'DELETE' })
  await refresh()
}
</script>

<template>
  <div>
    <div class="mb-6 flex items-center justify-between">
      <h1 class="text-2xl font-semibold">Channels</h1>
      <UiButton @click="showCreate = true">
        <Plus class="h-4 w-4" /> Create
      </UiButton>
    </div>

    <div class="overflow-hidden rounded-lg border">
      <table class="w-full text-sm">
        <thead class="border-b bg-muted/50 text-left">
          <tr>
            <th class="px-4 py-3 font-medium">Name</th>
            <th class="px-4 py-3 font-medium">Application</th>
            <th class="px-4 py-3 font-medium">Bundles</th>
            <th class="px-4 py-3 font-medium">Created</th>
            <th class="px-4 py-3" />
          </tr>
        </thead>
        <tbody>
          <tr v-for="c in rows" :key="c.id" class="border-b last:border-0 hover:bg-muted/30">
            <td class="px-4 py-3 font-semibold">{{ c.name }}</td>
            <td class="px-4 py-3 text-muted-foreground">{{ c.application_name }}</td>
            <td class="px-4 py-3"><UiBadge variant="info">{{ c.bundles_count }}</UiBadge></td>
            <td class="px-4 py-3 text-muted-foreground">{{ formatDate(c.created_at) }}</td>
            <td class="px-4 py-3 text-right">
              <UiButton variant="ghost" size="icon" title="Delete" @click="remove(c.id)">
                <Trash2 class="h-4 w-4 text-destructive" />
              </UiButton>
            </td>
          </tr>
          <tr v-if="!rows?.length">
            <td colspan="5" class="px-4 py-10 text-center text-muted-foreground">No channels yet.</td>
          </tr>
        </tbody>
      </table>
    </div>

    <UiDialog v-model:open="showCreate" title="Create Channel">
      <form class="space-y-4" @submit.prevent="create">
        <UiSelect v-model="form.application_id" :options="appOptions" placeholder="Application *" required />
        <UiInput v-model="form.name" placeholder="e.g. Production, Beta, Internal" required />
        <p v-if="error" class="text-sm text-destructive">{{ error }}</p>
        <UiButton type="submit" class="w-full" :disabled="pending">
          {{ pending ? 'Creating…' : 'Create' }}
        </UiButton>
      </form>
    </UiDialog>
  </div>
</template>
