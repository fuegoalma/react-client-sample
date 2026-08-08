import { screen } from '@testing-library/react'
import { describe, it } from 'vitest'

import { AlbumDetailPage } from '@/pages/albums/AlbumDetailPage'
import { LoginPage } from '@/pages/auth/LoginPage'
import { UsersPage } from '@/pages/users/UsersPage'

import { grantRole } from '../mocks/db'
import { expectNoViolations } from '../utils/a11y'
import { renderWithProviders } from '../utils/renderWithProviders'

/**
 * One pass per layout archetype rather than per screen.
 *
 * Every list is `ListScreen`, every editing dialog is `FormModal`, every form
 * is `FormField` + `FormAlert`, and every nested page is `PageHeader` over a
 * detail body — so a violation in any of them is a violation in the shared
 * component, and checking the twelfth list screen would only re-prove the first.
 */
describe('Accessibility', () => {
  it('holds for a list screen', async () => {
    grantRole('admin')
    const { container } = renderWithProviders(<UsersPage />)

    await screen.findByRole('table')

    await expectNoViolations(container)
  })

  it('holds for a detail screen and its photo grid', async () => {
    const { container } = renderWithProviders(<AlbumDetailPage />, {
      route: '/albums/10',
      path: '/albums/:albumId',
    })

    await screen.findByRole('heading', { name: 'Vacation 2025' })

    await expectNoViolations(container)
  })

  it('holds for a form', async () => {
    const { container } = renderWithProviders(<LoginPage />, { authenticated: false })

    await screen.findByRole('button', { name: 'Sign in' })

    await expectNoViolations(container)
  })

  it('holds for a dialog, which is the case the markup is easiest to get wrong', async () => {
    const { container, user } = renderWithProviders(<AlbumDetailPage />, {
      route: '/albums/10',
      path: '/albums/:albumId',
    })

    await user.click(await screen.findByRole('button', { name: 'Rename' }))
    await screen.findByRole('dialog')

    await expectNoViolations(container)
  })
})
