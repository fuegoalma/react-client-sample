import { fileURLToPath, URL } from 'node:url'

import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

/**
 * Bootstrap 5.3 still uses the legacy `@import` / global built-ins internally.
 * Silencing those keeps our own (modern) SCSS warnings visible instead of
 * drowning them in third-party deprecation noise.
 */
const bootstrapSilencedDeprecations = [
  'import',
  'global-builtin',
  'color-functions',
  'if-function',
] as const

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      '@tests': fileURLToPath(new URL('./tests', import.meta.url)),
    },
  },
  css: {
    preprocessorOptions: {
      scss: {
        silenceDeprecations: [...bootstrapSilencedDeprecations],
      },
    },
  },
  server: {
    host: true,
    port: 5173,
    strictPort: true,
    watch: {
      // Bind mounts on Linux hosts don't always deliver inotify events.
      usePolling: process.env['VITE_USE_POLLING'] === '1',
    },
  },
  preview: {
    host: true,
    // Not 5173: the dev server owns that port inside the same container, and
    // `strictPort` would make previewing the built bundle fail outright.
    port: 4173,
    strictPort: true,
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
  },
})
