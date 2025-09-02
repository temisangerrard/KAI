/**
 * CDP Retry Service
 * 
 * Implements CDP-aware retry mechanisms with exponential backoff,
 * rate limiting handling, and authentication error recovery
 */

import { WalletErrorService, WalletError, RetryStrategy, CDPErrorContext } from './wallet-error-service'

export interface RetryOptions {
  maxRetries?: number
  baseDelay?: number
  maxDelay?: number
  backoffMultiplier?: number
  jitterEnabled?: boolean
  onRetry?: (attempt: number, error: WalletError, delay: number) => void
  onMaxRetriesReached?: (error: WalletError) => void
  abortSignal?: AbortSignal
}

export interface RetryState {
  attempt: number
  totalAttempts: number
  lastError: WalletError | null
  isRetrying: boolean
  nextRetryAt: Date | null
  aborted: boolean
}

export interface CDPRetryResult<T> {
  success: boolean
  data?: T
  error?: WalletError
  retryState: RetryState
}

/**
 * CDP Retry Service
 * Provides intelligent retry mechanisms for CDP operations
 */
export class CDPRetryService {
  private static activeRetries = new Map<string, RetryState>()

  /**
   * Execute operation with CDP-aware retry logic
   */
  static async executeWithRetry<T>(
    operation: () => Promise<T>,
    context: CDPErrorContext,
    options: RetryOptions = {}
  ): Promise<CDPRetryResult<T>> {
    const operationId = this.generateOperationId(context)
    
    // Initialize retry state
    const retryState: RetryState = {
      attempt: 0,
      totalAttempts: 0,
      lastError: null,
      isRetrying: false,
      nextRetryAt: null,
      aborted: false
    }

    this.activeRetries.set(operationId, retryState)

    try {
      const result = await this.executeWithRetryInternal(
        operation,
        context,
        options,
        retryState
      )

      this.activeRetries.delete(operationId)
      return result
    } catch (error) {
      this.activeRetries.delete(operationId)
      throw error
    }
  }

  /**
   * Internal retry execution logic
   */
  private static async executeWithRetryInternal<T>(
    operation: () => Promise<T>,
    context: CDPErrorContext,
    options: RetryOptions,
    retryState: RetryState
  ): Promise<CDPRetryResult<T>> {
    const {
      maxRetries = 3,
      baseDelay = 1000,
      maxDelay = 10000,
      backoffMultiplier = 2,
      jitterEnabled = true,
      onRetry,
      onMaxRetriesReached,
      abortSignal
    } = options

    while (retryState.attempt <= maxRetries) {
      // Check if operation was aborted
      if (abortSignal?.aborted || retryState.aborted) {
        retryState.aborted = true
        return {
          success: false,
          error: WalletErrorService.handleApiError(
            new Error('Operation aborted'),
            context
          ),
          retryState
        }
      }

      try {
        retryState.totalAttempts++
        
        // Execute the operation
        const data = await operation()
        
        return {
          success: true,
          data,
          retryState
        }
      } catch (error) {
        // Handle and categorize the error
        const walletError = WalletErrorService.handleApiError(error, context)
        retryState.lastError = walletError
        
        // Log the error
        WalletErrorService.logError(
          walletError,
          `Retry attempt ${retryState.attempt + 1}/${maxRetries + 1} for ${context.operation}`
        )

        // Check if we should retry
        const strategy = WalletErrorService.getRetryStrategy(walletError)
        const shouldRetry = this.shouldRetryWithStrategy(
          walletError,
          retryState.attempt,
          strategy,
          maxRetries
        )

        if (!shouldRetry) {
          // Max retries reached or non-retryable error
          if (onMaxRetriesReached) {
            onMaxRetriesReached(walletError)
          }

          return {
            success: false,
            error: walletError,
            retryState
          }
        }

        // Calculate retry delay
        const delay = this.calculateRetryDelayWithStrategy(
          retryState.attempt,
          strategy,
          { baseDelay, maxDelay, backoffMultiplier, jitterEnabled }
        )

        retryState.attempt++
        retryState.isRetrying = true
        retryState.nextRetryAt = new Date(Date.now() + delay)

        // Call retry callback
        if (onRetry) {
          onRetry(retryState.attempt, walletError, delay)
        }

        // Wait before retrying
        await this.delay(delay, abortSignal)

        retryState.isRetrying = false
        retryState.nextRetryAt = null
      }
    }

    // This should not be reached, but handle it just in case
    return {
      success: false,
      error: retryState.lastError || WalletErrorService.handleApiError(
        new Error('Max retries exceeded'),
        context
      ),
      retryState
    }
  }

