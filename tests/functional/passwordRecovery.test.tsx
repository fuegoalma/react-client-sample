import { screen, waitFor } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { ForgotPasswordPage } from '@/pages/auth/ForgotPasswordPage'
import { ResetPasswordPage } from '@/pages/auth/ResetPasswordPage'

import { db, issueOneTimeToken } from '../mocks/db'
import { renderWithProviders } from '../utils/renderWithProviders'

const anonymous = { authenticated: false } as const

describe('Asking for a reset token', () => {
  it('issues a token for an address that has an account', async () => {
    const { user } = renderWithProviders(<ForgotPasswordPage />, anonymous)

    await user.type(screen.getByLabelText('Email'), 'ada@example.com')
    await user.click(screen.getByRole('button', { name: 'Email me a token' }))

    expect(await screen.findByRole('status')).toHaveTextContent(/a token is on its way/i)
    await waitFor(() => {
      expect(db.oneTimeTokens).toHaveLength(1)
    })
    expect(db.oneTimeTokens[0]?.purpose).toBe('password_reset')
  })

  it('says exactly the same thing for an address that has none', async () => {
    // The API answers 204 either way on purpose. A screen that confirmed only
    // for real accounts would hand back the account-enumeration oracle the API
    // takes trouble to avoid being.
    const { user } = renderWithProviders(<ForgotPasswordPage />, anonymous)

    await user.type(screen.getByLabelText('Email'), 'nobody@example.com')
    await user.click(screen.getByRole('button', { name: 'Email me a token' }))

    expect(await screen.findByRole('status')).toHaveTextContent(/a token is on its way/i)
    expect(db.oneTimeTokens).toHaveLength(0)
  })

  it('rejects a malformed address before asking the API', async () => {
    const { user } = renderWithProviders(<ForgotPasswordPage />, anonymous)

    await user.type(screen.getByLabelText('Email'), 'not-an-address')
    await user.click(screen.getByRole('button', { name: 'Email me a token' }))

    expect(await screen.findByText('Enter a valid email address.')).toBeInTheDocument()
    expect(db.oneTimeTokens).toHaveLength(0)
  })

  it('asking again retires the token issued before it', async () => {
    // Only the newest token works, so a user who clicks twice is not left
    // holding two and wondering which to paste.
    const { user } = renderWithProviders(<ForgotPasswordPage />, anonymous)

    issueOneTimeToken(1, 'password_reset')
    const first = db.oneTimeTokens[0]?.token

    await user.type(screen.getByLabelText('Email'), 'ada@example.com')
    await user.click(screen.getByRole('button', { name: 'Email me a token' }))

    await waitFor(() => {
      expect(db.oneTimeTokens).toHaveLength(1)
    })
    expect(db.oneTimeTokens[0]?.token).not.toBe(first)
  })
})

describe('Spending a reset token', () => {
  it('sets the new password and sends the user to sign in', async () => {
    const token = issueOneTimeToken(1, 'password_reset')
    const { user } = renderWithProviders(<ResetPasswordPage />, anonymous)

    await user.type(screen.getByLabelText('Token'), token)
    await user.type(screen.getByLabelText('New password'), 'brand-new-1')
    await user.type(screen.getByLabelText('Confirm new password'), 'brand-new-1')
    await user.click(screen.getByRole('button', { name: 'Set new password' }))

    await waitFor(() => {
      expect(db.users.find((candidate) => candidate.id === 1)?.password).toBe('brand-new-1')
    })
    expect(
      await screen.findByText('Password changed. Sign in with your new password.'),
    ).toBeInTheDocument()
  })

  it('ends every session of the account, as the API does', async () => {
    const token = issueOneTimeToken(1, 'password_reset')
    const { user } = renderWithProviders(<ResetPasswordPage />, anonymous)

    await user.type(screen.getByLabelText('Token'), token)
    await user.type(screen.getByLabelText('New password'), 'brand-new-1')
    await user.type(screen.getByLabelText('Confirm new password'), 'brand-new-1')
    await user.click(screen.getByRole('button', { name: 'Set new password' }))

    await waitFor(() => {
      expect(db.sessions.some((session) => session.userId === 1)).toBe(false)
    })
  })

  it('refuses a token that has already been spent', async () => {
    const token = issueOneTimeToken(1, 'password_reset')
    const spent = db.oneTimeTokens[0]
    if (spent !== undefined) spent.used = true

    const { user } = renderWithProviders(<ResetPasswordPage />, anonymous)

    await user.type(screen.getByLabelText('Token'), token)
    await user.type(screen.getByLabelText('New password'), 'brand-new-1')
    await user.type(screen.getByLabelText('Confirm new password'), 'brand-new-1')
    await user.click(screen.getByRole('button', { name: 'Set new password' }))

    expect(await screen.findByRole('alert')).toBeInTheDocument()
    expect(db.users.find((candidate) => candidate.id === 1)?.password).toBe('secret123')
  })

  it('will not confirm an address with a reset token', async () => {
    // The API scopes a token by purpose. Presenting the wrong one is refused
    // rather than quietly accepted for the wrong thing.
    const token = issueOneTimeToken(1, 'email_verification')
    const { user } = renderWithProviders(<ResetPasswordPage />, anonymous)

    await user.type(screen.getByLabelText('Token'), token)
    await user.type(screen.getByLabelText('New password'), 'brand-new-1')
    await user.type(screen.getByLabelText('Confirm new password'), 'brand-new-1')
    await user.click(screen.getByRole('button', { name: 'Set new password' }))

    expect(await screen.findByRole('alert')).toBeInTheDocument()
    expect(db.users.find((candidate) => candidate.id === 1)?.password).toBe('secret123')
  })

  it('prefills a token from the query string but leaves it editable', () => {
    // A link is a convenience; the mail carries a bare token, so the field is
    // the way in and must never be hidden.
    renderWithProviders(<ResetPasswordPage />, { ...anonymous, route: '/reset-password?token=abc' })

    expect(screen.getByLabelText('Token')).toHaveValue('abc')
    expect(screen.getByLabelText('Token')).not.toBeDisabled()
  })

  it('refuses a mistyped confirmation without contacting the API', async () => {
    const token = issueOneTimeToken(1, 'password_reset')
    const { user } = renderWithProviders(<ResetPasswordPage />, anonymous)

    await user.type(screen.getByLabelText('Token'), token)
    await user.type(screen.getByLabelText('New password'), 'brand-new-1')
    await user.type(screen.getByLabelText('Confirm new password'), 'brand-new-2')
    await user.click(screen.getByRole('button', { name: 'Set new password' }))

    expect(await screen.findByText('The two passwords do not match.')).toBeInTheDocument()
    expect(db.oneTimeTokens[0]?.used).toBe(false)
  })
})
