<script setup lang="ts">
const model = defineModel<string | number | null>()
defineProps<{ options: { value: string | number, label: string }[], placeholder?: string, required?: boolean }>()
</script>

<template>
  <select
    v-model="model"
    :required="required"
    class="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
  >
    <option :value="null" disabled>{{ placeholder ?? 'Select…' }}</option>
    <option v-for="opt in options" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
  </select>
</template>