  /**
   * Execute operation with manual refresh capability
   */
  static async executeWithManualRefresh<T>(
    operation: () => Promise<T>,
    context: CDPErrorContext,
    refreshTrigger?: () => void
  ): Promise<T> {
    try {
      return await operation()
    } catch (error) {
      const walletError = WalletErrorService.handleApiError(error, context)
      
      // For certain errors, suggest manual refresh
      if (this.shouldSuggestManualRefresh(walletError)) {
        if (refreshTrigger) {
          refreshTrigger()
        }
        
        // Enhance error message with refresh suggestion
        walletError.userMessage += ' Try using the refresh button to reload data.'
      }
      
      throw walletError
    }
  }

  /**
   * Handle CDP rate limiting with intelligent backoff
   */
  static async handleRateLimit(
    operation: () => Promise<any>,
    context: CDPErrorContext,
    rateLimitInfo?: {
      resetTime?: number
      remainingRequests?: number
      windowSize?: number
    }
  ): Promise<any> {
    const rateLimitDelay = this.calculateRateLimitDelay(rateLimitInfo)
    
    if (rateLimitDelay > 0) {
      console.log(`Rate limit detected, waiting ${rateLimitDelay}ms before retry`)
      await this.delay(rateLimitDelay)
    }

    return this.executeWithRetry(operation, context, {
      maxRetries: 2,
      baseDelay: 5000,
      maxDelay: 30000,
      backoffMultiplier: 2.5,
      jitterEnabled: true
    })
  }

  /**
   * Handle CDP authentication errors with re-authentication
   */
  static async handleAuthError(
    operation: () => Promise<any>,
    context: CDPErrorContext,
    reAuthCallback?: () => Promise<void>
  ): Promise<any> {
    try {
      return await operation()
    } catch (error) {
      const walletError = WalletErrorService.handleApiError(error, context)
      
      // If it's an auth error and we have a re-auth callback, try re-authenticating
      if (walletError.code === 'CDP_AUTH_ERROR' && reAuthCallback) {
        try {
          await reAuthCallback()
          // Retry the operation after re-authentication
          return await operation()
        } catch (reAuthError) {
          // Re-authentication failed, throw original error
          throw walletError
        }
      }
      
      throw walletError
    }
  }

  /**
   * Create a retry-enabled version of a function
   */
  static withRetry<T extends any[], R>(
    fn: (...args: T) => Promise<R>,
    defaultContext: Partial<CDPErrorContext>,
    defaultOptions?: RetryOptions
  ) {
    return async (...args: T): Promise<R> => {
      const context: CDPErrorContext = {
        operation: fn.name || 'anonymous',
        ...defaultContext
      }

      const result = await this.executeWithRetry(
        () => fn(...args),
        context,
        defaultOptions
      )

      if (result.success) {
        return result.data!
      } else {
        throw result.error
      }
    }
  }

  /**
   * Get retry state for an operation
   */
  static getRetryState(operationId: string): RetryState | null {
    return this.activeRetries.get(operationId) || null
  }

  /**
   * Abort a retry operation
   */
  static abortRetry(operationId: string): void {
    const retryState = this.activeRetries.get(operationId)
    if (retryState) {
      retryState.aborted = true
    }
  }

  /**
   * Clear all active retries
   */
  static clearAllRetries(): void {
    for (const [operationId, retryState] of this.activeRetries.entries()) {
      retryState.aborted = true
    }
    this.activeRetries.clear()
  }

