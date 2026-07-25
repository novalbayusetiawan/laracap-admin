/**
 * Laravel-compatible serialization (docs/12-business-rules-and-quirks.md).
 *
 * The API contract is FROZEN for cap-update v8.x / laracap-cli v1.x. Laravel serializes
 * models with snake_case keys and timestamps as ISO 8601 with 6-digit microseconds and a
 * trailing `Z`, e.g. "2026-06-13T05:54:19.000000Z". D1/Drizzle will not produce that shape
 * on its own, so every timestamp crossing the API boundary passes through here.
 */

/** Convert a stored timestamp (TEXT or epoch) to Laravel's `Y-m-d\TH:i:s.uuuuuuZ`. */
export function toLaravelTimestamp(value: string | number | Date | null | undefined): string | null {
  if (value === null || value === undefined || value === '') return null

  let date: Date
  if (value instanceof Date) {
    date = value
  } else if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}:\d{2}/.test(value)) {
    // SQLite/D1 store naive UTC datetimes ("YYYY-MM-DD HH:MM:SS"). Normalise to an
    // explicit UTC instant so JS doesn't reinterpret them in the local timezone.
    const iso = value.replace(' ', 'T')
    date = new Date(/[zZ]|[+-]\d{2}:?\d{2}$/.test(iso) ? iso : iso + 'Z')
  } else {
    date = new Date(value)
  }
  if (Number.isNaN(date.getTime())) return null

  const pad = (n: number, len = 2) => String(n).padStart(len, '0')
  const y = date.getUTCFullYear()
  const mo = pad(date.getUTCMonth() + 1)
  const d = pad(date.getUTCDate())
  const h = pad(date.getUTCHours())
  const mi = pad(date.getUTCMinutes())
  const s = pad(date.getUTCSeconds())
  const micro = pad(date.getUTCMilliseconds(), 3) + '000' // ms → 6-digit microseconds
  return `${y}-${mo}-${d}T${h}:${mi}:${s}.${micro}Z`
}
