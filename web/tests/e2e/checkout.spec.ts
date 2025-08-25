import { test, expect } from '@playwright/test';

// NOTE: This flow relies on local backend dev server on 8000 and mocked Paystack (ALLOW_MOCKS&&NEXT_PUBLIC_ALLOW_MOCKS).
// It exercises: home → product → add to cart → cart → checkout (not asserting redirect as it's external).

test('browse PDP, add to cart, view cart, proceed to checkout', async ({ page }) => {
  // Home
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Maison De Valeur' })).toBeVisible();

  // Navigate to first product card if present
  const cards = page.locator('a:has-text("Details")');
  // If quick view is used, fallback to product links
  const productLink = page.locator('a[href^="/product/"]').first();
  if (await productLink.count() === 0) {
    test.skip(true, 'No products available to test');
  }
  await productLink.click();

  // PDP
  await expect(page.getByRole('heading')).toBeVisible();
  // Try submitting add-to-cart form (falls back to GET /cart?add if single variant)
  const addToCart = page.getByRole('button', { name: /add to cart/i });
  if (await addToCart.count()) {
    await addToCart.click();
  } else {
    // If not a button, there may be a link
    const addLink = page.locator('a[href^="/cart?add="]').first();
    if (await addLink.count()) await addLink.click();
  }

  // Cart
  await expect(page.getByRole('heading', { name: /Your Cart/i })).toBeVisible();
  // Proceed to checkout
  const proceed = page.getByRole('link', { name: /Proceed to Checkout/i });
  await expect(proceed).toBeVisible();
  await proceed.click();

  // Checkout
  await expect(page.getByRole('heading', { name: /Checkout/i })).toBeVisible();
});

