import { screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { QueryBoundary, Skeleton } from '@/components'

import { expectNoViolations } from '../../utils/a11y'
import { renderWithProviders } from '../../utils/renderWithProviders'

describe('Skeleton', () => {
  it('announces the wait rather than leaving shapes a screen reader cannot read', async () => {
    const { container } = renderWithProviders(<Skeleton label="Loading users…" />)

    expect(screen.getByRole('status')).toHaveTextContent('Loading users…')
    await expectNoViolations(container)
  })

  it('stands in for as many rows as the caller expects', () => {
    const { container } = renderWithProviders(<Skeleton rows={3} label="Loading…" />)

    expect(container.querySelectorAll('.skeleton__row')).toHaveLength(3)
  })
})

describe('QueryBoundary while it waits', () => {
  it('shows a spinner by default', () => {
    renderWithProviders(
      <QueryBoundary isLoading>
        <p>Loaded</p>
      </QueryBoundary>,
    )

    expect(screen.getByRole('status')).toBeInTheDocument()
    expect(document.querySelector('.spinner-border')).toBeInTheDocument()
  })

  it('keeps the page’s shape when the caller is about to render rows', () => {
    renderWithProviders(
      <QueryBoundary isLoading pending="skeleton">
        <p>Loaded</p>
      </QueryBoundary>,
    )

    expect(document.querySelector('.skeleton')).toBeInTheDocument()
    expect(document.querySelector('.spinner-border')).not.toBeInTheDocument()
  })
})
