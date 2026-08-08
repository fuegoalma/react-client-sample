import type { Meta, StoryObj } from '@storybook/react-vite'

import { Skeleton } from './Skeleton'

/** The shape of content on its way, instead of a spinner on an empty page. */
const meta = {
  title: 'UI/Skeleton',
  component: Skeleton,
  args: { label: 'Loading albums…' },
} satisfies Meta<typeof Skeleton>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}

export const ShortList: Story = { args: { rows: 2 } }
