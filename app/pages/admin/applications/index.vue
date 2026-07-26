<script setup lang="ts">
import { Check, Copy, Pencil, Plus, Trash2 } from 'lucide-vue-next'
import { useToast } from '~/composables/useToast'

definePageMeta({ middleware: 'admin-auth', layout: 'admin' })

const { data: apps, refresh } = await useFetch('/api/admin/applications')
const { success, error: toastError } = useToast()

// ----- create -----
const showCreate = ref(false)
const form = reactive({ name: '', description: '', bundle_limit: '' as string | number })
const error = ref('')
const pending = ref(false)

async function create() {
  error.value = ''
  pending.value = true
  try {
    await $fetch('/api/admin/applications', { method: 'POST', body: form })
    showCreate.value = false
    Object.assign(form, { name: '', description: '', bundle_limit: '' })
    await refresh()
    success('Application created')
  } catch (e: any) {
    error.value = apiErrorMessage(e, 'Create failed')
  } finally {
    pending.value = false
  }
}

// ----- edit -----
const showEdit = ref(false)
const editId = ref<number | null>(null)
const editForm = reactive({ name: '', description: '', bundle_limit: '' as string | number })
const editError = ref('')
const editPending = ref(false)

function openEdit(app: any) {
  editId.value = app.id
  Object.assign(editForm, {
    name: app.name,
    description: app.description ?? '',
    bundle_limit: app.bundle_limit ?? '',
  })
  editError.value = ''
  showEdit.value = true
}

async function saveEdit() {
  editError.value = ''
  editPending.value = true
  try {
    await $fetch(`/api/admin/applications/${editId.value}`, { method: 'PATCH', body: editForm })
    showEdit.value = false
    await refresh()
    success('Application updated')
  } catch (e: any) {
    editError.value = apiErrorMessage(e, 'Update failed')
  } finally {
    editPending.value = false
  }
}

// ----- delete / copy -----
async function remove(id: number) {
  if (!confirm('Delete this application? Its bundles and channels will be removed.')) return
  await $fetch(`/api/admin/applications/${id}`, { method: 'DELETE' })
  await refresh()
  success('Application deleted')
}

const copiedUuid = ref('')
async function copyUuid(uuid: string) {
  try {
    await navigator.clipboard.writeText(uuid)
    copiedUuid.value = uuid
    success('App ID copied to clipboard')
    setTimeout(() => {
      if (copiedUuid.value === uuid) copiedUuid.value = ''
    }, 2000)
  } catch {
    toastError('Could not copy — check browser permissions')
  }
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
            <th class="px-4 py-3 font-medium">App ID</th>
            <th class="px-4 py-3 font-medium">Retention</th>
            <th class="px-4 py-3 font-medium">Bundles</th>
            <th class="px-4 py-3 font-medium">Channels</th>
            <th class="px-4 py-3" />
          </tr>
        </thead>
        <tbody>
          <tr v-for="app in apps" :key="app.id" class="border-b last:border-0 hover:bg-muted/30">
            <td class="px-4 py-3">
              <div class="font-medium">{{ app.name }}</div>
              <div v-if="app.description" class="max-w-[28ch] truncate text-xs text-muted-foreground">{{ app.description }}</div>
            </td>
            <td class="px-4 py-3">
              <button
                class="group inline-flex items-center gap-1.5 rounded-md border bg-muted/40 px-2 py-1 font-mono text-xs text-muted-foreground transition-colors hover:bg-muted"
                :title="copiedUuid === app.uuid ? 'Copied!' : 'Copy App ID'"
                @click="copyUuid(app.uuid)"
              >
                {{ app.uuid.slice(0, 8) }}…
                <Check v-if="copiedUuid === app.uuid" class="h-3.5 w-3.5 text-emerald-600" />
                <Copy v-else class="h-3.5 w-3.5 opacity-60 group-hover:opacity-100" />
              </button>
            </td>
            <td class="px-4 py-3">
              <UiBadge v-if="app.bundle_limit != null" variant="destructive">{{ app.bundle_limit }}</UiBadge>
              <UiBadge v-else variant="muted">Unlimited</UiBadge>
            </td>
            <td class="px-4 py-3"><UiBadge variant="info">{{ app.bundles_count }}</UiBadge></td>
            <td class="px-4 py-3"><UiBadge variant="success">{{ app.channels_count }}</UiBadge></td>
            <td class="px-4 py-3">
              <div class="flex justify-end gap-1">
                <UiButton variant="ghost" size="icon" title="Edit" @click="openEdit(app)">
                  <Pencil class="h-4 w-4" />
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

    <UiDialog v-model:open="showEdit" title="Edit Application">
      <form class="space-y-4" @submit.prevent="saveEdit">
        <UiInput v-model="editForm.name" placeholder="Name" required />
        <UiInput v-model="editForm.description" placeholder="Description (optional)" />
        <div>
          <UiInput v-model="editForm.bundle_limit" type="number" placeholder="Bundle Retention Limit" />
          <p class="mt-1 text-xs text-muted-foreground">Leave empty for no limit.</p>
        </div>
        <p v-if="editError" class="text-sm text-destructive">{{ editError }}</p>
        <UiButton type="submit" class="w-full" :disabled="editPending">
          {{ editPending ? 'Saving…' : 'Save changes' }}
        </UiButton>
      </form>
    </UiDialog>
  </div>
</template>
