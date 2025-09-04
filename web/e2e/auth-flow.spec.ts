import { test, expect, type Page } from '@playwright/test'

// Test data
const TEST_USERS = {
  admin: {
    email: 'admin@mdv.ng',
    password: 'admin123',
    role: 'admin'
  },
  operations: {
    email: 'ops@mdv.ng', 
    password: 'ops123',
    role: 'operations'
  },
  customer: {
    email: 'customer@test.com',
    password: 'customer123',
    role: 'customer'
  }
}

// Helper functions
async function loginUser(page: Page, email: string, password: string) {
  await page.goto('/staff-login')
  await page.fill('[data-testid="email-input"]', email)
  await page.fill('[data-testid="password-input"]', password)
  await page.click('[data-testid="login-button"]')
}

async function loginCustomer(page: Page, email: string, password: string) {
  await page.goto('/customer-login')
  await page.fill('[data-testid="email-input"]', email)
  await page.fill('[data-testid="password-input"]', password)
  await page.click('[data-testid="login-button"]')
}

async function logout(page: Page) {
  await page.click('[data-testid="user-menu"]')
  await page.click('[data-testid="logout-button"]')
}

async function checkAuthState(page: Page, shouldBeAuthenticated: boolean) {
  if (shouldBeAuthenticated) {
    // Should see user menu or authenticated content
    await expect(page.locator('[data-testid="user-menu"]')).toBeVisible()
  } else {
    // Should see login links
    await expect(page.locator('[data-testid="login-link"]')).toBeVisible()
  }
}

