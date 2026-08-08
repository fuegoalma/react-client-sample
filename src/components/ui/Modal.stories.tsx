import type { Meta, StoryObj } from '@storybook/react-vite'

import { ConfirmDialog } from './ConfirmDialog'
import { Modal } from './Modal'

/**
 * Bootstrap's modal markup without Bootstrap's JavaScript, so Escape, the focus
 * trap, focus restoration and the scroll lock are ours — and are implemented
 * once, here, rather than in each of the shells built on top.
 */
const meta = {
  title: 'UI/Modal',
  component: Modal,
  parameters: { layout: 'fullscreen' },
} satisfies Meta<typeof Modal>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: {
    title: 'New album',
    onClose: () => undefined,
    children: (
      <div className="modal-content">
        <div className="modal-header">
          <h2 className="modal-title h5">New album</h2>
        </div>
        <div className="modal-body">
          <p className="mb-0">Tab cycles inside the dialog; Escape closes it.</p>
        </div>
      </div>
    ),
  },
}

export const Confirmation: StoryObj<typeof ConfirmDialog> = {
  render: (args) => <ConfirmDialog {...args} />,
  args: {
    open: true,
    title: 'Delete photo',
    confirmLabel: 'Delete',
    onConfirm: () => undefined,
    onCancel: () => undefined,
    children: <p className="mb-0">This cannot be undone.</p>,
  },
}

/** Both ways out are locked while the request is in flight. */
export const ConfirmationInFlight: StoryObj<typeof ConfirmDialog> = {
  ...Confirmation,
  args: { ...Confirmation.args, isBusy: true },
}
