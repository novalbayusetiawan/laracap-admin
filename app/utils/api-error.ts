/** Extract a human message from a $fetch/H3 error (prod strips statusMessage). */
export function apiErrorMessage(e: unknown, fallback = 'Something went wrong'): string {
  const err = e as { data?: { message?: string, statusMessage?: string }, statusMessage?: string, message?: string }
  return err?.data?.message ?? err?.data?.statusMessage ?? err?.statusMessage ?? fallback
}
