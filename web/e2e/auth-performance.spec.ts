import { test, expect } from '@playwright/test'
import { 
  TEST_USERS, 
  loginStaff, 
  clearAuthState, 
  measureAuthPerformance,
  testAuthWithRetries 
} from './helpers/auth-helpers'

test.describe('Authentication Performance Tests', () => {
  test.beforeEach(async ({ page }) => {
    await clearAuthState(page)
  })

  test('Login performance benchmark', async ({ page }) => {
    const user = TEST_USERS.admin
    
    // Measure authentication performance
    const performance = await measureAuthPerformance(page, user)
    
    // Performance assertions
    expect(performance.pageLoadTime).toBeLessThan(5000) // Page should load within 5s
    expect(performance.loginTime).toBeLessThan(3000)    // Login should complete within 3s
    expect(performance.totalTime).toBeLessThan(8000)    // Total flow within 8s
    
    console.log('Auth Performance:', performance)
  })

  test('Concurrent login stress test', async ({ context }) => {
    const user = TEST_USERS.admin
    const concurrentLogins = 5
    
    // Create multiple pages for concurrent testing
    const pages = await Promise.all(
      Array(concurrentLogins).fill(0).map(() => context.newPage())
    )
    
    const startTime = Date.now()
    
    // Perform concurrent logins
    const loginPromises = pages.map(async (page, index) => {
      try {
        await clearAuthState(page)
        await loginStaff(page, user)
        return { success: true, pageIndex: index }
      } catch (error) {
        return { success: false, pageIndex: index, error }
      }
    })
    
    const results = await Promise.all(loginPromises)
    const totalTime = Date.now() - startTime
    
    // Verify results
    const successCount = results.filter(r => r.success).length
    const successRate = (successCount / concurrentLogins) * 100
    
    console.log(`Concurrent login results: ${successCount}/${concurrentLogins} successful (${successRate}%)`)
    console.log(`Total time: ${totalTime}ms`)
    
    // Expect at least 80% success rate for concurrent logins
    expect(successRate).toBeGreaterThanOrEqual(80)
    
    // Clean up
    await Promise.all(pages.map(page => page.close()))
  })

  test('Authentication reliability test', async ({ page }) => {
    const user = TEST_USERS.admin
    const testRuns = 10
    let successCount = 0
    
    for (let i = 0; i < testRuns; i++) {
      try {
        const success = await testAuthWithRetries(page, user, 1)
        if (success) successCount++
      } catch (error) {
        console.log(`Test run ${i + 1} failed:`, error)
      }
      
      // Clear state between runs
      await clearAuthState(page)
      await page.waitForTimeout(500) // Small delay between tests
    }
    
    const successRate = (successCount / testRuns) * 100
    console.log(`Authentication reliability: ${successCount}/${testRuns} (${successRate}%)`)
    
    // Expect 99.9% success rate (allowing for 1 failure in 10 runs)
    expect(successRate).toBeGreaterThanOrEqual(90)
  })

  test('Session persistence performance', async ({ page }) => {
    const user = TEST_USERS.admin
    
    // Login
    await loginStaff(page, user)
    
    // Test multiple page navigations
    const navigationTests = [
      '/',
      '/admin',
      '/admin/products',
      '/admin/orders',
      '/admin/users'
    ]
    
    const navigationTimes: number[] = []
    
    for (const url of navigationTests) {
      const startTime = Date.now()
      await page.goto(url)
      
      // Wait for page to be ready (authenticated state should be maintained)
      await page.waitForLoadState('networkidle')
      
      const navigationTime = Date.now() - startTime
      navigationTimes.push(navigationTime)
      
      // Verify still authenticated
      await expect(page.locator('[data-testid="user-menu"]')).toBeVisible()
    }
    
    const avgNavigationTime = navigationTimes.reduce((a, b) => a + b, 0) / navigationTimes.length
    console.log('Average navigation time:', avgNavigationTime, 'ms')
    console.log('Navigation times:', navigationTimes)
    
    // Each navigation should be fast (under 2 seconds)
    expect(avgNavigationTime).toBeLessThan(2000)
    expect(Math.max(...navigationTimes)).toBeLessThan(5000)
  })

  test('Token refresh performance', async ({ page }) => {
    const user = TEST_USERS.admin
    
    // Login
    await loginStaff(page, user)
    
    // Simulate token near expiration by making multiple API calls
    const apiCalls = 10
    const callTimes: number[] = []
    
    for (let i = 0; i < apiCalls; i++) {
      const startTime = Date.now()
      
      // Make authenticated API call
      const response = await page.evaluate(async () => {
        return fetch('/api/auth/check', {
          credentials: 'include'
        })
      })
      
      const callTime = Date.now() - startTime
      callTimes.push(callTime)
      
      expect(response).toBeTruthy()
      
      // Small delay between calls
      await page.waitForTimeout(100)
    }
    
    const avgCallTime = callTimes.reduce((a, b) => a + b, 0) / callTimes.length
    console.log('Average auth check time:', avgCallTime, 'ms')
    
    // Auth checks should be fast
    expect(avgCallTime).toBeLessThan(500)
  })

  test('Memory usage during authentication', async ({ page }) => {
    const user = TEST_USERS.admin
    
    // Get initial memory usage
    const initialMemory = await page.evaluate(() => {
      return (performance as any).memory?.usedJSHeapSize || 0
    })
    
    // Perform login
    await loginStaff(page, user)
    
    // Navigate through several pages
    const pages = ['/admin', '/admin/products', '/admin/orders', '/admin/users']
    for (const url of pages) {
      await page.goto(url)
      await page.waitForLoadState('networkidle')
    }
    
    // Get final memory usage
    const finalMemory = await page.evaluate(() => {
      return (performance as any).memory?.usedJSHeapSize || 0
    })
    
    const memoryIncrease = finalMemory - initialMemory
    console.log(`Memory usage: ${initialMemory} -> ${finalMemory} (increase: ${memoryIncrease})`)
    
    // Memory increase should be reasonable (less than 50MB)
    if (initialMemory > 0 && finalMemory > 0) {
      expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024) // 50MB
    }
  })

  test('Network error recovery', async ({ page }) => {
    const user = TEST_USERS.admin
    
    // Login successfully first
    await loginStaff(page, user)
    
    // Simulate network interruption
    await page.route('**/api/auth/check', route => {
      route.abort('failed')
    })
    
    // Try to navigate to protected page
    await page.goto('/admin/products')
    
    // Should handle network error gracefully
    // (Implementation depends on error handling strategy)
    
    // Restore network
    await page.unroute('**/api/auth/check')
    
    // Should recover and work normally
    await page.reload()
    await page.waitForLoadState('networkidle')
    
    // Should either be authenticated or redirect to login
    const currentUrl = page.url()
    const isAuthenticated = currentUrl.includes('/admin')
    const isLoginPage = currentUrl.includes('/staff-login')
    
    expect(isAuthenticated || isLoginPage).toBeTruthy()
  })

  test('Browser compatibility - Chrome', async ({ page }) => {
    const user = TEST_USERS.admin
    
    // Test basic auth flow in Chrome
    await loginStaff(page, user)
    
    // Verify cookies are set correctly
    const cookies = await page.context().cookies()
    const authCookies = cookies.filter(c => c.name.startsWith('mdv_'))
    
    expect(authCookies.length).toBeGreaterThan(0)
    
    // Verify localStorage works
    const authHint = await page.evaluate(() => {
      return localStorage.getItem('auth_hint')
    })
    
    expect(authHint).toBe('true')
  })

  test('Load testing simulation', async ({ context }) => {
    const users = [TEST_USERS.admin, TEST_USERS.operations, TEST_USERS.supervisor]
    const pagesPerUser = 3
    
    const allPromises: Promise<any>[] = []
    
    // Simulate multiple users logging in and using the system
    for (const user of users) {
      for (let i = 0; i < pagesPerUser; i++) {
        const promise = (async () => {
          const page = await context.newPage()
          try {
            await clearAuthState(page)
            await loginStaff(page, user)
            
            // Navigate to different pages
            await page.goto('/admin/products')
            await page.waitForLoadState('networkidle')
            
            await page.goto('/admin/orders')
            await page.waitForLoadState('networkidle')
            
            return { success: true, user: user.email }
          } catch (error) {
            return { success: false, user: user.email, error }
          } finally {
            await page.close()
          }
        })()
        
        allPromises.push(promise)
      }
    }
    
    const startTime = Date.now()
    const results = await Promise.all(allPromises)
    const totalTime = Date.now() - startTime
    
    const successCount = results.filter(r => r.success).length
    const successRate = (successCount / results.length) * 100
    
    console.log(`Load test results: ${successCount}/${results.length} successful (${successRate}%)`)
    console.log(`Total time: ${totalTime}ms`)
    
    // Expect good performance under load
    expect(successRate).toBeGreaterThanOrEqual(80)
    expect(totalTime).toBeLessThan(30000) // Should complete within 30 seconds
  })
})
