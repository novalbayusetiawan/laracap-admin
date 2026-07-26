<script setup lang="ts">
import { ArrowLeft, Check, Copy, Download, Link2 } from 'lucide-vue-next'
import { formatBytes, formatDate } from '~/utils/ui'
import { useToast } from '~/composables/useToast'
import { useOtaLinks } from '~/composables/useOtaLinks'

definePageMeta({ middleware: 'admin-auth', layout: 'admin' })

const route = useRoute()
const { data: app, error: fetchError } = await useFetch(`/api/admin/applications/${route.params.id}`)
if (fetchError.value) {
  throw createError({ statusCode: 404, statusMessage: 'Application not found' })
}

const { success, error: toastError } = useToast()
const { checkLink, downloadLink } = useOtaLinks()

// Channel selector for the integration links; default to "production" if it
// exists, else the first channel.
const selectedChannel = ref(
  app.value?.channels.find((c: any) => c.name === 'production')?.name ?? app.value?.channels[0]?.name ?? 'production',
)
const channelOptions = computed(() =>
  (app.value?.channels ?? []).map((c: any) => ({ value: c.name, label: c.name })),
)

const copiedKey = ref('')
async function copy(text: string, key: string, label: string) {
  try {
    await navigator.clipboard.writeText(text)
    copiedKey.value = key
    success(`${label} copied to clipboard`)
    setTimeout(() => {
      if (copiedKey.value === key) copiedKey.value = ''
    }, 2000)
  } catch {
    toastError('Could not copy — check browser permissions')
  }
}
</script>

