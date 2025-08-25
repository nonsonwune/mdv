import { test, expect } from '@playwright/test'

// Stable mock flow that does not depend on home catalog rendering.
// Assumes seed_dev created product with slug "basic-tee" and mocks are enabled.

test('happy path: add to cart -> checkout (mock) -> callback paid', async ({ page }) => {
  // Go directly to the seeded product page
  await page.goto('/product/basic-tee')

  // Add to cart (form posts to /cart?add=...)
  const addBtn = page.locator('form[action="/cart"] button[type="submit"], button:has-text("Add to Cart")').first()
  await expect(addBtn).toBeVisible()
  await addBtn.click()

  // Cart page renders and shows at least one item
  await page.waitForURL(/\/cart/)
  await expect(page.getByRole('heading', { name: /Your Cart/i })).toBeVisible()
  await expect(page.locator('text=Variant #')).toBeVisible({ timeout: 10000 })

  // Proceed to checkout
  await page.getByRole('link', { name: /Proceed to Checkout/i }).click()
  await expect(page).toHaveURL(/\/checkout/)

  // Fill checkout form
  await page.fill('input[placeholder="Full name"]', 'Test User')
  await page.fill('input[placeholder="Phone"]', '08000000000')
  await page.fill('input[placeholder="State"]', 'Lagos')
  await page.fill('input[placeholder="City"]', 'Ikeja')
  await page.fill('input[placeholder="Street address"]', 'Awolowo Road 1')
  await page.fill('input[placeholder="Email"]', 'test@example.com')

  // Submit and expect mock redirect (app routes to /paystack-mock when NEXT_PUBLIC_ALLOW_MOCKS=true)
  await page.click('button[type="submit"]')
  await page.waitForURL(/\/paystack-mock\?/, { timeout: 20000 })

  // Disambiguate heading vs toast
  await expect(page.getByRole('heading', { name: /Paystack Mock/i })).toBeVisible()
  await page.getByRole('button', { name: /Simulate Success/i }).click()

  // Callback page shows success
  await expect(page).toHaveURL(/\/checkout\/callback/)
  await expect(page.locator('text=Payment confirmed')).toBeVisible({ timeout: 30000 })
})