test.describe('Authentication Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Clear all cookies and localStorage before each test
    await page.context().clearCookies()
    await page.evaluate(() => {
      localStorage.clear()
      sessionStorage.clear()
    })
  })

  test('Staff login flow - Admin', async ({ page }) => {
    const user = TEST_USERS.admin
    
    // Navigate to staff login
    await page.goto('/staff-login')
    await expect(page).toHaveTitle(/Staff Login/)
    
    // Fill login form
    await page.fill('[data-testid="email-input"]', user.email)
    await page.fill('[data-testid="password-input"]', user.password)
    
    // Submit login
    await page.click('[data-testid="login-button"]')
    
    // Should redirect to admin dashboard
    await expect(page).toHaveURL(/\/admin/)
    
    // Should see admin interface
    await expect(page.locator('[data-testid="admin-dashboard"]')).toBeVisible()
    
    // Check auth state
    await checkAuthState(page, true)
  })

  test('Staff login flow - Operations', async ({ page }) => {
    const user = TEST_USERS.operations
    
    await loginUser(page, user.email, user.password)
    
    // Should redirect to admin dashboard
    await expect(page).toHaveURL(/\/admin/)
    
    // Should see operations interface
    await expect(page.locator('[data-testid="admin-dashboard"]')).toBeVisible()
    
    // Check role-specific permissions
    await expect(page.locator('[data-testid="products-section"]')).toBeVisible()
    await expect(page.locator('[data-testid="orders-section"]')).toBeVisible()
  })

  test('Customer login flow', async ({ page }) => {
    const user = TEST_USERS.customer
    
    await loginCustomer(page, user.email, user.password)
    
    // Should redirect to account page or home
    await expect(page).toHaveURL(/\/(account|$)/)
    
    // Should see customer interface
    await checkAuthState(page, true)
  })

  test('Invalid credentials handling', async ({ page }) => {
    await page.goto('/staff-login')
    
    // Try invalid credentials
    await page.fill('[data-testid="email-input"]', 'invalid@test.com')
    await page.fill('[data-testid="password-input"]', 'wrongpassword')
    await page.click('[data-testid="login-button"]')
    
    // Should show error message
    await expect(page.locator('[data-testid="error-message"]')).toBeVisible()
    await expect(page.locator('[data-testid="error-message"]')).toContainText(/Invalid/)
    
    // Should remain on login page
    await expect(page).toHaveURL(/\/staff-login/)
  })

  test('Logout flow', async ({ page }) => {
    const user = TEST_USERS.admin
    
    // Login first
    await loginUser(page, user.email, user.password)
    await expect(page).toHaveURL(/\/admin/)
    
    // Logout
    await logout(page)
    
    // Should redirect to home page
    await expect(page).toHaveURL('/')
    
    // Should not be authenticated
    await checkAuthState(page, false)
    
    // Verify cookies are cleared
    const cookies = await page.context().cookies()
    const authCookies = cookies.filter(c => c.name.startsWith('mdv_'))
    expect(authCookies).toHaveLength(0)
  })

  test('Session persistence across page reloads', async ({ page }) => {
    const user = TEST_USERS.admin
    
    // Login
    await loginUser(page, user.email, user.password)
    await expect(page).toHaveURL(/\/admin/)
    
    // Reload page
    await page.reload()
    
    // Should still be authenticated
    await expect(page).toHaveURL(/\/admin/)
    await checkAuthState(page, true)
  })

  test('Session persistence across browser tabs', async ({ context }) => {
    const user = TEST_USERS.admin
    
    // Login in first tab
    const page1 = await context.newPage()
    await loginUser(page1, user.email, user.password)
    await expect(page1).toHaveURL(/\/admin/)
    
    // Open second tab
    const page2 = await context.newPage()
    await page2.goto('/admin')
    
    // Should be authenticated in second tab
    await expect(page2).toHaveURL(/\/admin/)
    await checkAuthState(page2, true)
    
    // Logout from first tab
    await logout(page1)
    
    // Second tab should also be logged out after refresh
    await page2.reload()
    await expect(page2).toHaveURL(/\/staff-login/)
  })

  test('Protected route access without authentication', async ({ page }) => {
    // Try to access admin without login
    await page.goto('/admin')
    
    // Should redirect to staff login
    await expect(page).toHaveURL(/\/staff-login/)
    
    // Try to access customer account without login
    await page.goto('/account')
    
    // Should redirect to customer login
    await expect(page).toHaveURL(/\/customer-login/)
  })

  test('Role-based access control', async ({ page }) => {
    const user = TEST_USERS.operations
    
    // Login as operations user
    await loginUser(page, user.email, user.password)
    await expect(page).toHaveURL(/\/admin/)
    
    // Should have access to operations features
    await expect(page.locator('[data-testid="products-section"]')).toBeVisible()
    await expect(page.locator('[data-testid="orders-section"]')).toBeVisible()
    
    // Should not have access to admin-only features
    await expect(page.locator('[data-testid="users-section"]')).not.toBeVisible()
  })

  test('Token refresh and expiration handling', async ({ page }) => {
    const user = TEST_USERS.admin
    
    // Login
    await loginUser(page, user.email, user.password)
    await expect(page).toHaveURL(/\/admin/)
    
    // Simulate token expiration by clearing cookies
    await page.context().clearCookies()
    
    // Try to access protected resource
    await page.goto('/admin/products')
    
    // Should redirect to login
    await expect(page).toHaveURL(/\/staff-login/)
  })

  test('Concurrent login sessions', async ({ context }) => {
    const user = TEST_USERS.admin
    
    // Create multiple pages (simulating multiple browser windows)
    const page1 = await context.newPage()
    const page2 = await context.newPage()
    
    // Login from both pages
    await loginUser(page1, user.email, user.password)
    await loginUser(page2, user.email, user.password)
    
    // Both should be authenticated
    await expect(page1).toHaveURL(/\/admin/)
    await expect(page2).toHaveURL(/\/admin/)
    
    await checkAuthState(page1, true)
    await checkAuthState(page2, true)
  })

  test('Login form validation', async ({ page }) => {
    await page.goto('/staff-login')
    
    // Try to submit empty form
    await page.click('[data-testid="login-button"]')
    
    // Should show validation errors
    await expect(page.locator('[data-testid="email-error"]')).toBeVisible()
    await expect(page.locator('[data-testid="password-error"]')).toBeVisible()
    
    // Fill invalid email
    await page.fill('[data-testid="email-input"]', 'invalid-email')
    await page.click('[data-testid="login-button"]')
    
    // Should show email format error
    await expect(page.locator('[data-testid="email-error"]')).toContainText(/valid email/)
  })

  test('Network error handling during login', async ({ page }) => {
    // Intercept login request and simulate network error
    await page.route('**/api/auth/login', route => {
      route.abort('failed')
    })
    
    await page.goto('/staff-login')
    await page.fill('[data-testid="email-input"]', TEST_USERS.admin.email)
    await page.fill('[data-testid="password-input"]', TEST_USERS.admin.password)
    await page.click('[data-testid="login-button"]')
    
    // Should show network error message
    await expect(page.locator('[data-testid="error-message"]')).toBeVisible()
    await expect(page.locator('[data-testid="error-message"]')).toContainText(/network|connection/i)
  })

  test('Auth state consistency across page navigation', async ({ page }) => {
    const user = TEST_USERS.admin
    
    // Login
    await loginUser(page, user.email, user.password)
    await expect(page).toHaveURL(/\/admin/)
    
    // Navigate to different pages
    await page.goto('/')
    await checkAuthState(page, true)
    
    await page.goto('/shop')
    await checkAuthState(page, true)
    
    await page.goto('/admin/products')
    await expect(page).toHaveURL(/\/admin\/products/)
    await checkAuthState(page, true)
  })
})