  /**
   * Get statistics about active retries
   */
  static getRetryStatistics(): {
    activeRetries: number
    totalAttempts: number
    averageAttempts: number
  } {
    const states = Array.from(this.activeRetries.values())
    const totalAttempts = states.reduce((sum, state) => sum + state.totalAttempts, 0)
    
    return {
      activeRetries: states.length,
      totalAttempts,
      averageAttempts: states.length > 0 ? totalAttempts / states.length : 0
    }
  }

  /**
   * Generate unique operation ID
   */
  private static generateOperationId(context: CDPErrorContext): string {
    const timestamp = Date.now()
    const random = Math.random().toString(36).substring(2, 8)
    return `${context.operation}_${context.network || 'unknown'}_${timestamp}_${random}`
  }

  /**
   * Check if should retry with strategy
   */
  private static shouldRetryWithStrategy(
    error: WalletError,
    currentAttempt: number,
    strategy: RetryStrategy,
    maxRetries: number
  ): boolean {
    if (!error.retryable || !strategy.shouldRetry) {
      return false
    }

    return currentAttempt < Math.min(strategy.maxRetries, maxRetries)
  }

  /**
   * Calculate retry delay with strategy
   */
  private static calculateRetryDelayWithStrategy(
    attempt: number,
    strategy: RetryStrategy,
    overrides: {
      baseDelay?: number
      maxDelay?: number
      backoffMultiplier?: number
      jitterEnabled?: boolean
    }
  ): number {
    const baseDelay = overrides.baseDelay ?? strategy.baseDelay
    const maxDelay = overrides.maxDelay ?? strategy.maxDelay
    const backoffMultiplier = overrides.backoffMultiplier ?? strategy.backoffMultiplier
    const jitterEnabled = overrides.jitterEnabled ?? strategy.jitterEnabled

    let delay = Math.min(
      baseDelay * Math.pow(backoffMultiplier, attempt),
      maxDelay
    )

    if (jitterEnabled) {
      delay += Math.random() * 1000
    }

    return delay
  }

  /**
   * Calculate rate limit delay
   */
  private static calculateRateLimitDelay(rateLimitInfo?: {
    resetTime?: number
    remainingRequests?: number
    windowSize?: number
  }): number {
    if (!rateLimitInfo) {
      return 5000 // Default 5 second delay
    }

    const { resetTime, remainingRequests, windowSize } = rateLimitInfo

    // If we have reset time, wait until then
    if (resetTime) {
      const now = Date.now()
      const delay = Math.max(0, resetTime - now)
      return Math.min(delay, 60000) // Cap at 1 minute
    }

    // If we have remaining requests info, calculate proportional delay
    if (remainingRequests !== undefined && windowSize) {
      if (remainingRequests === 0) {
        return 10000 // 10 seconds if no requests remaining
      }
      
      // Proportional delay based on remaining requests
      const ratio = remainingRequests / windowSize
      return Math.max(1000, (1 - ratio) * 15000) // 1-15 seconds
    }

    return 5000 // Default delay
  }

  /**
   * Check if should suggest manual refresh
   */
  private static shouldSuggestManualRefresh(error: WalletError): boolean {
    return (
      error.category === 'network' ||
      error.code === 'CDP_SERVER_ERROR' ||
      error.code === 'NETWORK_TIMEOUT' ||
      error.code === 'NETWORK_CONNECTION'
    )
  }

  /**
   * Delay utility with abort signal support
   */
  private static delay(ms: number, abortSignal?: AbortSignal): Promise<void> {
    return new Promise((resolve, reject) => {
      if (abortSignal?.aborted) {
        reject(new Error('Aborted'))
        return
      }

      const timeout = setTimeout(() => {
        resolve()
      }, ms)

      if (abortSignal) {
        abortSignal.addEventListener('abort', () => {
          clearTimeout(timeout)
          reject(new Error('Aborted'))
        })
      }
    })
  }
}

export default CDPRetryService