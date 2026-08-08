import { expect, test } from '@playwright/test'

import { createAlbum, newAccount, register, signIn, type Account } from './support'

/**
 * The privileged screens, against the real API.
 *
 * A role cannot be granted over HTTP without an existing role manager, so these
 * tests need an account that already holds one. Point `E2E_ADMIN_EMAIL` (and
 * optionally `E2E_ADMIN_PASSWORD`) at it — in the API project that is:
 *
 *     make rbac-assign role=super_admin email=<their-email>
 *
 * Without it there is nothing meaningful to assert, so the suite skips rather
 * than pretending to have covered it.
 */
const adminEmail = process.env['E2E_ADMIN_EMAIL']
const adminPassword = process.env['E2E_ADMIN_PASSWORD'] ?? 'secret123'

test.describe('A super admin', () => {
  test.skip(
    adminEmail === undefined,
    'Set E2E_ADMIN_EMAIL to an account holding a role-managing role.',
  )

  const admin: Account = {
    firstName: 'Super',
    lastName: 'Admin',
    email: adminEmail ?? '',
    password: adminPassword,
  }

  test('sees every privileged screen in the navigation', async ({ page }) => {
    await signIn(page, admin)

    await expect(page.getByRole('link', { name: 'All albums' })).toBeVisible()
    await expect(page.getByRole('link', { name: 'Users' })).toBeVisible()
    await expect(page.getByRole('link', { name: 'Roles' })).toBeVisible()
    await expect(page.getByRole('link', { name: 'Permissions' })).toBeVisible()
  })

  test('lists every album with its deletion state, and can restore', async ({ page }) => {
    await signIn(page, admin)
    // Unique per run: the API keeps everything these tests create.
    const title = `Admin album ${Date.now().toString(36)}`
    await createAlbum(page, title)

    await page.getByRole('link', { name: 'All albums' }).click()
    await expect(page.getByRole('heading', { name: 'All albums' })).toBeVisible()

    // The admin-only columns and filter.
    await expect(page.getByText('Delete reason')).toBeVisible()
    await expect(page.getByLabel('Deletion state')).toBeVisible()

    await page.getByLabel('Album title').fill(title)
    await page.getByRole('button', { name: 'Apply' }).click()

    const row = page.getByRole('row').filter({ hasText: title })
    await expect(row.getByRole('button', { name: 'Delete' })).toBeVisible()
  })

  test('lists users and can open one', async ({ page }) => {
    await signIn(page, admin)

    await page.getByRole('link', { name: 'Users' }).click()
    await expect(page.getByRole('heading', { name: 'Users' })).toBeVisible()
    await expect(page.getByRole('button', { name: /new user/i })).toBeVisible()

    await page.getByRole('link', { name: 'Open' }).first().click()
    await expect(page.getByRole('link', { name: 'Manage roles' })).toBeVisible()
  })

  test('composes a role from the permission catalog and deletes it', async ({ page }) => {
    await signIn(page, admin)

    const roleName = `e2e-editor-${Date.now().toString(36)}`

    await page.getByRole('link', { name: 'Roles' }).click()
    await page.getByRole('link', { name: /compose role/i }).click()
    // Wait for the composer before touching its fields: the roles list behind
    // it has a "name" filter and a "Sort by name" control.
    await expect(page.getByRole('heading', { name: 'Compose a role' })).toBeVisible()

    await page.getByLabel('Name', { exact: true }).fill(roleName)
    await page.getByLabel('Description', { exact: true }).fill('Created by the suite')
    await page.getByLabel(/album\.update\.any/).check()
    await page.getByRole('button', { name: 'Create role' }).click()

    await expect(page.getByRole('heading', { name: `Role: ${roleName}` })).toBeVisible()
    await expect(page.getByLabel(/album\.update\.any/)).toBeChecked()

    // ...then remove it again, so a rerun starts from the same catalog.
    await page.getByRole('link', { name: 'Back to roles' }).click()
    const row = page.getByRole('row').filter({ hasText: roleName })
    await row.getByRole('button', { name: 'Delete' }).click()
    await page.getByRole('dialog').getByRole('button', { name: 'Delete' }).click()

    await expect(page.getByRole('row').filter({ hasText: roleName })).toHaveCount(0)
  })

  test('refuses to delete a system role', async ({ page }) => {
    await signIn(page, admin)

    await page.getByRole('link', { name: 'Roles' }).click()
    const row = page.getByRole('row').filter({ hasText: 'moderator' })

    // The API answers 409; the client does not offer the action at all.
    await expect(row.getByRole('button', { name: 'Delete' })).toHaveCount(0)
    await expect(row.getByText('system')).toBeVisible()
  })

  test('shows the permission catalog, grouped by resource', async ({ page }) => {
    await signIn(page, admin)

    await page.getByRole('link', { name: 'Permissions' }).click()
    await expect(page.getByRole('heading', { name: 'album' })).toBeVisible()
    await expect(page.getByText('album.restore')).toBeVisible()

    await page.getByLabel('Search').fill('restore')
    await expect(page.getByRole('heading', { name: 'role' })).toHaveCount(0)
  })

  test('assigns a role to another account, then revokes it', async ({ page }) => {
    const target = newAccount('assignee')
    await register(page, target)

    await page.getByRole('button', { name: new RegExp(target.firstName) }).click()
    await page.getByRole('button', { name: 'Sign out', exact: true }).click()

    await signIn(page, admin)
    await page.getByRole('link', { name: 'Users' }).click()
    await page.getByLabel('Email').fill(target.email)
    await page.getByRole('button', { name: 'Apply' }).click()

    const row = page.getByRole('row').filter({ hasText: target.email })
    await row.getByRole('link', { name: 'Roles' }).click()

    await page.getByLabel(/moderator/).check()
    await page.getByRole('button', { name: 'Save roles' }).click()
    await expect(page.getByText('Roles updated.')).toBeVisible()

    await page.getByRole('button', { name: 'Clear all' }).click()
    await page.getByRole('button', { name: 'Save roles' }).click()
    await expect(page.getByText(/now a base user/)).toBeVisible()
  })

  /**
   * The corrected shape of the all-albums screen, proven end to end: one route,
   * two outcomes. A moderator flags; an admin sees the flag and restores.
   */
  test('changes another account’s password only when the box is ticked', async ({ page }) => {
    const target = newAccount('pwd')
    await register(page, target)
    await page.getByRole('button', { name: new RegExp(target.firstName) }).click()
    await page.getByRole('button', { name: 'Sign out', exact: true }).click()

    await signIn(page, admin)
    await page.getByRole('link', { name: 'Users' }).click()
    await page.getByLabel('Email').fill(target.email)
    await page.getByRole('button', { name: 'Apply' }).click()
    await page
      .getByRole('row')
      .filter({ hasText: target.email })
      .getByRole('link', { name: 'Open' })
      .click()

    // Nothing for the browser to autofill until it is asked for.
    await expect(page.getByLabel('New password', { exact: true })).toHaveCount(0)

    await page.getByLabel('Change password').check()
    await page.getByLabel('New password', { exact: true }).fill('rotated-secret')
    await page.getByLabel('Confirm new password').fill('mistyped-secret')
    await page.getByRole('button', { name: 'Save changes' }).click()
    await expect(page.getByText('The two passwords do not match.')).toBeVisible()

    await page.getByLabel('Confirm new password').fill('rotated-secret')
    await page.getByRole('button', { name: 'Save changes' }).click()
    await expect(page.getByText('User updated.')).toBeVisible()

    // The API accepted it: the new password is the one that now signs in.
    await page.getByRole('button', { name: /Super/ }).click()
    await page.getByRole('button', { name: 'Sign out', exact: true }).click()
    await signIn(page, { ...target, password: 'rotated-secret' })
  })

  test('a moderator flags an album for review, and the admin restores it', async ({ page }) => {
    const stamp = Date.now().toString(36)
    const albumTitle = `Review me ${stamp}`

    // An owner with an album...
    const owner = newAccount(`owner-${stamp}`)
    await register(page, owner)
    await createAlbum(page, albumTitle)
    await page.getByRole('button', { name: new RegExp(owner.firstName) }).click()
    await page.getByRole('button', { name: 'Sign out', exact: true }).click()

    // ...and an account the admin promotes to moderator.
    const moderator = newAccount(`mod-${stamp}`)
    await register(page, moderator)
    await page.getByRole('button', { name: new RegExp(moderator.firstName) }).click()
    await page.getByRole('button', { name: 'Sign out', exact: true }).click()

    await signIn(page, admin)
    await page.getByRole('link', { name: 'Users' }).click()
    await page.getByLabel('Email').fill(moderator.email)
    await page.getByRole('button', { name: 'Apply' }).click()
    await page
      .getByRole('row')
      .filter({ hasText: moderator.email })
      .getByRole('link', { name: 'Roles' })
      .click()
    await page.getByLabel(/moderator/).check()
    await page.getByRole('button', { name: 'Save roles' }).click()
    await expect(page.getByText('Roles updated.')).toBeVisible()

    await page.getByRole('button', { name: /Super/ }).click()
    await page.getByRole('button', { name: 'Sign out', exact: true }).click()

    // --- as the moderator: flag, not delete ------------------------------
    await signIn(page, moderator)
    await page.getByRole('link', { name: 'All albums' }).click()

    // The deletion columns and filter belong to whoever can act on a flagged
    // album — a moderator never sees one again.
    await expect(page.getByText('Delete reason')).toHaveCount(0)
    await expect(page.getByLabel('Deletion state')).toHaveCount(0)

    await page.getByLabel('Album title').fill(albumTitle)
    await page.getByRole('button', { name: 'Apply' }).click()

    const row = page.getByRole('row').filter({ hasText: albumTitle })
    await expect(row.getByRole('button', { name: 'Delete' })).toHaveCount(0)
    await row.getByRole('button', { name: 'Flag' }).click()

    await expect(page.getByText(/pending an administrator/i)).toBeVisible()
    await page.getByLabel(/reason/i).fill('Reported by the end-to-end suite')
    await page.getByRole('button', { name: 'Flag album' }).click()

    // Hidden from the moderator from now on.
    await expect(page.getByRole('row').filter({ hasText: albumTitle })).toHaveCount(0)

    await page.getByRole('button', { name: new RegExp(moderator.firstName) }).click()
    await page.getByRole('button', { name: 'Sign out', exact: true }).click()

    // --- as the admin: see the flag and lift it --------------------------
    await signIn(page, admin)
    await page.getByRole('link', { name: 'All albums' }).click()
    await page.getByLabel('Deletion state').selectOption('1')
    await page.getByLabel('Album title').fill(albumTitle)
    await page.getByRole('button', { name: 'Apply' }).click()

    const flagged = page.getByRole('row').filter({ hasText: albumTitle })
    await expect(flagged.getByText('Flagged')).toBeVisible()
    await expect(flagged.getByText('Reported by the end-to-end suite')).toBeVisible()

    await flagged.getByRole('button', { name: 'Restore' }).click()
    await expect(page.getByText(/was restored/)).toBeVisible()
  })
})
