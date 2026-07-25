<script setup lang="ts">
definePageMeta({ middleware: 'admin-auth', layout: false })

const { fetch: refreshSession } = useUserSession()
const form = reactive({ email: '', password: '' })
const error = ref('')
const pending = ref(false)

async function submit() {
  error.value = ''
  pending.value = true
  try {
    await $fetch('/api/admin/login', { method: 'POST', body: form })
    await refreshSession()
    await navigateTo('/admin')
  } catch (e: any) {
    error.value = apiErrorMessage(e, 'Login failed')
  } finally {
    pending.value = false
  }
}
</script>

<template>
  <div class="flex min-h-screen items-center justify-center bg-muted/40">
    <div class="w-full max-w-sm rounded-lg border bg-card p-8 shadow-sm">
      <h1 class="mb-1 text-xl font-semibold">Sign in</h1>
      <p class="mb-6 text-sm text-muted-foreground">LaraCap Admin</p>
      <form class="space-y-4" @submit.prevent="submit">
        <UiInput v-model="form.email" type="email" placeholder="Email" required autocomplete="email" />
        <UiInput v-model="form.password" type="password" placeholder="Password" required autocomplete="current-password" />
        <p v-if="error" class="text-sm text-destructive">{{ error }}</p>
        <UiButton type="submit" class="w-full" :disabled="pending">
          {{ pending ? 'Signing in…' : 'Sign in' }}
        </UiButton>
      </form>
      <p class="mt-4 text-center text-sm text-muted-foreground">
        No account?
        <NuxtLink to="/admin/register" class="font-medium text-foreground underline">Register</NuxtLink>
      </p>
    </div>
  </div>
</template>
