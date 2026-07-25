<script setup lang="ts">
import { Copy, Plus, Trash2 } from 'lucide-vue-next'

definePageMeta({ middleware: 'admin-auth', layout: 'admin' })

const { data: apps, refresh } = await useFetch('/api/admin/applications')

const showCreate = ref(false)
const form = reactive({ name: '', slug: '', description: '', bundle_limit: '' as string | number })
const error = ref('')
const pending = ref(false)

async function create() {
  error.value = ''
  pending.value = true
  try {
    await $fetch('/api/admin/applications', { method: 'POST', body: form })
    showCreate.value = false
    Object.assign(form, { name: '', slug: '', description: '', bundle_limit: '' })
    await refresh()
  } catch (e: any) {
    error.value = apiErrorMessage(e, 'Create failed')
  } finally {
    pending.value = false
  }
}

async function remove(id: number) {
  if (!confirm('Delete this application? Its bundles and channels will be removed.')) return
  await $fetch(`/api/admin/applications/${id}`, { method: 'DELETE' })
  await refresh()
}

async function copyUuid(uuid: string) {
  await navigator.clipboard.writeText(uuid)
}
</script>

<template>
  <div>
    <div class="mb-6 flex items-center justify-between">
      <h1 class="text-2xl font-semibold">Applications</h1>
      <UiButton @click="showCreate = true">
        <Plus class="h-4 w-4" /> Create
      </UiButton>
    </div>

    <div class="overflow-hidden rounded-lg border">
      <table class="w-full text-sm">
        <thead class="border-b bg-muted/50 text-left">
          <tr>
            <th class="px-4 py-3 font-medium">Name</th>
            <th class="px-4 py-3 font-medium">Slug</th>
            <th class="px-4 py-3 font-medium">Retention</th>
            <th class="px-4 py-3 font-medium">Bundles</th>
            <th class="px-4 py-3 font-medium">Channels</th>
            <th class="px-4 py-3" />
          </tr>
        </thead>
        <tbody>
          <tr v-for="app in apps" :key="app.id" class="border-b last:border-0 hover:bg-muted/30">
            <td class="px-4 py-3 font-medium">{{ app.name }}</td>
            <td class="px-4 py-3 text-muted-foreground">{{ app.slug }}</td>
            <td class="px-4 py-3">
              <UiBadge v-if="app.bundle_limit != null" variant="destructive">{{ app.bundle_limit }}</UiBadge>
              <UiBadge v-else variant="muted">Unlimited</UiBadge>
            </td>
            <td class="px-4 py-3"><UiBadge variant="info">{{ app.bundles_count }}</UiBadge></td>
            <td class="px-4 py-3"><UiBadge variant="success">{{ app.channels_count }}</UiBadge></td>
            <td class="px-4 py-3">
              <div class="flex justify-end gap-1">
                <UiButton variant="ghost" size="icon" title="Copy Application ID" @click="copyUuid(app.uuid)">
                  <Copy class="h-4 w-4" />
                </UiButton>
                <UiButton variant="ghost" size="icon" title="Delete" @click="remove(app.id)">
                  <Trash2 class="h-4 w-4 text-destructive" />
                </UiButton>
              </div>
            </td>
          </tr>
          <tr v-if="!apps?.length">
            <td colspan="6" class="px-4 py-10 text-center text-muted-foreground">No applications yet.</td>
          </tr>
        </tbody>
      </table>
    </div>

    <UiDialog v-model:open="showCreate" title="Create Application">
      <form class="space-y-4" @submit.prevent="create">
        <UiInput v-model="form.name" placeholder="Name" required />
        <UiInput v-model="form.slug" placeholder="Slug" required />
        <UiInput v-model="form.description" placeholder="Description (optional)" />
        <div>
          <UiInput v-model="form.bundle_limit" type="number" placeholder="Bundle Retention Limit" />
          <p class="mt-1 text-xs text-muted-foreground">
            Number of bundles to keep. Oldest will be deleted when this limit is reached. Leave empty for no limit.
          </p>
        </div>
        <p v-if="error" class="text-sm text-destructive">{{ error }}</p>
        <UiButton type="submit" class="w-full" :disabled="pending">
          {{ pending ? 'Creating…' : 'Create' }}
        </UiButton>
      </form>
    </UiDialog>
  </div>
</template>
