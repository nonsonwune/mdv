import { test, expect } from "@playwright/test";

const WEB = process.env.MDV_WEB_URL || "http://localhost:3000";

// Basic smoke: home -> product -> add to cart -> checkout -> mock success -> callback Paid (dev only)
// Requires web dev server running, API running locally, and ALLOW_MOCKS=true on web.

test("e2e: checkout happy path (dev mock)", async ({ page }) => {
  test.setTimeout(120_000);

  // Home
  await page.goto(WEB);
  await expect(page.getByText(/Maison De Valeur/i)).toBeVisible({ timeout: 30000 });
  // Wait for at least one product link to be ready or continue after reasonable time
  await page.waitForTimeout(1000);

  // Navigate to first product; fall back to known seeded slug if listing is empty
  const firstProduct = page.locator('a[href^="/product/"]').first();
  const linkCount = await page.locator('a[href^="/product/"]').count();
  if (linkCount > 0) {
    await firstProduct.click();
  } else {
    await page.goto(`${WEB}/product/basic-tee`);
  }

  // Add to cart (PDP has a form action="/cart"; clicking submits to /cart?add=)
  const addBtn = page.locator('form[action="/cart"] button[type="submit"], button:has-text("Add to Cart")').first();
  await expect(addBtn).toBeVisible();
  await addBtn.click();

  // Cart page - confirm URL and presence of items
  await page.waitForURL(/\/cart/, { timeout: 10000 });
  await expect(page.getByText(/Your Cart/i)).toBeVisible();
  // Cart should have at least one item row with product title or variant info
  await expect(page.getByText(/Basic Tee|Variant #/)).toBeVisible({ timeout: 10000 });
  await page.getByRole('link', { name: /Proceed to Checkout/i }).click();

  // Checkout page (fill minimal required fields)
  await expect(page.getByText(/Checkout/i)).toBeVisible();
  await page.getByPlaceholder("Full name").fill("Test User");
  await page.getByPlaceholder("Phone").fill("08000000000");
  await page.getByPlaceholder("State").fill("Lagos");
  await page.getByPlaceholder("City").fill("Ikeja");
  await page.getByPlaceholder("Street address").fill("1 Adeola Odeku");
  await page.getByPlaceholder("Email").fill("test@example.com");
  await page.getByRole("button", { name: /Pay with Paystack/i }).click();

  // We expect to land on /paystack-mock?order_id=...&ref=...
  await page.waitForURL(/paystack-mock/, { timeout: 20000 });
  // Disambiguate heading vs toast text
  await expect(page.getByRole('heading', { name: /Paystack Mock/i })).toBeVisible();
  await page.getByRole("button", { name: /Simulate Success/i }).click();

  // Callback page
  await expect(page.getByText(/Checkout Status/i)).toBeVisible();
  await expect(page.getByText(/Payment confirmed/i)).toBeVisible({ timeout: 45_000 });
  await expect(page.getByText(/Status:\s*Paid/i)).toBeVisible();
});

