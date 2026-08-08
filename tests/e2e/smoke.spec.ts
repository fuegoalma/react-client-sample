import { expect, test } from '@playwright/test'

import { createAlbum, newAccount, PNG_PIXEL, register, signIn } from './support'

/**
 * The end-to-end pass over the real API: register, create an album, upload a
 * photo, edit it, delete both, and sign out. Anything the MSW mock gets wrong
 * about the contract shows up here.
 */
test.describe('A base user’s whole journey', () => {
  test('registers, manages an album and its photos, then signs out', async ({ page }) => {
    const account = newAccount('journey')
    await register(page, account)

    // --- albums ---------------------------------------------------------
    await createAlbum(page, 'Holiday 2026')
    await page.getByRole('link', { name: 'Holiday 2026' }).click()
    await expect(page.getByRole('heading', { name: 'Holiday 2026' })).toBeVisible()
    await expect(page.getByText(`Owned by ${account.firstName} ${account.lastName}`)).toBeVisible()

    // --- upload a photo -------------------------------------------------
    await page.getByRole('button', { name: /upload photo/i }).click()
    const uploadDialog = page.getByRole('dialog')
    await uploadDialog.getByLabel('Title').fill('First light')
    await uploadDialog.getByLabel('Image').setInputFiles({
      name: 'first-light.png',
      mimeType: 'image/png',
      buffer: PNG_PIXEL,
    })
    await uploadDialog.getByRole('button', { name: 'Upload' }).click()

    await expect(page.getByRole('heading', { name: 'First light' })).toBeVisible()

    // The API converts every upload to WebP.
    const image = page.getByRole('img', { name: 'First light' })
    await expect(image).toHaveAttribute('src', /\.webp$/)

    // Depth is legible from the trail, not guessed from the URL.
    const albumTrail = page.getByRole('navigation', { name: 'Breadcrumb' })
    await expect(albumTrail.getByRole('link', { name: 'My albums' })).toBeVisible()
    await expect(albumTrail.getByText('Holiday 2026')).toBeVisible()

    // --- edit the photo -------------------------------------------------
    await page.getByRole('link', { name: 'Edit' }).first().click()

    // Three levels deep, and the trail names every one of them.
    const photoTrail = page.getByRole('navigation', { name: 'Breadcrumb' })
    await expect(photoTrail.getByRole('link', { name: 'Holiday 2026' })).toBeVisible()
    await expect(photoTrail.getByText('First light')).toBeVisible()

    // Wait for the field to carry the loaded title before replacing it.
    await expect(page.getByLabel('Title')).toHaveValue('First light')
    await page.getByLabel('Title').fill('Sunrise')
    await page.getByRole('button', { name: 'Save title' }).click()
    await expect(page.getByRole('heading', { name: 'Sunrise' })).toBeVisible()

    // --- delete the photo -----------------------------------------------
    await page.getByRole('button', { name: 'Delete' }).click()
    await page.getByRole('dialog').getByRole('button', { name: 'Delete' }).click()
    await expect(page.getByText(/No photos yet/)).toBeVisible()

    // --- rename, then permanently delete the album ----------------------
    await page.getByRole('button', { name: 'Rename' }).click()
    const renameDialog = page.getByRole('dialog')
    await renameDialog.getByLabel('Title').fill('Holiday 2026 — final')
    await renameDialog.getByRole('button', { name: 'Save' }).click()
    await expect(page.getByRole('heading', { name: 'Holiday 2026 — final' })).toBeVisible()

    await page.getByRole('button', { name: 'Delete album' }).click()
    await expect(page.getByText(/cannot be undone/i)).toBeVisible()
    await page.getByRole('button', { name: 'Delete permanently' }).click()

    await expect(page.getByRole('heading', { name: 'My albums' })).toBeVisible()
    await expect(page.getByRole('link', { name: 'Holiday 2026 — final' })).toHaveCount(0)

    // --- sign out -------------------------------------------------------
    await page.getByRole('button', { name: new RegExp(account.firstName) }).click()
    await page.getByRole('button', { name: 'Sign out', exact: true }).click()
    await expect(page.getByRole('heading', { name: 'Sign in' })).toBeVisible()
  })
})

