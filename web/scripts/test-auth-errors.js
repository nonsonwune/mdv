#!/usr/bin/env node

/**
 * Auth Error Test Runner
 * 
 * Comprehensive test runner for auth error scenarios with browser simulation
 * and detailed reporting.
 */

const { spawn } = require('child_process')
const path = require('path')
const fs = require('fs')

// Test configurations for different scenarios
const testConfigs = {
  unit: {
    name: 'Unit Tests',
    pattern: '__tests__/auth-error-scenarios.test.tsx',
    timeout: 30000,
  },
  integration: {
    name: 'Integration Tests', 
    pattern: '__tests__/auth-error-integration.test.tsx',
    timeout: 60000,
  },
  components: {
    name: 'Component Tests',
    pattern: 'components/auth/__tests__/*.test.tsx',
    timeout: 30000,
  },
  all: {
    name: 'All Auth Error Tests',
    pattern: '**/*auth-error*.test.{js,jsx,ts,tsx}',
    timeout: 120000,
  }
}

// Browser simulation configurations
const browserConfigs = {
  chrome: {
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
    features: ['localStorage', 'fetch', 'clipboard'],
  },
  firefox: {
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:89.0) Gecko/20100101 Firefox/89.0',
    features: ['localStorage', 'fetch', 'clipboard'],
  },
  safari: {
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.1.1 Safari/605.1.15',
    features: ['localStorage', 'fetch'], // No clipboard in older Safari
  },
  edge: {
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36 Edg/91.0.864.59',
    features: ['localStorage', 'fetch', 'clipboard'],
  },
  mobile: {
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.1.1 Mobile/15E148 Safari/604.1',
    features: ['localStorage', 'fetch'],
    viewport: { width: 375, height: 667 },
  }
}

// Network condition simulations
const networkConfigs = {
  fast: { effectiveType: '4g', downlink: 10, rtt: 50 },
  slow: { effectiveType: '3g', downlink: 1.5, rtt: 150 },
  offline: { effectiveType: 'slow-2g', downlink: 0, rtt: 1000 },
}

class AuthErrorTestRunner {
  constructor() {
    this.results = []
    this.startTime = Date.now()
  }

  async runTests(testType = 'all', options = {}) {
    console.log('🧪 Starting Auth Error Test Suite')
    console.log('=' * 50)
    
    const config = testConfigs[testType]
    if (!config) {
      throw new Error(`Unknown test type: ${testType}`)
    }

    console.log(`📋 Running: ${config.name}`)
    console.log(`🎯 Pattern: ${config.pattern}`)
    console.log(`⏱️  Timeout: ${config.timeout}ms`)
    console.log('')

    // Run tests for each browser if specified
    if (options.browsers) {
      for (const browser of options.browsers) {
        await this.runBrowserTests(config, browser, options)
      }
    } else {
      await this.runSingleTest(config, options)
    }

    this.printSummary()
  }

  async runBrowserTests(config, browserName, options) {
    const browserConfig = browserConfigs[browserName]
    if (!browserConfig) {
      console.warn(`⚠️  Unknown browser: ${browserName}`)
      return
    }

    console.log(`🌐 Testing with ${browserName}`)
    console.log(`   User Agent: ${browserConfig.userAgent.substring(0, 60)}...`)
    console.log(`   Features: ${browserConfig.features.join(', ')}`)
    
    if (browserConfig.viewport) {
      console.log(`   Viewport: ${browserConfig.viewport.width}x${browserConfig.viewport.height}`)
    }
    
    console.log('')

    // Set environment variables for browser simulation
    const env = {
      ...process.env,
      TEST_BROWSER: browserName,
      TEST_USER_AGENT: browserConfig.userAgent,
      TEST_FEATURES: browserConfig.features.join(','),
    }

    if (browserConfig.viewport) {
      env.TEST_VIEWPORT_WIDTH = browserConfig.viewport.width.toString()
      env.TEST_VIEWPORT_HEIGHT = browserConfig.viewport.height.toString()
    }

    await this.runSingleTest(config, { ...options, env, browser: browserName })
  }

