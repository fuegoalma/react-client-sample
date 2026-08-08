import { screen, within } from '@testing-library/react'
import { useState } from 'react'
import { describe, expect, it, vi } from 'vitest'

import { Breadcrumbs, ConfirmDialog, Modal } from '@/components'

import { renderWithProviders } from '../../utils/renderWithProviders'

/**
 * How every dialog in the application is actually used: mounted only while
 * open, opened by a button that sits *outside* it. Dismissal and focus can only
 * be proven against that arrangement — a `Modal` rendered on its own starts
 * with the focus already nowhere else to come back from.
 */
function ModalHarness() {
  const [open, setOpen] = useState(false)

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setOpen(true)
        }}
      >
        Open
      </button>

      {open && (
        <Modal
          title="New album"
          onClose={() => {
            setOpen(false)
          }}
        >
          <button type="button">First</button>
          <button type="button">Last</button>
        </Modal>
      )}
    </>
  )
}

/**
 * Bootstrap's JavaScript is deliberately unused, so dismissal is ours to
 * implement — and therefore ours to prove.
 */
describe('Modal', () => {
  it('closes on Escape without having to be clicked first', async () => {
    const onClose = vi.fn()
    const { user } = renderWithProviders(
      <Modal title="New album" onClose={onClose}>
        <p>Body</p>
      </Modal>,
    )

    await user.keyboard('{Escape}')

    expect(onClose).toHaveBeenCalledOnce()
  })

  it('ignores every other key, so typing in a field never closes it', async () => {
    const onClose = vi.fn()
    const { user } = renderWithProviders(
      <Modal title="New album" onClose={onClose}>
        <p>Body</p>
      </Modal>,
    )

    await user.keyboard('a{Enter}{Tab}')

    expect(onClose).not.toHaveBeenCalled()
  })

  it('is named by the heading it already renders', () => {
    renderWithProviders(
      <Modal title="New album" onClose={vi.fn()}>
        <h2 className="modal-title">New album</h2>
      </Modal>,
    )

    expect(screen.getByRole('dialog', { name: 'New album' })).toBeInTheDocument()
  })

  it('takes the focus when it opens and gives it back to whatever opened it', async () => {
    const { user } = renderWithProviders(<ModalHarness />)
    const trigger = screen.getByRole('button', { name: 'Open' })

    await user.click(trigger)
    expect(screen.getByRole('dialog')).toContainElement(
      document.activeElement as HTMLElement | null,
    )

    await user.keyboard('{Escape}')
    expect(trigger).toHaveFocus()
  })

  it('keeps Tab inside the dialog, in both directions', async () => {
    const { user } = renderWithProviders(<ModalHarness />)

    await user.click(screen.getByRole('button', { name: 'Open' }))
    const dialog = screen.getByRole('dialog')
    const first = within(dialog).getByRole('button', { name: 'First' })
    const last = within(dialog).getByRole('button', { name: 'Last' })

    await user.tab()
    expect(first).toHaveFocus()

    await user.tab()
    expect(last).toHaveFocus()

    // Past the last one it wraps rather than escaping to the page behind.
    await user.tab()
    expect(first).toHaveFocus()

    await user.tab({ shift: true })
    expect(last).toHaveFocus()
  })

  it('stops the page behind it from scrolling, and lets it again once closed', async () => {
    const { user } = renderWithProviders(<ModalHarness />)

    await user.click(screen.getByRole('button', { name: 'Open' }))
    expect(document.body).toHaveClass('hasOpenModal')

    await user.keyboard('{Escape}')
    expect(document.body).not.toHaveClass('hasOpenModal')
  })
})

describe('ConfirmDialog', () => {
  it('renders nothing at all while closed', () => {
    const { container } = renderWithProviders(
      <ConfirmDialog open={false} title="Delete" onConfirm={vi.fn()} onCancel={vi.fn()}>
        <p>Sure?</p>
      </ConfirmDialog>,
    )

    expect(container).toBeEmptyDOMElement()
  })

  it('cancels on Escape but ignores other keys', async () => {
    const onCancel = vi.fn()
    const { user } = renderWithProviders(
      <ConfirmDialog open title="Delete" onConfirm={vi.fn()} onCancel={onCancel}>
        <p>Sure?</p>
      </ConfirmDialog>,
    )

    await user.keyboard('x')
    expect(onCancel).not.toHaveBeenCalled()

    await user.keyboard('{Escape}')
    expect(onCancel).toHaveBeenCalledOnce()
  })

  it('locks both ways out while the request is in flight', () => {
    renderWithProviders(
      <ConfirmDialog open title="Delete" isBusy onConfirm={vi.fn()} onCancel={vi.fn()}>
        <p>Sure?</p>
      </ConfirmDialog>,
    )

    expect(screen.getByRole('button', { name: 'Cancel' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Close' })).toBeDisabled()
  })

  it('takes the wording and the colour the caller chose', () => {
    renderWithProviders(
      <ConfirmDialog
        open
        title="Flag album"
        confirmLabel="Flag album"
        confirmVariant="warning"
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      >
        <p>Sure?</p>
      </ConfirmDialog>,
    )

    expect(screen.getByRole('button', { name: 'Flag album' })).toHaveClass('btn-warning')
  })

  it('closes from the header button too', async () => {
    const onCancel = vi.fn()
    const { user } = renderWithProviders(
      <ConfirmDialog open title="Delete" onConfirm={vi.fn()} onCancel={onCancel}>
        <p>Sure?</p>
      </ConfirmDialog>,
    )

    await user.click(screen.getByRole('button', { name: 'Close' }))

    expect(onCancel).toHaveBeenCalledOnce()
  })
})

describe('Breadcrumbs', () => {
  it('renders nothing rather than an empty bar when there is no trail', () => {
    const { container } = renderWithProviders(<Breadcrumbs items={[]} />)

    expect(container).toBeEmptyDOMElement()
  })

  it('links the ancestors and leaves the current page as plain text', () => {
    renderWithProviders(
      <Breadcrumbs items={[{ label: 'My albums', to: '/albums' }, { label: 'Vacation 2025' }]} />,
    )

    expect(screen.getByRole('link', { name: 'My albums' })).toHaveAttribute('href', '/albums')
    expect(screen.queryByRole('link', { name: 'Vacation 2025' })).not.toBeInTheDocument()
  })

  it('leaves an ancestor unlinked when the caller may not open it', () => {
    // A crumb that answers 403 is worse than no crumb at all.
    renderWithProviders(
      <Breadcrumbs items={[{ label: 'Albums' }, { label: 'Conference talks' }]} />,
    )

    expect(screen.queryByRole('link')).not.toBeInTheDocument()
    expect(screen.getByText('Albums')).toBeInTheDocument()
  })
})
