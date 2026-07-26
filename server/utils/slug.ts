/** URL-safe slug from arbitrary text. */
export function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 255)
}

/**
 * Return `base`, or `base-2`, `base-3`… until `exists(candidate)` is false.
 */
export async function uniqueSlug(base: string, exists: (slug: string) => Promise<boolean>): Promise<string> {
  if (!(await exists(base))) return base
  for (let n = 2; ; n++) {
    const candidate = `${base}-${n}`
    if (!(await exists(candidate))) return candidate
  }
}
