/**
 * Wallet Error Service
 * 
 * Comprehensive error handling service for CDP wallet operations
 * Provides error categorization, retry strategies, and user-friendly messaging
 */

export interface WalletError {
  code: string
  message: string
  userMessage: string
  recoverable: boolean
  retryable: boolean
  category: 'network' | 'cdp' | 'user' | 'system'
  severity: 'low' | 'medium' | 'high' | 'critical'
  context?: Record<string, any>
  timestamp: Date
}

export interface RetryStrategy {
  shouldRetry: boolean
  maxRetries: number
  baseDelay: number
  maxDelay: number
  backoffMultiplier: number
  jitterEnabled: boolean
}

export interface CDPErrorContext {
  operation: string
  network?: string
  address?: string
  transactionHash?: string
  userOperationHash?: string
  blockNumber?: number
}

/**
 * Wallet Error Service
 * Handles CDP-specific errors and provides retry strategies
 */
export class WalletErrorService {
  private static readonly ERROR_PATTERNS = {
    // Network-related errors
    NETWORK_TIMEOUT: /timeout|timed out|request timeout/i,
    NETWORK_CONNECTION: /network|connection|fetch|ECONNREFUSED|ENOTFOUND/i,
    NETWORK_OFFLINE: /offline|no internet|disconnected/i,
    
    // CDP-specific errors
    CDP_RATE_LIMIT: /rate limit|too many requests|429/i,
    CDP_AUTH_ERROR: /unauthorized|authentication|invalid api key|401|403/i,
    CDP_SERVER_ERROR: /server error|internal error|500|502|503|504/i,
    CDP_INVALID_REQUEST: /invalid request|bad request|400/i,
    CDP_NOT_FOUND: /not found|404/i,
    
    // Blockchain-related errors
    INSUFFICIENT_FUNDS: /insufficient funds|insufficient balance/i,
    INVALID_ADDRESS: /invalid address|invalid recipient/i,
    TRANSACTION_FAILED: /transaction failed|execution reverted|revert/i,
    GAS_ESTIMATION_FAILED: /gas estimation failed|out of gas/i,
    NONCE_ERROR: /nonce|replacement transaction underpriced/i,
    
    // User operation errors
    USER_OP_FAILED: /user operation failed|useroperation/i,
    SMART_ACCOUNT_ERROR: /smart account|account abstraction/i,
    PAYMASTER_ERROR: /paymaster|gas sponsorship/i,
  }

  private static readonly RETRY_STRATEGIES: Record<string, RetryStrategy> = {
    NETWORK_TIMEOUT: {
      shouldRetry: true,
      maxRetries: 3,
      baseDelay: 2000,
      maxDelay: 10000,
      backoffMultiplier: 2,
      jitterEnabled: true
    },
    NETWORK_CONNECTION: {
      shouldRetry: true,
      maxRetries: 5,
      baseDelay: 1000,
      maxDelay: 15000,
      backoffMultiplier: 2,
      jitterEnabled: true
    },
    CDP_RATE_LIMIT: {
      shouldRetry: true,
      maxRetries: 4,
      baseDelay: 5000,
      maxDelay: 30000,
      backoffMultiplier: 2.5,
      jitterEnabled: true
    },
    CDP_SERVER_ERROR: {
      shouldRetry: true,
      maxRetries: 3,
      baseDelay: 3000,
      maxDelay: 12000,
      backoffMultiplier: 2,
      jitterEnabled: true
    },
    TRANSACTION_FAILED: {
      shouldRetry: false,
      maxRetries: 0,
      baseDelay: 0,
      maxDelay: 0,
      backoffMultiplier: 1,
      jitterEnabled: false
    },
    DEFAULT: {
      shouldRetry: true,
      maxRetries: 2,
      baseDelay: 1500,
      maxDelay: 8000,
      backoffMultiplier: 2,
      jitterEnabled: true
    }
  }

  /**
   * Handle and categorize CDP API errors
   */
  static handleApiError(error: unknown, context?: CDPErrorContext): WalletError {
    const timestamp = new Date()
    
    // Handle CDP-specific error objects
    if (this.isCDPError(error)) {
      return this.handleCDPError(error, context, timestamp)
    }

    // Handle standard JavaScript errors
    if (error instanceof Error) {
      return this.handleStandardError(error, context, timestamp)
    }

    // Handle unknown error types
    return this.createError(
      'UNKNOWN_ERROR',
      'Unknown error occurred',
      'An unexpected error occurred. Please try again.',
      true,
      true,
      'system',
      'medium',
      context,
      timestamp
    )
  }