  async runSingleTest(config, options = {}) {
    return new Promise((resolve, reject) => {
      const jestArgs = [
        '--config', 'jest.auth-errors.config.js',
        '--testPathPattern', config.pattern,
        '--testTimeout', config.timeout.toString(),
        '--verbose',
      ]

      if (options.coverage) {
        jestArgs.push('--coverage')
      }

      if (options.watch) {
        jestArgs.push('--watch')
      }

      if (options.updateSnapshots) {
        jestArgs.push('--updateSnapshot')
      }

      const jest = spawn('npx', ['jest', ...jestArgs], {
        stdio: 'pipe',
        env: options.env || process.env,
        cwd: process.cwd(),
      })

      let output = ''
      let errorOutput = ''

      jest.stdout.on('data', (data) => {
        const text = data.toString()
        output += text
        if (!options.quiet) {
          process.stdout.write(text)
        }
      })

      jest.stderr.on('data', (data) => {
        const text = data.toString()
        errorOutput += text
        if (!options.quiet) {
          process.stderr.write(text)
        }
      })

      jest.on('close', (code) => {
        const result = {
          config: config.name,
          browser: options.browser || 'default',
          success: code === 0,
          output,
          errorOutput,
          duration: Date.now() - this.startTime,
        }

        this.results.push(result)

        if (code === 0) {
          console.log(`✅ ${config.name} ${options.browser ? `(${options.browser})` : ''} passed`)
        } else {
          console.log(`❌ ${config.name} ${options.browser ? `(${options.browser})` : ''} failed`)
        }

        console.log('')
        resolve(result)
      })

      jest.on('error', (error) => {
        console.error(`💥 Failed to start Jest: ${error.message}`)
        reject(error)
      })
    })
  }

  printSummary() {
    const endTime = Date.now()
    const totalDuration = endTime - this.startTime

    console.log('📊 Test Summary')
    console.log('=' * 50)
    console.log(`⏱️  Total Duration: ${(totalDuration / 1000).toFixed(2)}s`)
    console.log(`🧪 Total Tests: ${this.results.length}`)
    
    const passed = this.results.filter(r => r.success).length
    const failed = this.results.filter(r => !r.success).length
    
    console.log(`✅ Passed: ${passed}`)
    console.log(`❌ Failed: ${failed}`)
    console.log('')

    if (failed > 0) {
      console.log('❌ Failed Tests:')
      this.results
        .filter(r => !r.success)
        .forEach(result => {
          console.log(`   - ${result.config} ${result.browser !== 'default' ? `(${result.browser})` : ''}`)
        })
      console.log('')
    }

    // Generate report file
    this.generateReport()

    process.exit(failed > 0 ? 1 : 0)
  }

  generateReport() {
    const report = {
      timestamp: new Date().toISOString(),
      duration: Date.now() - this.startTime,
      results: this.results,
      summary: {
        total: this.results.length,
        passed: this.results.filter(r => r.success).length,
        failed: this.results.filter(r => !r.success).length,
      }
    }

    const reportPath = path.join(process.cwd(), 'test-results', 'auth-error-tests.json')
    
    // Ensure directory exists
    const reportDir = path.dirname(reportPath)
    if (!fs.existsSync(reportDir)) {
      fs.mkdirSync(reportDir, { recursive: true })
    }

    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2))
    console.log(`📄 Report saved to: ${reportPath}`)
  }
}

// CLI interface
async function main() {
  const args = process.argv.slice(2)
  const testType = args[0] || 'all'
  
  const options = {
    coverage: args.includes('--coverage'),
    watch: args.includes('--watch'),
    updateSnapshots: args.includes('--updateSnapshot'),
    quiet: args.includes('--quiet'),
    browsers: [],
  }

  // Parse browser options
  const browserIndex = args.indexOf('--browsers')
  if (browserIndex !== -1 && args[browserIndex + 1]) {
    options.browsers = args[browserIndex + 1].split(',')
  }

  const runner = new AuthErrorTestRunner()
  
  try {
    await runner.runTests(testType, options)
  } catch (error) {
    console.error(`💥 Test runner failed: ${error.message}`)
    process.exit(1)
  }
}

// Help text
if (process.argv.includes('--help') || process.argv.includes('-h')) {
  console.log(`
Auth Error Test Runner

Usage: node scripts/test-auth-errors.js [testType] [options]

Test Types:
  unit         Run unit tests only
  integration  Run integration tests only  
  components   Run component tests only
  all          Run all auth error tests (default)

Options:
  --coverage           Generate coverage report
  --watch             Watch mode
  --updateSnapshot    Update snapshots
  --quiet             Suppress output
  --browsers <list>   Test specific browsers (chrome,firefox,safari,edge,mobile)
  --help, -h          Show this help

Examples:
  node scripts/test-auth-errors.js unit --coverage
  node scripts/test-auth-errors.js all --browsers chrome,firefox
  node scripts/test-auth-errors.js integration --watch
`)
  process.exit(0)
}

// Run if called directly
if (require.main === module) {
  main()
}

module.exports = AuthErrorTestRunner
