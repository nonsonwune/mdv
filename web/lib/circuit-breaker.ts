/**
 * Circuit Breaker Pattern Implementation for API Resilience
 * 
 * Prevents cascading failures by temporarily stopping requests to failing services
 * and allowing them to recover before resuming normal operation.
 */

export enum CircuitBreakerState {
  CLOSED = 'CLOSED',     // Normal operation
  OPEN = 'OPEN',         // Failing - reject requests immediately
  HALF_OPEN = 'HALF_OPEN' // Testing - allow limited requests to test recovery
}

export interface CircuitBreakerConfig {
  failureThreshold: number    // Number of failures before opening circuit
  recoveryTimeout: number     // Time to wait before trying again (ms)
  monitoringPeriod: number   // Time window for failure counting (ms)
  halfOpenMaxCalls: number   // Max calls allowed in half-open state
}

export interface CircuitBreakerMetrics {
  state: CircuitBreakerState
  failures: number
  successes: number
  lastFailureTime: number | null
  lastSuccessTime: number | null
  totalCalls: number
}

export class CircuitBreaker {
  private state: CircuitBreakerState = CircuitBreakerState.CLOSED
  private failures: number = 0
  private successes: number = 0
  private lastFailureTime: number | null = null
  private lastSuccessTime: number | null = null
  private totalCalls: number = 0
  private halfOpenCalls: number = 0

  constructor(private config: CircuitBreakerConfig) {}

  async execute<T>(operation: () => Promise<T>): Promise<T> {
    if (this.state === CircuitBreakerState.OPEN) {
      if (this.shouldAttemptReset()) {
        this.state = CircuitBreakerState.HALF_OPEN
        this.halfOpenCalls = 0
      } else {
        throw new Error('Circuit breaker is OPEN - service unavailable')
      }
    }

    if (this.state === CircuitBreakerState.HALF_OPEN) {
      if (this.halfOpenCalls >= this.config.halfOpenMaxCalls) {
        throw new Error('Circuit breaker HALF_OPEN - max calls exceeded')
      }
      this.halfOpenCalls++
    }

    this.totalCalls++

    try {
      const result = await operation()
      this.onSuccess()
      return result
    } catch (error) {
      this.onFailure()
      throw error
    }
  }

  private onSuccess(): void {
    this.successes++
    this.lastSuccessTime = Date.now()

    if (this.state === CircuitBreakerState.HALF_OPEN) {
      // If we've had enough successful calls, close the circuit
      if (this.halfOpenCalls >= this.config.halfOpenMaxCalls) {
        this.state = CircuitBreakerState.CLOSED
        this.failures = 0
      }
    } else if (this.state === CircuitBreakerState.CLOSED) {
      // Reset failure count on success in closed state
      this.failures = 0
    }
  }

  private onFailure(): void {
    this.failures++
    this.lastFailureTime = Date.now()

    if (this.state === CircuitBreakerState.HALF_OPEN) {
      // Any failure in half-open state opens the circuit
      this.state = CircuitBreakerState.OPEN
    } else if (this.state === CircuitBreakerState.CLOSED) {
      // Check if we should open the circuit
      if (this.failures >= this.config.failureThreshold) {
        this.state = CircuitBreakerState.OPEN
      }
    }
  }

  private shouldAttemptReset(): boolean {
    if (!this.lastFailureTime) return false
    return Date.now() - this.lastFailureTime >= this.config.recoveryTimeout
  }

  getMetrics(): CircuitBreakerMetrics {
    return {
      state: this.state,
      failures: this.failures,
      successes: this.successes,
      lastFailureTime: this.lastFailureTime,
      lastSuccessTime: this.lastSuccessTime,
      totalCalls: this.totalCalls
    }
  }

  reset(): void {
    this.state = CircuitBreakerState.CLOSED
    this.failures = 0
    this.successes = 0
    this.lastFailureTime = null
    this.lastSuccessTime = null
    this.totalCalls = 0
    this.halfOpenCalls = 0
  }
}

// Default configuration for API calls
export const defaultCircuitBreakerConfig: CircuitBreakerConfig = {
  failureThreshold: 5,        // Open after 5 failures
  recoveryTimeout: 60000,     // Wait 1 minute before trying again
  monitoringPeriod: 60000,    // Monitor failures over 1 minute window
  halfOpenMaxCalls: 3         // Allow 3 test calls in half-open state
}

// Global circuit breaker instance for API calls
export const apiCircuitBreaker = new CircuitBreaker(defaultCircuitBreakerConfig)
