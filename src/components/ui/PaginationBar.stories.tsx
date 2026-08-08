import type { Meta, StoryObj } from '@storybook/react-vite'

import { PaginationBar } from './PaginationBar'

/** Server-side pagination, so the bar reports what the API said, not what it holds. */
const meta = {
  title: 'UI/PaginationBar',
  component: PaginationBar,
  args: {
    onPageChange: () => undefined,
    pagination: { total: 96, per_page: 20, current_page: 3, last_page: 5, from: 41, to: 60 },
  },
} satisfies Meta<typeof PaginationBar>

export default meta
type Story = StoryObj<typeof meta>

export const MidRange: Story = {}

/** The boundary controls are disabled rather than hidden at the ends. */
export const FirstPage: Story = {
  args: {
    pagination: { total: 96, per_page: 20, current_page: 1, last_page: 5, from: 1, to: 20 },
  },
}

export const ManyPages: Story = {
  args: {
    pagination: { total: 900, per_page: 20, current_page: 12, last_page: 45, from: 221, to: 240 },
  },
}
