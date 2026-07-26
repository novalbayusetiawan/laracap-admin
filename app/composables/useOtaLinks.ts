/**
 * Public OTA endpoint links for an application (docs/03-api-contract.md).
 * `channel` defaults to "production" — the OTA endpoints' own default.
 */
export function useOtaLinks() {
  const origin = computed(() => (import.meta.client ? window.location.origin : useRuntimeConfig().public.appUrl || ''))

  function checkLink(uuid: string, channel = 'production'): string {
    return `${origin.value}/api/applications/${uuid}/bundles/latest?channel=${encodeURIComponent(channel)}`
  }
  function downloadLink(uuid: string, channel = 'production'): string {
    return `${origin.value}/api/applications/${uuid}/bundles/latest/download?channel=${encodeURIComponent(channel)}`
  }
  return { checkLink, downloadLink }
}
