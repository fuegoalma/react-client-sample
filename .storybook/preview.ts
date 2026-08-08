import type { Preview } from '@storybook/react-vite'

// The real stylesheet, not an approximation of it: a component that passes its
// contrast checks against different colours has not been checked at all.
import '../src/styles/main.scss'

const preview: Preview = {
  parameters: {
    controls: { matchers: { color: /(background|color)$/i, date: /Date$/i } },
    // The same rules the functional suite runs in jsdom and Playwright runs
    // against the built page — here, per component.
    a11y: { test: 'error' },
  },

  // Both themes, because the palette is corrected per theme and a component can
  // pass in one and fail in the other.
  globalTypes: {
    theme: {
      description: 'Colour mode',
      toolbar: {
        icon: 'circlehollow',
        items: [
          { value: 'light', title: 'Light' },
          { value: 'dark', title: 'Dark' },
        ],
        dynamicTitle: true,
      },
    },
  },
  initialGlobals: { theme: 'light' },

  decorators: [
    (Story, context) => {
      document.documentElement.setAttribute('data-bs-theme', String(context.globals['theme']))
      return Story()
    },
  ],
}

export default preview