<template>
  <div v-if="app" class="max-w-4xl">
    <div class="mb-6 flex items-center gap-3">
      <NuxtLink to="/admin/applications" class="rounded-md p-1.5 hover:bg-accent" title="Back to applications">
        <ArrowLeft class="h-4 w-4" />
      </NuxtLink>
      <div>
        <h1 class="text-2xl font-semibold">{{ app.name }}</h1>
        <p v-if="app.description" class="text-sm text-muted-foreground">{{ app.description }}</p>
      </div>
    </div>

    <div class="space-y-6">
      <!-- App ID + meta -->
      <section class="rounded-lg border bg-card p-6">
        <h2 class="mb-4 text-lg font-medium">Application</h2>
        <dl class="grid gap-4 sm:grid-cols-2">
          <div>
            <dt class="text-xs font-medium uppercase tracking-wide text-muted-foreground">App ID</dt>
            <dd class="mt-1">
              <button
                class="group inline-flex items-center gap-1.5 rounded-md border bg-muted/40 px-2 py-1 font-mono text-xs transition-colors hover:bg-muted"
                :title="copiedKey === 'uuid' ? 'Copied!' : 'Copy App ID'"
                @click="copy(app.uuid, 'uuid', 'App ID')"
              >
                {{ app.uuid }}
                <Check v-if="copiedKey === 'uuid'" class="h-3.5 w-3.5 text-emerald-600" />
                <Copy v-else class="h-3.5 w-3.5 opacity-60 group-hover:opacity-100" />
              </button>
            </dd>
          </div>
          <div>
            <dt class="text-xs font-medium uppercase tracking-wide text-muted-foreground">Bundle retention</dt>
            <dd class="mt-1">
              <UiBadge v-if="app.bundle_limit != null" variant="destructive">{{ app.bundle_limit }}</UiBadge>
              <UiBadge v-else variant="muted">Unlimited</UiBadge>
            </dd>
          </div>
          <div>
            <dt class="text-xs font-medium uppercase tracking-wide text-muted-foreground">Created</dt>
            <dd class="mt-1 text-sm">{{ formatDate(app.created_at) }}</dd>
          </div>
        </dl>
      </section>

      <!-- OTA integration links -->
      <section class="rounded-lg border bg-card p-6">
        <div class="mb-1 flex items-center gap-2">
          <Link2 class="h-4 w-4 text-muted-foreground" />
          <h2 class="text-lg font-medium">OTA links</h2>
        </div>
        <p class="mb-4 text-sm text-muted-foreground">
          Public endpoints your Capacitor app (or anything else) can call. No authentication required.
        </p>

        <div v-if="channelOptions.length" class="mb-4 max-w-52">
          <label class="mb-1 block text-xs font-medium uppercase tracking-wide text-muted-foreground">Channel</label>
          <UiSelect v-model="selectedChannel" :options="channelOptions" />
        </div>
        <p v-else class="mb-4 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          No channels yet — links below use the default <code class="font-mono">production</code> channel, which is
          created automatically on the first CLI upload.
        </p>

        <div class="space-y-3">
          <div>
            <label class="mb-1 block text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Latest bundle check (JSON)
            </label>
            <div class="flex items-center gap-2">
              <code class="min-w-0 flex-1 truncate rounded-md border bg-muted/40 px-3 py-2 font-mono text-xs">
                {{ checkLink(app.uuid, selectedChannel) }}
              </code>
              <UiButton
                variant="outline"
                size="icon"
                :title="copiedKey === 'check' ? 'Copied!' : 'Copy check link'"
                @click="copy(checkLink(app.uuid, selectedChannel), 'check', 'Check link')"
              >
                <Check v-if="copiedKey === 'check'" class="h-4 w-4 text-emerald-600" />
                <Copy v-else class="h-4 w-4" />
              </UiButton>
            </div>
          </div>
          <div>
            <label class="mb-1 block text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Latest bundle download (ZIP)
            </label>
            <div class="flex items-center gap-2">
              <code class="min-w-0 flex-1 truncate rounded-md border bg-muted/40 px-3 py-2 font-mono text-xs">
                {{ downloadLink(app.uuid, selectedChannel) }}
              </code>
              <UiButton
                variant="outline"
                size="icon"
                :title="copiedKey === 'download' ? 'Copied!' : 'Copy download link'"
                @click="copy(downloadLink(app.uuid, selectedChannel), 'download', 'Download link')"
              >
                <Check v-if="copiedKey === 'download'" class="h-4 w-4 text-emerald-600" />
                <Copy v-else class="h-4 w-4" />
              </UiButton>
              <a
                :href="downloadLink(app.uuid, selectedChannel)"
                title="Download latest bundle"
                class="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-input bg-background hover:bg-accent hover:text-accent-foreground"
              >
                <Download class="h-4 w-4" />
              </a>
            </div>
          </div>
        </div>
      </section>

      <!-- Channels -->
      <section class="rounded-lg border bg-card">
        <h2 class="border-b px-6 py-4 text-lg font-medium">Channels</h2>
        <table class="w-full text-sm">
          <tbody>
            <tr v-for="c in app.channels" :key="c.id" class="border-b last:border-0">
              <td class="px-6 py-3 font-medium">{{ c.name }}</td>
              <td class="px-6 py-3"><UiBadge variant="info">{{ c.bundles_count }} bundles</UiBadge></td>
              <td class="px-6 py-3 text-right text-muted-foreground">{{ formatDate(c.created_at) }}</td>
            </tr>
            <tr v-if="!app.channels.length">
              <td class="px-6 py-8 text-center text-muted-foreground">No channels yet.</td>
            </tr>
          </tbody>
        </table>
      </section>

      <!-- Recent bundles -->
      <section class="rounded-lg border bg-card">
        <h2 class="border-b px-6 py-4 text-lg font-medium">Recent bundles</h2>
        <table class="w-full text-sm">
          <tbody>
            <tr v-for="b in app.recent_bundles" :key="b.id" class="border-b last:border-0">
              <td class="px-6 py-3 font-medium">{{ b.name ?? `#${b.id}` }}</td>
              <td class="px-6 py-3">
                <UiBadge v-if="b.channel_name" variant="info">{{ b.channel_name }}</UiBadge>
                <span v-else class="text-muted-foreground">—</span>
              </td>
              <td class="px-6 py-3 text-muted-foreground">{{ formatBytes(b.size) }}</td>
              <td class="px-6 py-3 text-right text-muted-foreground">{{ formatDate(b.created_at) }}</td>
            </tr>
            <tr v-if="!app.recent_bundles.length">
              <td class="px-6 py-8 text-center text-muted-foreground">No bundles uploaded yet.</td>
            </tr>
          </tbody>
        </table>
      </section>
    </div>
  </div>
</template>
