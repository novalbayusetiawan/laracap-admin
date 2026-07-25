<script setup lang="ts">
definePageMeta({ middleware: 'admin-auth', layout: false })

const { fetch: refreshSession } = useUserSession()
const form = reactive({ name: '', email: '', password: '', password_confirmation: '' })
const error = ref('')
const pending = ref(false)

async function submit() {
  error.value = ''
  if (form.password !== form.password_confirmation) {
    error.value = 'Passwords do not match.'
    return
  }
  pending.value = true
  try {
    await $fetch('/api/admin/register', { method: 'POST', body: form })
    await refreshSession()
    await navigateTo('/admin')
  } catch (e: any) {
    error.value = apiErrorMessage(e, 'Registration failed')
  } finally {
    pending.value = false
  }
}
</script>

<template>
  <div class="flex min-h-screen items-center justify-center bg-muted/40">
    <div class="w-full max-w-sm rounded-lg border bg-card p-8 shadow-sm">
      <h1 class="mb-1 text-xl font-semibold">Create account</h1>
      <p class="mb-6 text-sm text-muted-foreground">LaraCap Admin</p>
      <form class="space-y-4" @submit.prevent="submit">
        <UiInput v-model="form.name" placeholder="Name" required autocomplete="name" />
        <UiInput v-model="form.email" type="email" placeholder="Email" required autocomplete="email" />
        <UiInput v-model="form.password" type="password" placeholder="Password (min 8 chars)" required autocomplete="new-password" />
        <UiInput v-model="form.password_confirmation" type="password" placeholder="Confirm password" required autocomplete="new-password" />
        <p v-if="error" class="text-sm text-destructive">{{ error }}</p>
        <UiButton type="submit" class="w-full" :disabled="pending">
          {{ pending ? 'Creating…' : 'Register' }}
        </UiButton>
      </form>
      <p class="mt-4 text-center text-sm text-muted-foreground">
        Have an account?
        <NuxtLink to="/admin/login" class="font-medium text-foreground underline">Sign in</NuxtLink>
      </p>
    </div>
  </div>
</template>
