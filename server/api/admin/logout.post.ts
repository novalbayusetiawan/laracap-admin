/** POST /api/admin/logout — clear the sealed-cookie session. */
export default defineEventHandler(async (event) => {
  await clearUserSession(event)
  return { ok: true }
})
