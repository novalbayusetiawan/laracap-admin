// Type augmentation for nuxt-auth-utils sealed-cookie sessions.
declare module '#auth-utils' {
  interface User {
    id: number
    name: string
    email: string
    isAdmin: boolean
    isSuperadmin?: boolean
    impersonatorId?: number
  }
}

export {}
