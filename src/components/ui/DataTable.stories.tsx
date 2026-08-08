import type { Meta, StoryObj } from '@storybook/react-vite'

import { DataTable } from './DataTable'

interface Row {
  readonly id: number
  readonly title: string
  readonly owner: string
}

const rows: readonly Row[] = [
  { id: 10, title: 'Vacation 2025', owner: 'Ada Lovelace' },
  { id: 11, title: 'Conference talks', owner: 'Grace Hopper' },
]

/**
 * The one table every list screen renders. Columns describe themselves,
 * including which API attribute they sort by, so a new screen never
 * re-implements sorting or markup.
 */
const meta = {
  title: 'UI/DataTable',
  component: DataTable<Row>,
  args: {
    rows,
    rowKey: (row: Row) => row.id,
    caption: 'Albums',
    columns: [
      { key: 'title', header: 'Title', sortAttribute: 'title', render: (row: Row) => row.title },
      { key: 'owner', header: 'Owner', render: (row: Row) => row.owner },
    ],
  },
} satisfies Meta<typeof DataTable<Row>>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}

/** A sortable header is a button, so it is reachable by keyboard. */
export const Sorted: Story = {
  args: {
    sort: [{ attribute: 'title', direction: 'desc' }],
    onToggleSort: () => undefined,
  },
}

export const Empty: Story = { args: { rows: [] } }