test.describe('Authentication', () => {
  test('rejects bad credentials and keeps the user out', async ({ page }) => {
    const account = newAccount('badcreds')
    await register(page, account)

    await page.getByRole('button', { name: new RegExp(account.firstName) }).click()
    await page.getByRole('button', { name: 'Sign out', exact: true }).click()
    await expect(page.getByRole('heading', { name: 'Sign in' })).toBeVisible()

    await page.getByLabel('Email').fill(account.email)
    await page.getByLabel('Password').fill('definitely-wrong')
    await page.getByRole('button', { name: 'Sign in' }).click()

    await expect(page.getByRole('alert')).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Sign in' })).toBeVisible()
  })

  test('refuses a duplicate email on registration', async ({ page }) => {
    const account = newAccount('dupe')
    await register(page, account)

    await page.getByRole('button', { name: new RegExp(account.firstName) }).click()
    await page.getByRole('button', { name: 'Sign out', exact: true }).click()

    await page.goto('/register')
    await page.getByLabel('First name').fill(account.firstName)
    await page.getByLabel('Last name').fill(account.lastName)
    await page.getByLabel('Email').fill(account.email)
    await page.getByLabel('Password', { exact: true }).fill(account.password)
    await page.getByLabel('Confirm password').fill(account.password)
    await page.getByRole('button', { name: 'Create account' }).click()

    await expect(page.getByText(/already been taken/i)).toBeVisible()
  })

  test('refuses a mistyped password confirmation', async ({ page }) => {
    const account = newAccount('mistyped')

    await page.goto('/register')
    await page.getByLabel('First name').fill(account.firstName)
    await page.getByLabel('Last name').fill(account.lastName)
    await page.getByLabel('Email').fill(account.email)
    await page.getByLabel('Password', { exact: true }).fill(account.password)
    await page.getByLabel('Confirm password').fill('a-different-one')
    await page.getByRole('button', { name: 'Create account' }).click()

    await expect(page.getByText('The two passwords do not match.')).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Create an account' })).toBeVisible()
  })

  test('keeps the session across a reload', async ({ page }) => {
    const account = newAccount('reload')
    await register(page, account)

    await page.reload()
    await expect(page.getByRole('heading', { name: 'My albums' })).toBeVisible()
  })

  test('sends an unauthenticated visitor to the login screen', async ({ page }) => {
    await page.goto('/albums')
    await expect(page.getByRole('heading', { name: 'Sign in' })).toBeVisible()
  })
})

test.describe('Authorization', () => {
  test('hides the privileged screens from an account with no roles', async ({ page }) => {
    const account = newAccount('baseuser')
    await register(page, account)

    await expect(page.getByRole('link', { name: 'My albums' })).toBeVisible()
    await expect(page.getByRole('link', { name: 'All albums' })).toHaveCount(0)
    await expect(page.getByRole('link', { name: 'Users' })).toHaveCount(0)
    await expect(page.getByRole('link', { name: 'Roles' })).toHaveCount(0)
  })

  test('reports the base abilities on the profile screen', async ({ page }) => {
    const account = newAccount('profile')
    await register(page, account)
    await signIn(page, account)

    await page.getByRole('button', { name: new RegExp(account.firstName) }).click()
    await page.getByRole('link', { name: 'Profile' }).click()

    await expect(page.getByText(/No roles — a base user/)).toBeVisible()
    await expect(page.getByText(account.email)).toBeVisible()
  })
})

test.describe('Health', () => {
  test('reports the API and its database as healthy', async ({ page }) => {
    const account = newAccount('health')
    await register(page, account)

    await page.goto('/health')
    await expect(page.getByRole('heading', { name: 'API status' })).toBeVisible()
    await expect(page.getByRole('cell', { name: 'database' })).toBeVisible()
    await expect(page.getByRole('table').getByText('ok').first()).toBeVisible()
  })
})
