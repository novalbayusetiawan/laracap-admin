// LaraCap Admin — Nuxt 4 full-stack on Cloudflare Workers.
// Deployed as a single Worker with Static Assets (Pages is legacy for new projects).
// Full specification: docs/
import tailwindcss from '@tailwindcss/vite'

export default defineNuxtConfig({
  compatibilityDate: '2025-07-01',

  future: {
    compatibilityVersion: 4,
  },

  modules: ['nuxt-auth-utils', 'nitro-cloudflare-dev'],

  css: ['~/assets/css/main.css'],

  vite: {
    plugins: [tailwindcss()],
  },

  // Deploy to Cloudflare Workers (single Worker + static assets + bindings).
  nitro: {
    preset: 'cloudflare_module',
    cloudflare: {
      deployConfig: true,
      nodeCompat: true,
    },
  },

  runtimeConfig: {
    // Overridden at runtime by NUXT_SESSION_PASSWORD / NUXT_PUBLIC_APP_URL etc.
    session: {
      // nuxt-auth-utils reads NUXT_SESSION_PASSWORD automatically.
    },
    public: {
      appUrl: '',
    },
  },

  devtools: { enabled: true },

  typescript: {
    strict: true,
    typeCheck: false, // run explicitly via `npm run typecheck` to keep dev fast
  },
})
