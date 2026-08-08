import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Page } from '@playwright/test'

import { createAlbum, newAccount, register } from './support'

const WHITE = 'rgb(255, 255, 255)'
/** `$secondary`, the filled state of the account-menu toggle. */
const SECONDARY = 'rgb(92, 107, 122)'
const TRANSPARENT = 'rgba(0, 0, 0, 0)'

/**
 * Three defects that only exist once the stylesheet is loaded, so neither the
 * unit nor the functional suite can see them: a hover colour Bootstrap derives
 * for us, a hover tint that was indistinguishable from its own background, and
 * a button that gave no sign the menu it controls was open.
 *
 * These assert with `toHaveCSS`, which retries — buttons transition their
 * colours, so a single read lands on the value they are transitioning *from*.
 */
test.describe('Contrast and state', () => {
  test('a destructive button keeps white text while hovered', async ({ page }) => {
    const account = newAccount('contrast')
    await register(page, account)
    await createAlbum(page, `Contrast ${Date.now().toString(36)}`)

    const remove = page.getByRole('button', { name: 'Delete' }).first()
    await remove.hover()

    // Bootstrap's contrast function picks black here, which is unreadable on
    // the red fill it picks alongside it.
    await expect(remove).toHaveCSS('color', WHITE)
  })

  test('the account menu shows which entry is hovered', async ({ page }) => {
    const account = newAccount('menuhover')
    await register(page, account)

    await page.getByRole('button', { name: new RegExp(account.firstName) }).click()

    const entry = page.getByRole('link', { name: 'Profile' })
    await expect(entry).toHaveCSS('background-color', TRANSPARENT)

    await entry.hover()
    await expect(entry).not.toHaveCSS('background-color', TRANSPARENT)
  })

  test('the toggle fills while its menu is open, and clears when dismissed', async ({ page }) => {
    const account = newAccount('toggle')
    await register(page, account)

    const toggle = page.getByRole('button', { name: new RegExp(account.firstName) })
    await expect(toggle).toHaveCSS('background-color', TRANSPARENT)

    await toggle.click()
    // Step off the button first: it is still hovered from the click, and a
    // hovered fill is a different shade of the same state.
    await page.mouse.move(0, 0)
    await expect(toggle).toHaveCSS('background-color', SECONDARY)
    await expect(toggle).toHaveCSS('color', WHITE)

    // A click anywhere else puts it back.
    await page.getByRole('heading', { name: 'My albums' }).click()
    await page.mouse.move(0, 0)
    await expect(toggle).toHaveAttribute('aria-expanded', 'false')
    await expect(toggle).toHaveCSS('background-color', TRANSPARENT)
  })
})

/**
 * axe against the real stylesheet. The functional suite runs the same rules in
 * jsdom, but with `css: false` — so `color-contrast`, the one rule that needs
 * rendered colours, can only be answered here.
 */
test.describe('Accessibility with the stylesheet loaded', () => {
  async function scan(page: Page): Promise<void> {
    const { violations } = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze()

    expect(
      violations.flatMap((violation) =>
        violation.nodes.map(
          (node) => `${violation.id}: ${node.target.join(' ')} — ${node.failureSummary ?? ''}`,
        ),
      ),
    ).toEqual([])
  }

  test('a list screen and the dialog it opens are clean', async ({ page }) => {
    const account = newAccount('axelist')
    await register(page, account)
    await createAlbum(page, `Axe ${Date.now().toString(36)}`)

    await scan(page)

    await page.getByRole('button', { name: /new album/i }).click()
    await expect(page.getByRole('dialog')).toBeVisible()
    await scan(page)
  })

  test('the sign-in form is clean', async ({ page }) => {
    await page.goto('/login')
    await expect(page.getByRole('button', { name: 'Sign in' })).toBeVisible()

    await scan(page)
  })
})
