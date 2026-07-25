<script setup lang="ts">
import { Plus, Trash2, VenetianMask } from 'lucide-vue-next'
import { formatDate } from '~/utils/ui'

definePageMeta({ middleware: 'admin-auth', layout: 'admin' })

// Admin-only page: bounce non-admins (server enforces too).
const { user } = useUserSession()
if (!user.value?.isAdmin) {
  await navigateTo('/admin')
}

const { data: rows, refresh } = await useFetch('/api/admin/users')

const showCreate = ref(false)
const form = reactive({ name: '', email: '', password: '', is_admin: false })
const error = ref('')
const pending = ref(false)

async function create() {
  error.value = ''
  pending.value = true
  try {
    await $fetch('/api/admin/users', { method: 'POST', body: form })
    showCreate.value = false
    Object.assign(form, { name: '', email: '', password: '', is_admin: false })
    await refresh()
  } catch (e: any) {
    error.value = apiErrorMessage(e, 'Create failed')
  } finally {
    pending.value = false
  }
}

async function remove(id: number) {
  if (!confirm('Delete this user? Their applications and bundles will be removed.')) return
  try {
    await $fetch(`/api/admin/users/${id}`, { method: 'DELETE' })
    await refresh()
  } catch (e: any) {
    alert(apiErrorMessage(e, 'Delete failed'))
  }
}

const { fetch: refreshSession } = useUserSession()
async function impersonate(id: number) {
  await $fetch(`/api/admin/impersonate/${id}`, { method: 'POST' })
  await refreshSession()
  await navigateTo('/admin')
}
</script>

<template>
  <div>
    <div class="mb-6 flex items-center justify-between">
      <h1 class="text-2xl font-semibold">Users</h1>
      <UiButton @click="showCreate = true">
        <Plus class="h-4 w-4" /> Create
      </UiButton>
    </div>

    <div class="overflow-hidden rounded-lg border">
      <table class="w-full text-sm">
        <thead class="border-b bg-muted/50 text-left">
          <tr>
            <th class="px-4 py-3 font-medium">Name</th>
            <th class="px-4 py-3 font-medium">Email</th>
            <th class="px-4 py-3 font-medium">Role</th>
            <th class="px-4 py-3 font-medium">Applications</th>
            <th class="px-4 py-3 font-medium">Joined</th>
            <th class="px-4 py-3" />
          </tr>
        </thead>
        <tbody>
          <tr v-for="u in rows" :key="u.id" class="border-b last:border-0 hover:bg-muted/30">
            <td class="px-4 py-3 font-medium">{{ u.name }}</td>
            <td class="px-4 py-3 text-muted-foreground">{{ u.email }}</td>
            <td class="px-4 py-3">
              <UiBadge :variant="u.is_superadmin ? 'destructive' : u.is_admin ? 'default' : 'muted'">
                {{ u.is_superadmin ? 'Superadmin' : u.is_admin ? 'Admin' : 'User' }}
              </UiBadge>
            </td>
            <td class="px-4 py-3"><UiBadge variant="info">{{ u.applications_count }}</UiBadge></td>
            <td class="px-4 py-3 text-muted-foreground">{{ formatDate(u.created_at) }}</td>
            <td class="px-4 py-3 text-right">
              <UiButton v-if="user?.isSuperadmin && u.id !== user?.id" variant="ghost" size="icon" title="Impersonate" @click="impersonate(u.id)">
                <VenetianMask class="h-4 w-4" />
              </UiButton>
              <UiButton v-if="u.id !== user?.id" variant="ghost" size="icon" title="Delete" @click="remove(u.id)">
                <Trash2 class="h-4 w-4 text-destructive" />
              </UiButton>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <UiDialog v-model:open="showCreate" title="Create User">
      <form class="space-y-4" @submit.prevent="create">
        <UiInput v-model="form.name" placeholder="Name" required />
        <UiInput v-model="form.email" type="email" placeholder="Email" required autocomplete="off" />
        <UiInput v-model="form.password" type="password" placeholder="Password (min 8 chars)" required autocomplete="new-password" />
        <label class="flex items-center gap-2 text-sm">
          <input v-model="form.is_admin" type="checkbox" class="h-4 w-4 rounded border-input accent-primary">
          Administrator
        </label>
        <p v-if="error" class="text-sm text-destructive">{{ error }}</p>
        <UiButton type="submit" class="w-full" :disabled="pending">
          {{ pending ? 'Creating…' : 'Create' }}
        </UiButton>
      </form>
    </UiDialog>
  </div>
</template>
