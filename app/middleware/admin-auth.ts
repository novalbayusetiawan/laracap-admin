/**
 * Guard /admin/** pages: redirect guests to login (docs/06 panel config).
 * Public: /admin/login, /admin/register.
 */
export default defineNuxtRouteMiddleware((to) => {
  const { loggedIn } = useUserSession()
  const isPublic = to.path === '/admin/login' || to.path === '/admin/register'

  if (!loggedIn.value && !isPublic) return navigateTo('/admin/login')
  if (loggedIn.value && isPublic) return navigateTo('/admin')
})
