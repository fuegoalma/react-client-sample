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

export default defineConfig(({ mode }) => ({
  // The demo is published to a project page, so it is served from a
  // subdirectory rather than the domain root; a normal build stays at '/'.
  base: mode === 'demo' ? '/react-client-sample/' : '/',
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
    // Emitted, but not advertised: the browser only fetches a source map when
    // devtools are open and asked to, while `true` appends a comment that
    // publishes the whole unminified source to anyone who looks.
    sourcemap: 'hidden',
    rollupOptions: {
      output: {
        // The framework changes on our release schedule, the dependencies on
        // theirs — splitting them means a code change does not invalidate the
        // cached copy of React and Redux along with it.
        manualChunks: {
          // `react-dom/client` is listed in its own right: it is the entry the
          // application actually imports, and a bare 'react-dom' does not
          // resolve to the same module, leaving the bulk of it behind.
          react: ['react', 'react-dom', 'react-dom/client', 'react-router-dom'],
          redux: ['@reduxjs/toolkit', 'react-redux'],
          forms: ['react-hook-form', '@hookform/resolvers', 'zod'],
        },
      },
    },
  },
}))