  /**
   * Get retry strategy for a specific error
   */
  static getRetryStrategy(error: WalletError): RetryStrategy {
    // Check for specific error patterns
    for (const [pattern, strategy] of Object.entries(this.RETRY_STRATEGIES)) {
      if (pattern === 'DEFAULT') continue
      
      const regex = this.ERROR_PATTERNS[pattern as keyof typeof this.ERROR_PATTERNS]
      if (regex && (regex.test(error.message) || regex.test(error.code))) {
        return strategy
      }
    }

    // Return default strategy
    return this.RETRY_STRATEGIES.DEFAULT
  }

  /**
   * Calculate retry delay with exponential backoff and jitter
   */
  static calculateRetryDelay(
    retryCount: number,
    strategy: RetryStrategy
  ): number {
    if (!strategy.shouldRetry || retryCount >= strategy.maxRetries) {
      return 0
    }

    let delay = Math.min(
      strategy.baseDelay * Math.pow(strategy.backoffMultiplier, retryCount),
      strategy.maxDelay
    )

    // Add jitter to prevent thundering herd
    if (strategy.jitterEnabled) {
      delay += Math.random() * 1000
    }

    return delay
  }

  /**
   * Log error with context for debugging
   */
  static logError(error: WalletError, context?: string): void {
    const logData = {
      timestamp: error.timestamp.toISOString(),
      code: error.code,
      message: error.message,
      category: error.category,
      severity: error.severity,
      recoverable: error.recoverable,
      retryable: error.retryable,
      context: error.context,
      additionalContext: context
    }

    if (error.severity === 'critical' || error.severity === 'high') {
      console.error('Wallet Error (High/Critical):', logData)
    } else {
      console.warn('Wallet Error:', logData)
    }

    // In production, you might want to send this to an error tracking service
    // like Sentry, LogRocket, or similar
  }

  /**
   * Check if error should trigger a retry
   */
  static shouldRetry(error: WalletError, currentRetryCount: number): boolean {
    if (!error.retryable) return false
    
    const strategy = this.getRetryStrategy(error)
    return strategy.shouldRetry && currentRetryCount < strategy.maxRetries
  }

  /**
   * Get user-friendly error message with action suggestions
   */
  static getUserMessage(error: WalletError, includeActions = true): string {
    let message = error.userMessage

    if (includeActions) {
      if (error.retryable) {
        message += ' You can try again.'
      }

      // Add specific action suggestions based on error type
      if (error.code === 'NETWORK_OFFLINE') {
        message += ' Please check your internet connection.'
      } else if (error.code === 'INSUFFICIENT_FUNDS') {
        message += ' Please add funds to your wallet.'
      } else if (error.code === 'INVALID_ADDRESS') {
        message += ' Please check the recipient address.'
      } else if (error.code === 'CDP_RATE_LIMIT') {
        message += ' Please wait a moment before trying again.'
      }
    }

    return message
  }

  /**
   * Create a standardized error object
   */
  private static createError(
    code: string,
    message: string,
    userMessage: string,
    recoverable: boolean,
    retryable: boolean,
    category: WalletError['category'],
    severity: WalletError['severity'],
    context?: CDPErrorContext,
    timestamp?: Date
  ): WalletError {
    return {
      code,
      message,
      userMessage,
      recoverable,
      retryable,
      category,
      severity,
      context,
      timestamp: timestamp || new Date()
    }
  }

  /**
   * Check if error is a CDP-specific error
   */
  private static isCDPError(error: any): boolean {
    return (
      error &&
      typeof error === 'object' &&
      (error.name === 'CDPError' || 
       error.constructor?.name === 'CDPError' ||
       error.type === 'CDP_ERROR' ||
       (error.code && typeof error.code === 'string' && error.code.startsWith('CDP_')))
    )
  }

