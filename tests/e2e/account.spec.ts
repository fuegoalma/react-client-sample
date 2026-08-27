import { expect, test } from '@playwright/test'

import { newAccount, register, signIn } from './support'

/**
 * Password recovery, self-service password change, and email verification,
 * against the real API.
 *
 * **What is deliberately not covered here.** The API mails a bare token, and in
 * this deployment the mailer writes to the server's log rather than sending
 * anything (`LogMailer`). A browser has no way to reach that, so the happy path
 * of a reset or a confirmation cannot be driven end to end — it is covered
 * against the mock in `tests/functional/`. What is left, and is real, is every
 * step either side of the token: that the request is accepted, that a bad token
 * is refused with the API's own wording, and — for the password change, where
 * the client holds the current password already — the whole thing.
 */

test.describe('Changing your own password', () => {
  test('ends the session and takes effect immediately', async ({ page }) => {
    const account = newAccount('password')
    await register(page, account)

    await page.goto('/profile')
    await page.getByLabel('Current password').fill(account.password)
    await page.getByLabel('New password', { exact: true }).fill('changed-secret')
    await page.getByLabel('Confirm new password').fill('changed-secret')
    await page.getByRole('button', { name: 'Change password' }).click()

    // The API withdraws every token of the account, this one included, so the
    // client has to end the session rather than carry on with a dead token.
    await expect(page.getByRole('heading', { name: 'Sign in' })).toBeVisible()
    await expect(page.getByText('Password changed. Please sign in again.')).toBeVisible()

    await signIn(page, { ...account, password: 'changed-secret' })
  })

  test('refuses a wrong current password and changes nothing', async ({ page }) => {
    const account = newAccount('password-wrong')
    await register(page, account)

    await page.goto('/profile')
    await page.getByLabel('Current password').fill('not-my-password')
    await page.getByLabel('New password', { exact: true }).fill('changed-secret')
    await page.getByLabel('Confirm new password').fill('changed-secret')
    await page.getByRole('button', { name: 'Change password' }).click()

    await expect(page.getByText('The current password is incorrect.')).toBeVisible()

    // Still signed in, and the original password still works.
    await page.goto('/albums')
    await expect(page.getByRole('heading', { name: 'My albums' })).toBeVisible()
  })
})

test.describe('Asking for a reset token', () => {
  test('answers the same way whether or not the address has an account', async ({ page }) => {
    const account = newAccount('reset')
    await register(page, account)

    for (const email of [account.email, 'nobody-at-all@example.com']) {
      await page.goto('/forgot-password')
      await page.getByLabel('Email').fill(email)
      await page.getByRole('button', { name: 'Email me a token' }).click()

      await expect(page.getByText(/a token is on its way/i)).toBeVisible()
    }
  })

  test('refuses a reset token the API has never issued', async ({ page }) => {
    await page.goto('/reset-password')
    await page.getByLabel('Token').fill('not-a-real-token')
    await page.getByLabel('New password', { exact: true }).fill('changed-secret')
    await page.getByLabel('Confirm new password').fill('changed-secret')
    await page.getByRole('button', { name: 'Set new password' }).click()

    await expect(page.getByRole('alert')).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Choose a new password' })).toBeVisible()
  })
})

test.describe('Email verification', () => {
  test('a fresh account is unconfirmed, and can ask for another token', async ({ page }) => {
    const account = newAccount('verify')
    await register(page, account)

    await page.goto('/profile')
    await expect(page.getByText('Not confirmed')).toBeVisible()

    await page.getByRole('button', { name: 'Resend confirmation' }).click()
    await expect(page.getByText(/a new token is on its way/i)).toBeVisible()
  })

  test('an unconfirmed account is not restricted in any way', async ({ page }) => {
    // The API records verification and gates nothing on it. If that ever
    // changes, this is the test that says so.
    const account = newAccount('verify-usable')
    await register(page, account)

    await page.getByRole('button', { name: /new album/i }).click()
    const dialog = page.getByRole('dialog')
    await dialog.getByLabel('Title').fill('Made while unconfirmed')
    await dialog.getByRole('button', { name: 'Create album' }).click()

    await expect(page.getByRole('link', { name: 'Made while unconfirmed' })).toBeVisible()
  })

  test('refuses a confirmation token the API has never issued', async ({ page }) => {
    await page.goto('/verify-email')
    await page.getByLabel('Token').fill('not-a-real-token')
    await page.getByRole('button', { name: 'Confirm my email' }).click()

    await expect(page.getByRole('alert')).toBeVisible()
  })
})
