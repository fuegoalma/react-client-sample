import { screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { PaginationBar } from '@/components'
import type { Pagination } from '@/types'

import { renderWithProviders } from '../../utils/renderWithProviders'

function pagination(overrides: Partial<Pagination> = {}): Pagination {
  return {
    total: 40,
    per_page: 20,
    current_page: 1,
    last_page: 2,
    from: 1,
    to: 20,
    ...overrides,
  }
}

/** The page numbers actually offered, in order, ignoring Previous/Next. */
function offeredPages(): string[] {
  return screen
    .getAllByRole('listitem')
    .map((item) => item.textContent)
    .filter((label) => label !== 'Previous' && label !== 'Next')
}

describe('PaginationBar', () => {
  it('reports the slice on show', () => {
    renderWithProviders(<PaginationBar pagination={pagination()} onPageChange={vi.fn()} />)

    expect(screen.getByText('Showing 1–20 of 40')).toBeInTheDocument()
  })

  it('says so plainly when there is nothing to page through', () => {
    renderWithProviders(
      <PaginationBar
        pagination={pagination({ total: 0, last_page: 1, from: 0, to: 0 })}
        onPageChange={vi.fn()}
      />,
    )

    expect(screen.getByText('No results')).toBeInTheDocument()
    // A single page needs no controls at all.
    expect(screen.queryByRole('navigation', { name: 'Pagination' })).not.toBeInTheDocument()
  })

  it('lists every page while they still fit', () => {
    renderWithProviders(
      <PaginationBar
        pagination={pagination({ total: 140, last_page: 7, current_page: 4 })}
        onPageChange={vi.fn()}
      />,
    )

    expect(offeredPages()).toEqual(['1', '2', '3', '4', '5', '6', '7'])
  })

  it('collapses a long range around the current page', () => {
    renderWithProviders(
      <PaginationBar
        pagination={pagination({ total: 400, last_page: 20, current_page: 10 })}
        onPageChange={vi.fn()}
      />,
    )

    // First, last and the current page's neighbours; everything else is a gap.
    expect(offeredPages()).toEqual(['1', '…', '9', '10', '11', '…', '20'])
  })

  it('needs no leading gap while the current page is still near the start', () => {
    renderWithProviders(
      <PaginationBar
        pagination={pagination({ total: 400, last_page: 20, current_page: 2 })}
        onPageChange={vi.fn()}
      />,
    )

    expect(offeredPages()).toEqual(['1', '2', '3', '…', '20'])
  })

  it('disables Previous on the first page and Next on the last', () => {
    const { unmount } = renderWithProviders(
      <PaginationBar
        pagination={pagination({ total: 400, last_page: 20, current_page: 1 })}
        onPageChange={vi.fn()}
      />,
    )

    expect(screen.getByRole('button', { name: 'Previous' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Next' })).toBeEnabled()
    unmount()

    renderWithProviders(
      <PaginationBar
        pagination={pagination({ total: 400, last_page: 20, current_page: 20 })}
        onPageChange={vi.fn()}
      />,
    )

    expect(screen.getByRole('button', { name: 'Previous' })).toBeEnabled()
    expect(screen.getByRole('button', { name: 'Next' })).toBeDisabled()
  })

  it('marks the current page for assistive technology', () => {
    renderWithProviders(
      <PaginationBar
        pagination={pagination({ total: 400, last_page: 20, current_page: 10 })}
        onPageChange={vi.fn()}
      />,
    )

    expect(screen.getByRole('button', { name: '10' })).toHaveAttribute('aria-current', 'page')
    expect(screen.getByRole('button', { name: '9' })).not.toHaveAttribute('aria-current')
  })

  it('reports the page the reader asked for', async () => {
    const onPageChange = vi.fn()
    const { user } = renderWithProviders(
      <PaginationBar
        pagination={pagination({ total: 400, last_page: 20, current_page: 10 })}
        onPageChange={onPageChange}
      />,
    )

    await user.click(screen.getByRole('button', { name: '11' }))
    await user.click(screen.getByRole('button', { name: 'Previous' }))
    await user.click(screen.getByRole('button', { name: 'Next' }))

    expect(onPageChange.mock.calls).toEqual([[11], [9], [11]])
  })
})
