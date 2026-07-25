<script setup lang="ts">
definePageMeta({ middleware: 'admin-auth', layout: 'admin' })

const { data: apps } = await useFetch('/api/admin/applications')
const { data: channels } = await useFetch('/api/admin/channels')

const form = reactive({
  application_id: null as number | null,
  channel_id: null as number | null,
  name: '',
  description: '',
  android_min_version_code: '',
  android_max_version_code: '',
  android_eq_version_code: '',
  ios_min_version_code: '',
  ios_max_version_code: '',
  ios_eq_version_code: '',
})
const file = ref<File | null>(null)
const error = ref('')
const pending = ref(false)

const appOptions = computed(() => (apps.value ?? []).map((a) => ({ value: a.id, label: a.name })))
// Reactive: channel select filtered by the selected application (docs/06 form).
const channelOptions = computed(() =>
  (channels.value ?? [])
    .filter((c) => c.application_id === form.application_id)
    .map((c) => ({ value: c.id, label: c.name })),
)
watch(() => form.application_id, () => (form.channel_id = null))

function onFile(e: Event) {
  file.value = (e.target as HTMLInputElement).files?.[0] ?? null
}

async function submit() {
  error.value = ''
  if (!file.value || !form.application_id) {
    error.value = 'Application and file are required.'
    return
  }
  pending.value = true
  try {
    const fd = new FormData()
    fd.set('file', file.value)
    for (const [k, v] of Object.entries(form)) {
      if (v !== null && v !== '') fd.set(k, String(v))
    }
    await $fetch('/api/admin/bundles', { method: 'POST', body: fd })
    await navigateTo('/admin/bundles')
  } catch (e: any) {
    error.value = apiErrorMessage(e, 'Upload failed')
  } finally {
    pending.value = false
  }
}
</script>

<template>
  <div class="max-w-2xl">
    <h1 class="mb-6 text-2xl font-semibold">Create Bundle</h1>
    <form class="space-y-6" @submit.prevent="submit">
      <div class="grid grid-cols-2 gap-4">
        <UiSelect v-model="form.application_id" :options="appOptions" placeholder="Application *" required />
        <UiSelect v-model="form.channel_id" :options="channelOptions" placeholder="Channel (optional)" />
      </div>

      <div>
        <UiInput v-model="form.name" placeholder="v1.0.0" required />
        <p class="mt-1 text-xs text-muted-foreground">This is the version of the bundle</p>
      </div>
      <UiInput v-model="form.description" placeholder="Description (optional)" />

      <div>
        <input
          type="file"
          accept=".zip"
          required
          class="w-full rounded-md border border-dashed border-input p-4 text-sm"
          @change="onFile"
        >
        <p class="mt-1 text-xs text-muted-foreground">Bundle ZIP, max 10 MB.</p>
      </div>

      <fieldset class="rounded-lg border p-4">
        <legend class="px-1 text-sm font-medium">Android Version Code</legend>
        <div class="grid grid-cols-3 gap-4">
          <UiInput v-model="form.android_min_version_code" type="number" placeholder="Minimum" />
          <UiInput v-model="form.android_max_version_code" type="number" placeholder="Maximum" />
          <div>
            <UiInput v-model="form.android_eq_version_code" type="number" placeholder="Exclude (equal)" />
            <p class="mt-1 text-xs text-muted-foreground">Devices with this exact versionCode will not receive this bundle.</p>
          </div>
        </div>
      </fieldset>

      <fieldset class="rounded-lg border p-4">
        <legend class="px-1 text-sm font-medium">iOS Build Number</legend>
        <div class="grid grid-cols-3 gap-4">
          <UiInput v-model="form.ios_min_version_code" type="number" placeholder="Minimum" />
          <UiInput v-model="form.ios_max_version_code" type="number" placeholder="Maximum" />
          <div>
            <UiInput v-model="form.ios_eq_version_code" type="number" placeholder="Exclude (equal)" />
            <p class="mt-1 text-xs text-muted-foreground">Devices with this exact CFBundleVersion will not receive this bundle.</p>
          </div>
        </div>
      </fieldset>

      <p v-if="error" class="text-sm text-destructive">{{ error }}</p>
      <div class="flex gap-3">
        <UiButton type="submit" :disabled="pending">{{ pending ? 'Uploading…' : 'Create' }}</UiButton>
        <UiButton variant="outline" @click="navigateTo('/admin/bundles')">Cancel</UiButton>
      </div>
    </form>
  </div>
</template>
