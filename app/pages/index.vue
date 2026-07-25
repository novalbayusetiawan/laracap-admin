<script setup lang="ts">
definePageMeta({ middleware: 'admin-auth' })

// Default redirect (docs/06): `/` → admin panel (login guard handles guests).
await navigateTo('/admin', { redirectCode: 302 })
</script>

<template>
  <div />
</template>
