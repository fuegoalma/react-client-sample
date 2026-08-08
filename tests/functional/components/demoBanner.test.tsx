import { screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { DemoBanner } from '@/components'

import { expectNoViolations } from '../../utils/a11y'
import { renderWithProviders } from '../../utils/renderWithProviders'

describe('DemoBanner', () => {
  it('says the data is not real and gives a way in', () => {
    renderWithProviders(<DemoBanner />)

    expect(screen.getByRole('note')).toHaveTextContent(/resets when you reload/i)
    expect(screen.getByText('ada@example.com')).toBeInTheDocument()
  })

  it('is announced rather than being colour alone', async () => {
    const { container } = renderWithProviders(<DemoBanner />)

    await expectNoViolations(container)
  })
})
