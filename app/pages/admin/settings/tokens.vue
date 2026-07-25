<script setup lang="ts">
import { Copy, Plus, Trash2 } from 'lucide-vue-next'
import { formatDate } from '~/utils/ui'

definePageMeta({ middleware: 'admin-auth', layout: 'admin' })

const { data: rows, refresh } = await useFetch('/api/admin/tokens')
const { user } = useUserSession()

const showCreate = ref(false)
const form = reactive({ name: '', expires_at: '' })
const error = ref('')
const pending = ref(false)

// Show-once: plain token held only in this ref, cleared when dialog closes.
const createdToken = ref('')
const copied = ref(false)

async function create() {
  error.value = ''
  pending.value = true
  try {
    const res = await $fetch('/api/admin/tokens', { method: 'POST', body: {
      name: form.name,
      expires_at: form.expires_at || null,
    } })
    createdToken.value = res.token
    Object.assign(form, { name: '', expires_at: '' })
    await refresh()
  } catch (e: any) {
    error.value = apiErrorMessage(e, 'Create failed')
  } finally {
    pending.value = false
  }
}

async function copyToken() {
  await navigator.clipboard.writeText(createdToken.value)
  copied.value = true
  setTimeout(() => (copied.value = false), 1500)
}

function closeCreate() {
  showCreate.value = false
  createdToken.value = ''
}

async function revoke(id: number) {
  if (!confirm('Revoke this token? CLI clients using it will stop working immediately.')) return
  await $fetch(`/api/admin/tokens/${id}`, { method: 'DELETE' })
  await refresh()
}
</script>

<template>
  <div>
    <div class="mb-6 flex items-center justify-between">
      <h1 class="text-2xl font-semibold">API Tokens</h1>
      <UiButton @click="showCreate = true">
        <Plus class="h-4 w-4" /> Create
      </UiButton>
    </div>

    <div class="overflow-hidden rounded-lg border">
      <table class="w-full text-sm">
        <thead class="border-b bg-muted/50 text-left">
          <tr>
            <th class="px-4 py-3 font-medium">Name</th>
            <th v-if="user?.isAdmin" class="px-4 py-3 font-medium">Owner</th>
            <th class="px-4 py-3 font-medium">Created</th>
            <th class="px-4 py-3 font-medium">Last Used</th>
            <th class="px-4 py-3 font-medium">Expires</th>
            <th class="px-4 py-3" />
          </tr>
        </thead>
        <tbody>
          <tr v-for="t in rows" :key="t.id" class="border-b last:border-0 hover:bg-muted/30">
            <td class="px-4 py-3 font-medium">{{ t.name }}</td>
            <td v-if="user?.isAdmin" class="px-4 py-3 text-muted-foreground">{{ t.user_name }}</td>
            <td class="px-4 py-3 text-muted-foreground">{{ formatDate(t.created_at) }}</td>
            <td class="px-4 py-3 text-muted-foreground">{{ t.last_used_at ? formatDate(t.last_used_at) : 'Never' }}</td>
            <td class="px-4 py-3">
              <UiBadge v-if="t.expired" variant="destructive">Expired</UiBadge>
              <span v-else-if="t.expires_at" class="text-muted-foreground">{{ formatDate(t.expires_at) }}</span>
              <UiBadge v-else variant="muted">Never</UiBadge>
            </td>
            <td class="px-4 py-3 text-right">
              <UiButton variant="ghost" size="icon" title="Revoke" @click="revoke(t.id)">
                <Trash2 class="h-4 w-4 text-destructive" />
              </UiButton>
            </td>
          </tr>
          <tr v-if="!rows?.length">
            <td :colspan="user?.isAdmin ? 6 : 5" class="px-4 py-10 text-center text-muted-foreground">
              No tokens yet. Create one to use with <code class="rounded bg-muted px-1">laracap-cli</code>.
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <UiDialog :open="showCreate" title="Create API Token" @update:open="closeCreate">
      <!-- Step 2: show-once token reveal -->
      <div v-if="createdToken" class="space-y-4">
        <p class="text-sm text-muted-foreground">
          Copy your token now — <strong>it won't be shown again.</strong>
        </p>
        <div class="flex items-center gap-2">
          <code class="flex-1 break-all rounded-md border bg-muted px-3 py-2 font-mono text-xs">{{ createdToken }}</code>
          <UiButton variant="outline" size="icon" title="Copy" @click="copyToken">
            <Copy class="h-4 w-4" />
          </UiButton>
        </div>
        <p v-if="copied" class="text-sm text-emerald-600">Copied!</p>
        <UiButton class="w-full" @click="closeCreate">Done</UiButton>
      </div>

      <!-- Step 1: form -->
      <form v-else class="space-y-4" @submit.prevent="create">
        <UiInput v-model="form.name" placeholder="e.g. CI deploy token" required />
        <div>
          <label class="mb-1 block text-sm text-muted-foreground">Expires at (optional)</label>
          <UiInput v-model="form.expires_at" type="datetime-local" />
        </div>
        <p v-if="error" class="text-sm text-destructive">{{ error }}</p>
        <UiButton type="submit" class="w-full" :disabled="pending">
          {{ pending ? 'Creating…' : 'Create' }}
        </UiButton>
      </form>
    </UiDialog>
  </div>
</template>
