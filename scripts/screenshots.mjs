import { mkdir } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { chromium } from '@playwright/test'

/**
 * Regenerates the screenshots the README shows.
 *
 * They are committed rather than linked from the demo, because a README has to
 * work in a git client, in an editor's preview and on a phone with the images
 * cached — but a committed PNG whose origin nobody knows rots quietly, so this
 * script is how it is reproduced. Run it against the local stack: `make
 * screenshots`.
 *
 * It drives the real client the way the end-to-end suite does — its own account,
 * its own data — so what the README shows is what the application renders, not
 * a mock-up of it.
 */
const BASE_URL = process.env['E2E_BASE_URL'] ?? 'http://localhost:8092'
const OUTPUT = join(dirname(fileURLToPath(import.meta.url)), '..', 'docs', 'screenshots')

/** Wide enough for the table to breathe, short enough to read in a README. */
const VIEWPORT = { width: 1280, height: 800 }

const unique = `${String(Date.now())}-${Math.random().toString(36).slice(2, 7)}`
const account = {
  firstName: 'Ada',
  lastName: 'Lovelace',
  email: `shots-${unique}@example.com`.toLowerCase(),
  password: 'secret123',
}

/**
 * Something photograph-shaped for the API to convert.
 *
 * A one-pixel PNG is what the end-to-end suite uploads — it only has to be a
 * valid image — but scaled to fill a tile it reads as a flat colour block, and
 * these shots are the one place the application has to *look* like itself. The
 * browser is already open, so it renders the gradient and hands back the PNG;
 * no image library is involved.
 */
async function gradient(browser, from, to) {
  const page = await browser.newPage({ viewport: { width: 500, height: 500 } })
  await page.setContent(
    `<body style="margin:0"><svg xmlns="http://www.w3.org/2000/svg" width="500" height="500">
       <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
         <stop offset="0%" stop-color="${from}"/><stop offset="100%" stop-color="${to}"/>
       </linearGradient></defs>
       <rect width="500" height="500" fill="url(#g)"/>
     </svg></body>`,
  )
  const buffer = await page.screenshot()
  await page.close()
  return buffer
}

async function register(page) {
  await page.goto(`${BASE_URL}/register`)
  await page.getByLabel('First name').fill(account.firstName)
  await page.getByLabel('Last name').fill(account.lastName)
  await page.getByLabel('Email').fill(account.email)
  await page.getByLabel('Password', { exact: true }).fill(account.password)
  await page.getByLabel('Confirm password').fill(account.password)
  await page.getByRole('button', { name: 'Create account' }).click()
  await page.waitForSelector('h1:has-text("My albums")')
}

const PHOTOS = [
  { title: 'Beach sunset', from: '#f6b26b', to: '#d9534f' },
  { title: 'Harbour at dawn', from: '#7fb3d5', to: '#2a66dd' },
  { title: 'The long road north', from: '#8fbf8f', to: '#177a42' },
]

async function seed(browser, page) {
  await page.getByRole('button', { name: /new album/i }).click()
  const dialog = page.getByRole('dialog')
  await dialog.getByLabel('Title').fill('Vacation 2025')
  await dialog.getByRole('button', { name: 'Create album' }).click()
  await page.getByRole('link', { name: 'Vacation 2025' }).click()
  await page.waitForSelector('h1:has-text("Vacation 2025")')

  for (const photo of PHOTOS) {
    await page.getByRole('button', { name: 'Upload photo' }).click()
    const upload = page.getByRole('dialog')
    await upload.getByLabel('Title').fill(photo.title)
    await page.setInputFiles('#photo-file', {
      name: 'photo.png',
      mimeType: 'image/png',
      buffer: await gradient(browser, photo.from, photo.to),
    })
    await upload.getByRole('button', { name: 'Upload' }).click()
    await page.waitForSelector(`h2:has-text("${photo.title}")`)
  }
}

/**
 * Every step above raises a toast, and they would otherwise sit across the
 * corner of the shot announcing the setup rather than the application. Success
 * toasts dismiss themselves; this just waits them out instead of clicking four
 * close buttons.
 */
async function settleToasts(page) {
  await page.locator('.toastStack__item').last().waitFor({ state: 'detached', timeout: 15000 })
}

async function setTheme(page, theme) {
  const current = await page.locator('html').getAttribute('data-bs-theme')
  if (current === theme) return

  await page.getByRole('button', { name: new RegExp(account.firstName) }).click()
  await page.getByRole('button', { name: `Switch to ${theme} theme` }).click()
  await page.keyboard.press('Escape')
  // Buttons transition their colours; a shot taken now catches them mid-way.
  await page.waitForTimeout(500)
}

const browser = await chromium.launch()
const page = await browser.newPage({ viewport: VIEWPORT, deviceScaleFactor: 2 })

await mkdir(OUTPUT, { recursive: true })
await register(page)
await seed(browser, page)
await settleToasts(page)

for (const theme of ['light', 'dark']) {
  await setTheme(page, theme)
  const path = join(OUTPUT, `album-${theme}.png`)
  await page.screenshot({ path })
  console.log(`→ ${path}`)
}

await browser.close()
