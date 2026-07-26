<script setup lang="ts">
import { useToast } from '~/composables/useToast'

definePageMeta({ middleware: 'admin-auth', layout: 'admin' })

const { fetch: refreshSession } = useUserSession()
const { data: profile } = await useFetch('/api/admin/profile')
const { success } = useToast()

// ----- profile details -----
const form = reactive({
  name: profile.value?.name ?? '',
  email: profile.value?.email ?? '',
  company: profile.value?.company ?? '',
  bio: profile.value?.bio ?? '',
})
const error = ref('')
const pending = ref(false)

async function save() {
  error.value = ''
  pending.value = true
  try {
    await $fetch('/api/admin/profile', { method: 'PATCH', body: form })
    await refreshSession()
    success('Profile updated')
  } catch (e: any) {
    error.value = apiErrorMessage(e, 'Update failed')
  } finally {
    pending.value = false
  }
}

// ----- password change (separate form; sends profile fields + password pair) -----
const pwForm = reactive({ current_password: '', password: '', password_confirm: '' })
const pwError = ref('')
const pwPending = ref(false)

async function changePassword() {
  pwError.value = ''
  if (pwForm.password !== pwForm.password_confirm) {
    pwError.value = 'New password and confirmation do not match.'
    return
  }
  pwPending.value = true
  try {
    await $fetch('/api/admin/profile', {
      method: 'PATCH',
      body: { ...form, current_password: pwForm.current_password, password: pwForm.password },
    })
    Object.assign(pwForm, { current_password: '', password: '', password_confirm: '' })
    success('Password changed')
  } catch (e: any) {
    pwError.value = apiErrorMessage(e, 'Password change failed')
  } finally {
    pwPending.value = false
  }
}
</script>

<template>
  <div class="max-w-2xl">
    <h1 class="mb-6 text-2xl font-semibold">Profile</h1>

    <div class="space-y-8">
      <!-- Details -->
      <section class="rounded-lg border bg-card p-6">
        <h2 class="mb-1 text-lg font-medium">Details</h2>
        <p class="mb-4 text-sm text-muted-foreground">Your name and email are shown across the admin panel.</p>
        <form class="space-y-4" @submit.prevent="save">
          <div class="grid gap-4 sm:grid-cols-2">
            <div>
              <label class="mb-1 block text-sm text-muted-foreground">Name</label>
              <UiInput v-model="form.name" required />
            </div>
            <div>
              <label class="mb-1 block text-sm text-muted-foreground">Email</label>
              <UiInput v-model="form.email" type="email" required />
            </div>
          </div>
          <div>
            <label class="mb-1 block text-sm text-muted-foreground">Company (optional)</label>
            <UiInput v-model="form.company" />
          </div>
          <div>
            <label class="mb-1 block text-sm text-muted-foreground">Bio (optional)</label>
            <textarea
              v-model="form.bio"
              rows="3"
              class="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              placeholder="A short bio…"
            />
          </div>
          <p v-if="error" class="text-sm text-destructive">{{ error }}</p>
          <UiButton type="submit" :disabled="pending">{{ pending ? 'Saving…' : 'Save changes' }}</UiButton>
        </form>
      </section>

      <!-- Password -->
      <section class="rounded-lg border bg-card p-6">
        <h2 class="mb-1 text-lg font-medium">Change password</h2>
        <p class="mb-4 text-sm text-muted-foreground">You'll need your current password. Minimum 8 characters.</p>
        <form class="space-y-4" @submit.prevent="changePassword">
          <div>
            <label class="mb-1 block text-sm text-muted-foreground">Current password</label>
            <UiInput v-model="pwForm.current_password" type="password" autocomplete="current-password" required />
          </div>
          <div class="grid gap-4 sm:grid-cols-2">
            <div>
              <label class="mb-1 block text-sm text-muted-foreground">New password</label>
              <UiInput v-model="pwForm.password" type="password" autocomplete="new-password" required />
            </div>
            <div>
              <label class="mb-1 block text-sm text-muted-foreground">Confirm new password</label>
              <UiInput v-model="pwForm.password_confirm" type="password" autocomplete="new-password" required />
            </div>
          </div>
          <p v-if="pwError" class="text-sm text-destructive">{{ pwError }}</p>
          <UiButton type="submit" :disabled="pwPending">{{ pwPending ? 'Changing…' : 'Change password' }}</UiButton>
        </form>
      </section>
    </div>
  </div>
</template>