  /**
   * Handle CDP-specific errors
   */
  private static handleCDPError(
    error: any,
    context?: CDPErrorContext,
    timestamp?: Date
  ): WalletError {
    const code = error.code || 'CDP_UNKNOWN_ERROR'
    const message = error.message || 'CDP operation failed'

    // Rate limiting errors
    if (this.ERROR_PATTERNS.CDP_RATE_LIMIT.test(message) || code === 'RATE_LIMIT') {
      return this.createError(
        'CDP_RATE_LIMIT',
        message,
        'Too many requests. Please wait a moment and try again.',
        true,
        true,
        'cdp',
        'medium',
        context,
        timestamp
      )
    }

    // Authentication errors
    if (this.ERROR_PATTERNS.CDP_AUTH_ERROR.test(message) || code === 'UNAUTHORIZED') {
      return this.createError(
        'CDP_AUTH_ERROR',
        message,
        'Authentication failed. Please reconnect your wallet.',
        true,
        false,
        'cdp',
        'high',
        context,
        timestamp
      )
    }

    // Server errors
    if (this.ERROR_PATTERNS.CDP_SERVER_ERROR.test(message) || code === 'SERVER_ERROR') {
      return this.createError(
        'CDP_SERVER_ERROR',
        message,
        'CDP service is temporarily unavailable. Please try again.',
        true,
        true,
        'cdp',
        'high',
        context,
        timestamp
      )
    }

    // Invalid request errors
    if (this.ERROR_PATTERNS.CDP_INVALID_REQUEST.test(message) || code === 'INVALID_REQUEST') {
      return this.createError(
        'CDP_INVALID_REQUEST',
        message,
        'Invalid request. Please check your input and try again.',
        false,
        false,
        'cdp',
        'medium',
        context,
        timestamp
      )
    }

    // Generic CDP error
    return this.createError(
      'CDP_ERROR',
      message,
      'CDP operation failed. Please try again.',
      true,
      true,
      'cdp',
      'medium',
      context,
      timestamp
    )
  }

  /**
   * Handle standard JavaScript errors
   */
  private static handleStandardError(
    error: Error,
    context?: CDPErrorContext,
    timestamp?: Date
  ): WalletError {
    const message = error.message || 'Unknown error'

    // Network timeout errors
    if (this.ERROR_PATTERNS.NETWORK_TIMEOUT.test(message)) {
      return this.createError(
        'NETWORK_TIMEOUT',
        message,
        'Request timed out. Please check your connection and try again.',
        true,
        true,
        'network',
        'medium',
        context,
        timestamp
      )
    }

    // Network connection errors
    if (this.ERROR_PATTERNS.NETWORK_CONNECTION.test(message)) {
      return this.createError(
        'NETWORK_CONNECTION',
        message,
        'Network connection failed. Please check your internet connection.',
        true,
        true,
        'network',
        'high',
        context,
        timestamp
      )
    }

    // Authentication errors (also check in standard errors)
    if (this.ERROR_PATTERNS.CDP_AUTH_ERROR.test(message)) {
      return this.createError(
        'CDP_AUTH_ERROR',
        message,
        'Authentication failed. Please reconnect your wallet.',
        true,
        false,
        'cdp',
        'high',
        context,
        timestamp
      )
    }

    // Insufficient funds
    if (this.ERROR_PATTERNS.INSUFFICIENT_FUNDS.test(message)) {
      return this.createError(
        'INSUFFICIENT_FUNDS',
        message,
        'Insufficient funds for this transaction.',
        false,
        false,
        'user',
        'medium',
        context,
        timestamp
      )
    }

    // Invalid address
    if (this.ERROR_PATTERNS.INVALID_ADDRESS.test(message)) {
      return this.createError(
        'INVALID_ADDRESS',
        message,
        'Invalid wallet address. Please check the address and try again.',
        false,
        false,
        'user',
        'medium',
        context,
        timestamp
      )
    }

    // Transaction failed
    if (this.ERROR_PATTERNS.TRANSACTION_FAILED.test(message)) {
      return this.createError(
        'TRANSACTION_FAILED',
        message,
        'Transaction failed. Please check your transaction details.',
        false,
        false,
        'user',
        'medium',
        context,
        timestamp
      )
    }

    // User operation errors
    if (this.ERROR_PATTERNS.USER_OP_FAILED.test(message)) {
      return this.createError(
        'USER_OPERATION_FAILED',
        message,
        'Smart account operation failed. Please try again.',
        true,
        true,
        'cdp',
        'medium',
        context,
        timestamp
      )
    }

    // Generic error
    return this.createError(
      'GENERIC_ERROR',
      message,
      'An error occurred. Please try again.',
      true,
      true,
      'system',
      'medium',
      context,
      timestamp
    )
  }

  /**
   * Create error context for CDP operations
   */
  static createContext(
    operation: string,
    options?: {
      network?: string
      address?: string
      transactionHash?: string
      userOperationHash?: string
      blockNumber?: number
      [key: string]: any
    }
  ): CDPErrorContext {
    return {
      operation,
      ...options
    }
  }

  /**
   * Check if error is recoverable
   */
  static isRecoverable(error: WalletError): boolean {
    return error.recoverable
  }

  /**
   * Check if error is retryable
   */
  static isRetryable(error: WalletError): boolean {
    return error.retryable
  }

  /**
   * Get error severity level
   */
  static getSeverity(error: WalletError): WalletError['severity'] {
    return error.severity
  }

  /**
   * Format error for display
   */
  static formatError(error: WalletError): string {
    return `[${error.code}] ${error.userMessage}`
  }
}

export default WalletErrorService