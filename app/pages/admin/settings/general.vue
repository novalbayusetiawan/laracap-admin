<script setup lang="ts">
definePageMeta({ middleware: 'admin-auth', layout: 'admin' })

const { user } = useUserSession()
if (!user.value?.isSuperadmin) {
  await navigateTo('/admin')
}

const { data: settings, refresh } = await useFetch('/api/admin/settings')
const saving = ref(false)

async function toggleRegistration() {
  saving.value = true
  try {
    await $fetch('/api/admin/settings', {
      method: 'PATCH',
      body: { registration_enabled: !settings.value?.registration_enabled },
    })
    await refresh()
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <div class="max-w-2xl">
    <h1 class="mb-6 text-2xl font-semibold">Settings</h1>

    <div class="rounded-lg border bg-card shadow-sm">
      <div class="flex items-center justify-between p-4">
        <div>
          <p class="font-medium">Public registration</p>
          <p class="text-sm text-muted-foreground">
            Allow anyone to create an account from the register page. The first account
            (superadmin) is always allowed regardless of this setting.
          </p>
        </div>
        <button
          role="switch"
          :aria-checked="!!settings?.registration_enabled"
          :disabled="saving"
          class="relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors disabled:opacity-50"
          :class="settings?.registration_enabled ? 'bg-primary' : 'bg-muted-foreground/30'"
          @click="toggleRegistration"
        >
          <span
            class="inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform"
            :class="settings?.registration_enabled ? 'translate-x-5' : 'translate-x-0.5'"
          />
        </button>
      </div>
    </div>
  </div>
</template>
