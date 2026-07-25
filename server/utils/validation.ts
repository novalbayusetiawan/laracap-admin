const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/** Matches Laravel's Str::isUuid() for the id-or-uuid application_id contract. */
export function isUuid(value: string): boolean {
  return UUID_RE.test(value)
}

/** Framework-free 422 error — H3 propagates `statusCode`/`statusMessage` from thrown errors. */
class ValidationError extends Error {
  statusCode = 422
  statusMessage: string
  constructor(message: string) {
    super(message)
    this.statusMessage = message
  }
}

/** Parse a native version-code form field: non-negative integer, or null when absent. */
export function parseVersionCode(value: FormDataEntryValue | null | undefined, field: string): number | null {
  if (value === undefined || value === null || value === '') return null
  const n = Number(value)
  if (!Number.isInteger(n) || n < 0) {
    throw new ValidationError(`The ${field} must be an integer >= 0.`)
  }
  return n
}
