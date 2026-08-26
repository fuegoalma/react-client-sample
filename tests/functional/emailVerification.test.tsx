import { screen, waitFor } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { ProfilePage } from '@/pages/ProfilePage'
import { VerifyEmailPage } from '@/pages/auth/VerifyEmailPage'

import { CURRENT_USER_ID, db, issueOneTimeToken } from '../mocks/db'
import { renderWithProviders } from '../utils/renderWithProviders'

const anonymous = { authenticated: false } as const

function unverifyCaller(): void {
  const caller = db.users.find((candidate) => candidate.id === CURRENT_USER_ID)
  if (caller !== undefined) caller.email_verified = false
}

describe('Confirming an address', () => {
  it('confirms it with the mailed token', async () => {
    unverifyCaller()
    const token = issueOneTimeToken(CURRENT_USER_ID, 'email_verification')
    const { user } = renderWithProviders(<VerifyEmailPage />, anonymous)

    await user.type(screen.getByLabelText('Token'), token)
    await user.click(screen.getByRole('button', { name: 'Confirm my email' }))

    expect(await screen.findByRole('status')).toHaveTextContent('Your email address is confirmed.')
    expect(db.users.find((candidate) => candidate.id === CURRENT_USER_ID)?.email_verified).toBe(
      true,
    )
  })

  it('needs no session, so the link opens in any browser', async () => {
    // The token is the proof. Requiring a session as well would break reading
    // the message somewhere other than where the account was registered.
    unverifyCaller()
    const token = issueOneTimeToken(CURRENT_USER_ID, 'email_verification')
    const { user } = renderWithProviders(<VerifyEmailPage />, anonymous)

    await user.type(screen.getByLabelText('Token'), token)
    await user.click(screen.getByRole('button', { name: 'Confirm my email' }))

    await waitFor(() => {
      expect(db.users.find((candidate) => candidate.id === CURRENT_USER_ID)?.email_verified).toBe(
        true,
      )
    })
  })

  it('refuses an unknown token', async () => {
    unverifyCaller()
    const { user } = renderWithProviders(<VerifyEmailPage />, anonymous)

    await user.type(screen.getByLabelText('Token'), 'not-a-real-token')
    await user.click(screen.getByRole('button', { name: 'Confirm my email' }))

    expect(await screen.findByRole('alert')).toBeInTheDocument()
    expect(db.users.find((candidate) => candidate.id === CURRENT_USER_ID)?.email_verified).toBe(
      false,
    )
  })

  it('prefills a token from the query string', () => {
    renderWithProviders(<VerifyEmailPage />, { ...anonymous, route: '/verify-email?token=abc' })

    expect(screen.getByLabelText('Token')).toHaveValue('abc')
  })

  it('asks for the token before sending anything', async () => {
    const { user } = renderWithProviders(<VerifyEmailPage />, anonymous)

    await user.click(screen.getByRole('button', { name: 'Confirm my email' }))

    expect(await screen.findByText('Paste the token from the email.')).toBeInTheDocument()
  })
})

describe('The verification state on the profile', () => {
  it('says the address is confirmed, and offers nothing to do', async () => {
    renderWithProviders(<ProfilePage />)

    expect(await screen.findByText('Confirmed')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Resend confirmation' })).not.toBeInTheDocument()
  })

  it('offers to send another token while it is unconfirmed', async () => {
    unverifyCaller()
    const { user } = renderWithProviders(<ProfilePage />)

    expect(await screen.findByText('Not confirmed')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Resend confirmation' }))

    await waitFor(() => {
      expect(db.oneTimeTokens).toHaveLength(1)
    })
    expect(db.oneTimeTokens[0]?.purpose).toBe('email_verification')
  })

  it('does not claim a message was sent, because the API never says so', async () => {
    // 204 whether or not anything went out. Promising delivery would be the
    // one thing the response cannot support.
    unverifyCaller()
    const { user } = renderWithProviders(<ProfilePage />)

    await user.click(await screen.findByRole('button', { name: 'Resend confirmation' }))

    expect(
      await screen.findByText('If your address is unconfirmed, a new token is on its way.'),
    ).toBeInTheDocument()
  })

  it('says plainly that an unconfirmed account still works', async () => {
    // The API records verification and gates nothing on it, so the screen must
    // not imply the user is locked out of anything.
    unverifyCaller()
    renderWithProviders(<ProfilePage />)

    expect(await screen.findByText(/Your account works either way/)).toBeInTheDocument()
  })
})
