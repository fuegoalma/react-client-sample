import type { Meta, StoryObj } from '@storybook/react-vite'

import { ALBUM_DELETION_FILTER } from '@/forms'

import { FilterBar } from './FilterBar'

/**
 * Applies on submit rather than per keystroke: the API paginates and filters
 * server-side, so reacting to every character would be a request per character.
 *
 * A screen never builds one of these by hand — the definitions come from the
 * resource's `ListSpec`, which is asserted against the OpenAPI document in
 * `tests/contract/listSpecs.test.ts`.
 */
const meta = {
  title: 'UI/FilterBar',
  component: FilterBar,
  args: {
    filters: [
      { key: 'first_name', label: 'First name', placeholder: 'Partial match' },
      { key: 'email', label: 'Email', placeholder: 'Partial match' },
    ],
    values: { first_name: '', email: '' },
    isFiltered: false,
    onApply: () => undefined,
    onReset: () => undefined,
  },
} satisfies Meta<typeof FilterBar>

export default meta
type Story = StoryObj<typeof meta>

export const Empty: Story = {}

/** Once something is filtered there has to be a way back to the full list. */
export const Filtered: Story = {
  args: { values: { first_name: 'Ada', email: '' }, isFiltered: true },
}

/**
 * The all-albums screen composes this one in for a caller who can act on a
 * flagged album — a `select` carries its own options, which is why
 * `FilterDefinition` is a union rather than one optional field.
 */
export const WithASelect: Story = {
  args: {
    filters: [{ key: 'title', label: 'Album title' }, ALBUM_DELETION_FILTER],
    values: { title: '', is_deleted: '1' },
    isFiltered: true,
  },
}
