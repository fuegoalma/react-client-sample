import { fileURLToPath, URL } from 'node:url'

import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

const alias = {
  '@': fileURLToPath(new URL('./src', import.meta.url)),
  '@tests': fileURLToPath(new URL('./tests', import.meta.url)),
}

/**
 * Two projects mirror the API's own split:
 *   unit       — layers in isolation (services, forms, transport). No React, no network.
 *   functional — whole pages against MSW handlers built from the OpenAPI contract.
 * End-to-end tests live in `tests/e2e` and run under Playwright, not Vitest.
 */
export default defineConfig({
  plugins: [react()],
  resolve: { alias },
  test: {
    globals: true,
    css: false,
    projects: [
      {
        resolve: { alias },
        test: {
          name: 'unit',
          globals: true,
          environment: 'node',
          include: ['tests/unit/**/*.test.{ts,tsx}'],
          setupFiles: ['tests/setup.unit.ts'],
        },
      },
      {
        resolve: { alias },
        test: {
          // The client's own reading of the OpenAPI document, checked against
          // the vendored copy of it rather than against a hand-written mirror.
          name: 'contract',
          globals: true,
          environment: 'node',
          include: ['tests/contract/**/*.test.ts'],
        },
      },
      {
        plugins: [react()],
        resolve: { alias },
        test: {
          name: 'functional',
          globals: true,
          environment: './tests/environment/jsdomWithNodeFetch.ts',
          include: ['tests/functional/**/*.test.{ts,tsx}'],
          setupFiles: ['tests/setup.functional.ts'],
        },
      },
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
      include: ['src/**/*.{ts,tsx}'],
      exclude: [
        // Only what carries no executable logic of its own: the entry point that
        // mounts the app on import, type declarations, and the barrel files.
        'src/main.tsx',
        'src/vite-env.d.ts',
        'src/types/**',
        'src/**/index.ts',
        // Storybook stories: sample props for the UI kit, exercised by
        // Storybook's own a11y run rather than by Vitest.
        'src/**/*.stories.tsx',
      ],
      thresholds: {
        lines: 100,
        branches: 100,
        functions: 100,
        statements: 100,
      },
    },
  },
})
