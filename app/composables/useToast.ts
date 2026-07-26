/**
 * Tiny global toast store (no dependency). Rendered by <UiToaster/> in the admin layout.
 */
export interface Toast {
  id: number
  message: string
  variant: 'success' | 'error' | 'info'
}

const toasts = ref<Toast[]>([])
let seq = 0

export function useToast() {
  function push(message: string, variant: Toast['variant'] = 'info', ms = 2500) {
    const id = ++seq
    toasts.value.push({ id, message, variant })
    setTimeout(() => dismiss(id), ms)
  }
  function dismiss(id: number) {
    toasts.value = toasts.value.filter((t) => t.id !== id)
  }
  return {
    toasts,
    dismiss,
    toast: push,
    success: (m: string) => push(m, 'success'),
    error: (m: string) => push(m, 'error'),
    info: (m: string) => push(m, 'info'),
  }
}
