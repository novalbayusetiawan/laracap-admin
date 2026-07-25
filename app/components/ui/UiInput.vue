<script setup lang="ts">
const model = defineModel<string | number | null>()
defineProps<{ type?: string, placeholder?: string, required?: boolean, autocomplete?: string }>()
</script>

<template>
  <input
    v-model="model"
    :type="type ?? 'text'"
    :placeholder="placeholder"
    :required="required"
    :autocomplete="autocomplete"
    class="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
  >
</template>
