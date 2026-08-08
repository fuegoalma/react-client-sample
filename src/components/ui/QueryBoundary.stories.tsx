import type { Meta, StoryObj } from '@storybook/react-vite'

import { QueryBoundary } from './QueryBoundary'

/**
 * The loading / failed / empty triad every query screen needs, in one place —
 * which is why no screen invents its own spinner or error copy.
 */
const meta = {
  title: 'UI/QueryBoundary',
  component: QueryBoundary,
  args: { isLoading: false, children: <p className="mb-0">The loaded content.</p> },
} satisfies Meta<typeof QueryBoundary>

export default meta
type Story = StoryObj<typeof meta>

export const Loaded: Story = {}

export const Waiting: Story = { args: { isLoading: true } }

/** A list is about to render rows, so the page keeps its shape while it waits. */
export const WaitingForRows: Story = { args: { isLoading: true, pending: 'skeleton' } }

/**
 * A meaningful server message reaches the user verbatim — a 409 naming the
 * invariant that refused the change is worth more than any wording of ours.
 * `fieldErrors` is what makes this an `ApiError` rather than an unknown throw.
 */
export const Failed: Story = {
  args: {
    error: {
      code: 409,
      message: 'The last role manager cannot be removed.',
      fieldErrors: {},
    },
  },
}

/** Anything that is not an `ApiError` falls back to copy the screen supplies. */
export const FailedWithoutAMessage: Story = {
  args: { error: new Error('socket hang up') },
}

export const Empty: Story = {
  args: { isEmpty: true, emptyMessage: 'No albums match this filter.' },
}
