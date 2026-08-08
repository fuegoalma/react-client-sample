import type { Meta, StoryObj } from '@storybook/react-vite'

import type { ListQueryState } from '@/hooks'

import { ListScreen } from './ListScreen'

interface Row {
  readonly id: number
  readonly first_name: string
  readonly last_name: string
  readonly email: string
}

const rows: readonly Row[] = [
  { id: 1, first_name: 'Ada', last_name: 'Lovelace', email: 'ada@example.com' },
  { id: 2, first_name: 'Grace', last_name: 'Hopper', email: 'grace@example.com' },
  { id: 3, first_name: 'Alan', last_name: 'Turing', email: 'alan@example.com' },
]

/**
 * `ListQueryState` normally comes from `useListQuery`, which keeps page, sort
 * and filters in the URL. Here it is a literal: the interface is plain data, so
 * the stories need no router — and standing one up would only prove that the
 * router works.
 */
const list: ListQueryState = {
  query: { page: 1, perPage: 20, sort: [], filters: {} },
  page: 1,
  sort: [{ attribute: 'email', direction: 'asc' }],
  filters: { first_name: '', email: '' },
  filterDefinitions: [
    { key: 'first_name', label: 'First name', placeholder: 'Partial match' },
    { key: 'email', label: 'Email', placeholder: 'Partial match' },
  ],
  setPage: () => undefined,
  toggleSort: () => undefined,
  applyFilters: () => undefined,
  reset: () => undefined,
  isFiltered: false,
}

const pagination = { total: 3, per_page: 20, current_page: 1, last_page: 1, from: 1, to: 3 }

/**
 * A whole list screen minus its columns: filter bar, the loading / failed /
 * empty triad, table and pagination, wired together once so a new screen
 * declares *what* it lists rather than *how* a list behaves.
 */
const meta = {
  title: 'UI/ListScreen',
  component: ListScreen<Row>,
  parameters: { layout: 'fullscreen' },
  args: {
    list,
    rowKey: (row: Row) => row.id,
    caption: 'Users',
    emptyMessage: 'No users found.',
    columns: [
      {
        key: 'name',
        header: 'Name',
        sortAttribute: 'last_name',
        render: (row: Row) => `${row.first_name} ${row.last_name}`,
      },
      { key: 'email', header: 'Email', sortAttribute: 'email', render: (row: Row) => row.email },
    ],
    result: { data: { items: rows, pagination }, isLoading: false, isFetching: false },
  },
} satisfies Meta<typeof ListScreen<Row>>

export default meta
type Story = StoryObj<typeof meta>

export const Loaded: Story = {}

/** The wait keeps the page's shape rather than collapsing to a spinner. */
export const Loading: Story = {
  args: { result: { isLoading: true, isFetching: true } },
}

export const Failed: Story = {
  args: {
    result: {
      error: { code: 403, message: 'You are not allowed to perform this action.', fieldErrors: {} },
      isLoading: false,
      isFetching: false,
    },
  },
}

/** "Nothing here yet" and "nothing matches" are different messages. */
export const Empty: Story = {
  args: {
    result: {
      data: { items: [], pagination: { ...pagination, total: 0, to: null, from: null } },
      isLoading: false,
      isFetching: false,
    },
  },
}

export const EmptyBecauseFiltered: Story = {
  args: {
    ...Empty.args,
    list: { ...list, filters: { first_name: 'Zzz', email: '' }, isFiltered: true },
  },
}
