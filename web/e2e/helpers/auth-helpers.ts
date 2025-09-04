import { type Page, type BrowserContext, expect } from '@playwright/test'

export interface TestUser {
  email: string
  password: string
  role: string
  name?: string
}

export const TEST_USERS: Record<string, TestUser> = {
  admin: {
    email: 'admin@mdv.ng',
    password: 'admin123',
    role: 'admin',
    name: 'Admin User'
  },
  supervisor: {
    email: 'supervisor@mdv.ng',
    password: 'supervisor123',
    role: 'supervisor',
    name: 'Supervisor User'
  },
  operations: {
    email: 'ops@mdv.ng',
    password: 'ops123',
    role: 'operations',
    name: 'Operations User'
  },
  logistics: {
    email: 'logistics@mdv.ng',
    password: 'logistics123',
    role: 'logistics',
    name: 'Logistics User'
  },
  customer: {
    email: 'customer@test.com',
    password: 'customer123',
    role: 'customer',
    name: 'Test Customer'
  }
}

/**
 * Login as a staff user
 */
export async function loginStaff(page: Page, user: TestUser) {
  await page.goto('/staff-login')
  
  // Wait for form to be ready
  await page.waitForSelector('[data-testid="email-input"]')
  
  await page.fill('[data-testid="email-input"]', user.email)
  await page.fill('[data-testid="password-input"]', user.password)
  
  // Click login and wait for navigation
  await Promise.all([
    page.waitForURL(/\/admin/),
    page.click('[data-testid="login-button"]')
  ])
  
  // Verify successful login
  await expect(page.locator('[data-testid="admin-dashboard"]')).toBeVisible()
}

/**
 * Login as a customer
 */
export async function loginCustomer(page: Page, user: TestUser) {
  await page.goto('/customer-login')
  
  // Wait for form to be ready
  await page.waitForSelector('[data-testid="email-input"]')
  
  await page.fill('[data-testid="email-input"]', user.email)
  await page.fill('[data-testid="password-input"]', user.password)
  
  // Click login and wait for navigation
  await Promise.all([
    page.waitForURL(/\/(account|$)/),
    page.click('[data-testid="login-button"]')
  ])
}

/**
 * Logout current user
 */
export async function logout(page: Page) {
  // Click user menu
  await page.click('[data-testid="user-menu"]')
  
  // Click logout and wait for navigation
  await Promise.all([
    page.waitForURL('/'),
    page.click('[data-testid="logout-button"]')
  ])
  
  // Verify logout
  await expect(page.locator('[data-testid="login-link"]')).toBeVisible()
}

/**
 * Check if user is authenticated
 */
export async function checkAuthState(page: Page, shouldBeAuthenticated: boolean) {
  if (shouldBeAuthenticated) {
    // Should see user menu or authenticated content
    await expect(page.locator('[data-testid="user-menu"]')).toBeVisible()
  } else {
    // Should see login links
    await expect(page.locator('[data-testid="login-link"]')).toBeVisible()
  }
}

/**
 * Clear all authentication state
 */
export async function clearAuthState(page: Page) {
  // Clear cookies
  await page.context().clearCookies()
  
  // Clear storage
  await page.evaluate(() => {
    localStorage.clear()
    sessionStorage.clear()
  })
}

/**
 * Get authentication cookies
 */
export async function getAuthCookies(context: BrowserContext) {
  const cookies = await context.cookies()
  return cookies.filter(c => c.name.startsWith('mdv_'))
}

/**
 * Verify user has specific role permissions
 */
export async function verifyRolePermissions(page: Page, role: string) {
  await page.goto('/admin')
  
  switch (role) {
    case 'admin':
      // Admin should see all sections
      await expect(page.locator('[data-testid="users-section"]')).toBeVisible()
      await expect(page.locator('[data-testid="products-section"]')).toBeVisible()
      await expect(page.locator('[data-testid="orders-section"]')).toBeVisible()
      await expect(page.locator('[data-testid="reports-section"]')).toBeVisible()
      break
      
    case 'supervisor':
      // Supervisor should see most sections except user management
      await expect(page.locator('[data-testid="products-section"]')).toBeVisible()
      await expect(page.locator('[data-testid="orders-section"]')).toBeVisible()
      await expect(page.locator('[data-testid="reports-section"]')).toBeVisible()
      await expect(page.locator('[data-testid="users-section"]')).toBeVisible()
      break
      
    case 'operations':
      // Operations should see products and orders
      await expect(page.locator('[data-testid="products-section"]')).toBeVisible()
      await expect(page.locator('[data-testid="orders-section"]')).toBeVisible()
      await expect(page.locator('[data-testid="users-section"]')).not.toBeVisible()
      break
      
    case 'logistics':
      // Logistics should see limited sections
      await expect(page.locator('[data-testid="orders-section"]')).toBeVisible()
      await expect(page.locator('[data-testid="products-section"]')).not.toBeVisible()
      await expect(page.locator('[data-testid="users-section"]')).not.toBeVisible()
      break
  }
}

/**
 * Simulate network error for authentication requests
 */
export async function simulateNetworkError(page: Page, endpoint: string = '**/api/auth/**') {
  await page.route(endpoint, route => {
    route.abort('failed')
  })
}

/**
 * Simulate slow network for authentication requests
 */
export async function simulateSlowNetwork(page: Page, delay: number = 5000) {
  await page.route('**/api/auth/**', async route => {
    await new Promise(resolve => setTimeout(resolve, delay))
    await route.continue()
  })
}

/**
 * Mock authentication response
 */
export async function mockAuthResponse(page: Page, user: TestUser, success: boolean = true) {
  await page.route('**/api/auth/login', route => {
    if (success) {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          ok: true,
          user: {
            id: '1',
            email: user.email,
            role: user.role,
            name: user.name
          }
        })
      })
    } else {
      route.fulfill({
        status: 401,
        contentType: 'application/json',
        body: JSON.stringify({
          error: 'Invalid credentials'
        })
      })
    }
  })
}

/**
 * Test authentication flow with retries
 */
export async function testAuthWithRetries(
  page: Page, 
  user: TestUser, 
  maxRetries: number = 3
): Promise<boolean> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      await clearAuthState(page)
      await loginStaff(page, user)
      
      // Verify successful login
      await expect(page).toHaveURL(/\/admin/)
      await checkAuthState(page, true)
      
      return true
    } catch (error) {
      console.log(`Auth attempt ${attempt} failed:`, error)
      
      if (attempt === maxRetries) {
        throw error
      }
      
      // Wait before retry
      await page.waitForTimeout(1000 * attempt)
    }
  }
  
  return false
}

/**
 * Measure authentication performance
 */
export async function measureAuthPerformance(page: Page, user: TestUser) {
  const startTime = Date.now()
  
  await page.goto('/staff-login')
  const pageLoadTime = Date.now() - startTime
  
  const loginStartTime = Date.now()
  await page.fill('[data-testid="email-input"]', user.email)
  await page.fill('[data-testid="password-input"]', user.password)
  await page.click('[data-testid="login-button"]')
  await page.waitForURL(/\/admin/)
  const loginTime = Date.now() - loginStartTime
  
  return {
    pageLoadTime,
    loginTime,
    totalTime: pageLoadTime + loginTime
  }
}
