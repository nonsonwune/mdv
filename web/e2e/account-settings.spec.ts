import { test, expect } from '@playwright/test'

const WEB = process.env.MDV_WEB_URL || 'http://localhost:3000'

// Smoke tests for Account Settings: security endpoints and mobile responsiveness
// Assumes login works using seeded dev users

async function login(page) {
  await page.goto(`${WEB}/login?next=/account`)
  // Redirects to /customer-login
  await page.waitForURL(/customer-login/)
  await page.getByLabel('Email address').fill('customer@mdv.ng')
  await page.getByLabel('Password').fill('password123')
  await page.getByRole('button', { name: /Sign in/i }).click()
  await page.waitForURL(/\/account/)
}

async function gotoSettings(page) {
  // On mobile widths the selector is a dropdown
  const mobileSelect = page.locator('#account-mobile-nav')
  if (await mobileSelect.isVisible()) {
    await mobileSelect.selectOption('settings')
  } else {
    await page.getByRole('button', { name: /Settings/i }).click()
  }
}

// Verify security endpoints and no console errors
test('Account Settings: security API routes and no console errors', async ({ page, context }) => {
  const messages: string[] = []
  page.on('console', (msg) => {
    if (['error'].includes(msg.type())) messages.push(msg.text())
  })

  await login(page)
  await gotoSettings(page)

  // Ensure security fetches do not 404
  const [devicesRes] = await Promise.all([
    page.waitForResponse((res) => res.url().includes('/api/security/devices') && res.request().method() === 'GET'),
  ])
  expect(devicesRes.status()).toBeLessThan(400)

  const [sessionsRes] = await Promise.all([
    page.waitForResponse((res) => res.url().includes('/api/security/sessions') && res.request().method() === 'GET'),
  ])
  expect(sessionsRes.status()).toBeLessThan(400)

  // No console errors
  expect(messages.filter(m => m && !m.includes('favicon'))).toEqual([])
})

// Responsive checks
for (const width of [320, 375, 414]) {
  test(`Account Settings mobile layout works at width=${width}`, async ({ page }) => {
    await page.setViewportSize({ width, height: 800 })
    await login(page)
    await gotoSettings(page)

    // Mobile dropdown should be visible on small widths
    const sel = page.locator('#settings-mobile-tab')
    if (width <= 414) {
      await expect(sel).toBeVisible()
      await sel.selectOption('privacy')
      await sel.selectOption('security')
      await sel.selectOption('preferences')
    }

    // Cards should fit without horizontal scroll
    const hasHScroll = await page.evaluate(() => document.scrollingElement ? document.scrollingElement.scrollWidth > document.scrollingElement.clientWidth : false)
    expect(hasHScroll).toBeFalsy()
  })
}

