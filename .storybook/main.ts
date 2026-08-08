import type { StorybookConfig } from '@storybook/react-vite'

/**
 * The UI kit, on its own.
 *
 * These components were designed to be shared — one modal shell, one table, one
 * loading/failed/empty triad — but they are only ever seen from inside a screen,
 * where their variants are whatever that screen happens to need. Here each one
 * is exercised directly, including the states that are awkward to reach in the
 * running application.
 */
const config: StorybookConfig = {
  stories: ['../src/**/*.stories.@(ts|tsx)'],
  addons: ['@storybook/addon-docs', '@storybook/addon-a11y'],
  framework: { name: '@storybook/react-vite', options: {} },
  // Published alongside the demo on the same GitHub Pages site.
  viteFinal: (viteConfig) => ({
    ...viteConfig,
    base: process.env['STORYBOOK_BASE'] ?? '/',
  }),
}

export default config
