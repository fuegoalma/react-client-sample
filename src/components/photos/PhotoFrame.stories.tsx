import type { Meta, StoryObj } from '@storybook/react-vite'

import { PhotoFrame } from './PhotoFrame'

/**
 * The image, or the placeholder standing in for one.
 *
 * The API converts every upload to a WebP scaled to fit 500×500, so there is
 * only ever one file to show — but `url` is nullable, and the tile and the
 * detail screen have to answer that the same way. That is the whole reason this
 * component exists, and it is the pair of states below.
 */
const meta = {
  title: 'UI/PhotoFrame',
  component: PhotoFrame,
} satisfies Meta<typeof PhotoFrame>

export default meta
type Story = StoryObj<typeof meta>

export const WithAnImage: Story = {
  args: {
    photo: {
      id: 100,
      title: 'Beach sunset',
      created_at: '2026-02-28 20:11:48',
      // Inline so the story needs no server and no network.
      url:
        'data:image/svg+xml;utf8,' +
        encodeURIComponent(
          '<svg xmlns="http://www.w3.org/2000/svg" width="500" height="500">' +
            '<rect width="500" height="500" fill="hsl(28 60% 62%)"/></svg>',
        ),
    },
  },
}

/** What an album shows for a record whose file the API never stored. */
export const WithoutAnImage: Story = {
  args: {
    photo: { id: 101, title: 'Missing file', url: null, created_at: '2026-02-28 20:11:48' },
  },
}

/** Tiles below the fold defer their fetch; a detail view's image does not. */
export const Lazy: Story = { args: { ...WithAnImage.args, lazy: true } }
