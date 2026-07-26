<script setup lang="ts">
import { Cpu, Key, LayoutDashboard, LayoutGrid, LogOut, Radio, Settings, Smartphone, UserCircle, UserCog, UserX } from 'lucide-vue-next'

const { user, clear, fetch: refreshSession } = useUserSession()
const route = useRoute()

// Grouped nav: a "Main" section for day-to-day resources, a "Settings" section
// for account/config. Superadmin-only and admin-only items appear conditionally.
const sections = computed(() => [
  {
    label: 'Main',
    items: [
      { label: 'Dashboard', to: '/admin', icon: LayoutDashboard, exact: true },
      { label: 'Applications', to: '/admin/applications', icon: LayoutGrid },
      { label: 'Bundles', to: '/admin/bundles', icon: Cpu },
      { label: 'Channels', to: '/admin/channels', icon: Radio },
      { label: 'Devices', to: '/admin/devices', icon: Smartphone },
      ...(user.value?.isAdmin ? [{ label: 'Users', to: '/admin/users', icon: UserCircle }] : []),
    ],
  },
  {
    label: 'Settings',
    items: [
      { label: 'Profile', to: '/admin/settings/profile', icon: UserCog },
      { label: 'API Tokens', to: '/admin/settings/tokens', icon: Key },
      ...(user.value?.isSuperadmin ? [{ label: 'General', to: '/admin/settings/general', icon: Settings }] : []),
    ],
  },
])

function isActive(to: string, exact?: boolean) {
  return exact ? route.path === to : route.path.startsWith(to)
}

async function logout() {
  await $fetch('/api/admin/logout', { method: 'POST' })
  await clear()
  await navigateTo('/admin/login')
}

async function stopImpersonating() {
  await $fetch('/api/admin/impersonate', { method: 'DELETE' })
  await refreshSession()
  await navigateTo('/admin/users')
}
</script>

<template>
  <div class="flex min-h-screen">
    <aside class="flex w-60 flex-col border-r bg-card">
      <NuxtLink to="/admin" class="flex h-14 items-center gap-2 border-b px-4 font-semibold">
        <span class="flex h-7 w-7 items-center justify-center rounded bg-primary text-xs font-bold text-primary-foreground">LC</span>
        LaraCap
      </NuxtLink>
      <nav class="flex-1 space-y-5 overflow-y-auto p-3">
        <div v-for="section in sections" :key="section.label">
          <p class="px-3 pb-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground/70">
            {{ section.label }}
          </p>
          <div class="space-y-1">
            <NuxtLink
              v-for="item in section.items"
              :key="item.to"
              :to="item.to"
              class="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
              :class="{ 'bg-accent text-accent-foreground': isActive(item.to, item.exact) }"
            >
              <component :is="item.icon" class="h-4 w-4" />
              {{ item.label }}
            </NuxtLink>
          </div>
        </div>
      </nav>
      <div class="border-t p-3">
        <NuxtLink
          to="/admin/settings/profile"
          class="mb-2 flex items-center gap-2 rounded-md px-3 py-1.5 text-sm hover:bg-accent"
        >
          <div class="min-w-0 flex-1">
            <div class="flex items-center gap-1.5 font-medium">
              <span class="truncate">{{ user?.name }}</span>
              <UiBadge v-if="user?.isSuperadmin" variant="default">super</UiBadge>
            </div>
            <div class="truncate text-xs text-muted-foreground">{{ user?.email }}</div>
          </div>
        </NuxtLink>
        <button
          class="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-accent hover:text-accent-foreground"
          @click="logout"
        >
          <LogOut class="h-4 w-4" />
          Sign out
        </button>
      </div>
    </aside>
    <div class="flex flex-1 flex-col">
      <div
        v-if="user?.impersonatorId"
        class="flex items-center justify-between gap-3 border-b border-amber-300 bg-amber-50 px-6 py-2 text-sm text-amber-900"
      >
        <span>You are impersonating <strong>{{ user.name }}</strong> ({{ user.email }})</span>
        <button class="inline-flex items-center gap-1.5 rounded-md border border-amber-300 px-2.5 py-1 text-xs font-medium hover:bg-amber-100" @click="stopImpersonating">
          <UserX class="h-3.5 w-3.5" />
          Stop impersonating
        </button>
      </div>
      <main class="flex-1 overflow-auto p-6">
        <slot />
      </main>
    </div>
    <UiToaster />
  </div>
</template>
