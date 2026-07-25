<script setup lang="ts">
import { cn } from '~/utils/ui'

defineProps<{ variant?: 'default' | 'success' | 'info' | 'destructive' | 'muted' }>()

const variants: Record<string, string> = {
  default: 'bg-primary/15 text-primary-foreground border-primary/20',
  success: 'bg-green-100 text-green-800 border-green-200',
  info: 'bg-blue-100 text-blue-800 border-blue-200',
  destructive: 'bg-red-100 text-red-800 border-red-200',
  muted: 'bg-muted text-muted-foreground border-border',
}
</script>

<template>
  <span :class="cn('inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium', variants[variant ?? 'default'])">
    <slot />
  </span>
</template>
