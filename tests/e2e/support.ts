import { expect, type Page } from '@playwright/test'

/**
 * Helpers for the end-to-end suite. Every run registers its own account, so
 * tests never depend on data left behind by an earlier run — and never need the
 * API's database to be reset between them.
 */

export interface Account {
  readonly firstName: string
  readonly lastName: string
  readonly email: string
  readonly password: string
}

export function newAccount(label: string): Account {
  const unique = `${String(Date.now())}-${Math.random().toString(36).slice(2, 8)}`
  return {
    firstName: 'E2E',
    lastName: label,
    email: `e2e-${label}-${unique}@example.com`.toLowerCase(),
    password: 'secret123',
  }
}

export async function register(page: Page, account: Account): Promise<void> {
  await page.goto('/register')
  await page.getByLabel('First name').fill(account.firstName)
  await page.getByLabel('Last name').fill(account.lastName)
  await page.getByLabel('Email').fill(account.email)
  await page.getByLabel('Password', { exact: true }).fill(account.password)
  await page.getByLabel('Confirm password').fill(account.password)
  await page.getByRole('button', { name: 'Create account' }).click()

  await expect(page.getByRole('heading', { name: 'My albums' })).toBeVisible()
}

export async function signIn(page: Page, account: Account): Promise<void> {
  await page.goto('/login')
  await page.getByLabel('Email').fill(account.email)
  await page.getByLabel('Password').fill(account.password)
  await page.getByRole('button', { name: 'Sign in' }).click()

  await expect(page.getByRole('heading', { name: 'My albums' })).toBeVisible()
}

export async function createAlbum(page: Page, title: string): Promise<void> {
  await page.getByRole('button', { name: /new album/i }).click()

  // Scoped to the dialog: the list screen behind it has a "title" filter too.
  const dialog = page.getByRole('dialog')
  await dialog.getByLabel('Title').fill(title)
  await dialog.getByRole('button', { name: 'Create album' }).click()

  await expect(page.getByRole('link', { name: title })).toBeVisible()
}

/** A real PNG, so the API's Imagick conversion has something to work with. */
export const PNG_PIXEL = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64',
)
