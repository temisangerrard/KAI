/**
 * Admin Error Handling Utilities
 * Provides consistent error handling patterns for admin operations
 */

export interface AdminError {
  type: 'auth' | 'permission' | 'network' | 'validation' | 'not_found' | 'server' | 'unknown'
  message: string
  originalError?: Error
  shouldRedirect?: boolean
  redirectPath?: string
}

export class AdminErrorHandler {
  /**
   * Parse and categorize errors from admin operations
   */
  static parseError(error: unknown): AdminError {
    if (error instanceof Error) {
      const message = error.message.toLowerCase()
      
      // Authentication errors
      if (message.includes('unauthorized') || 
          message.includes('authentication') || 
          message.includes('not authenticated') ||
          message.includes('invalid token')) {
        return {
          type: 'auth',
          message: 'Authentication required. Please log in again.',
          originalError: error,
          shouldRedirect: true,
          redirectPath: '/admin/login'
        }
      }
      
      // Permission errors
      if (message.includes('admin privileges required') || 
          message.includes('permission denied') || 
          message.includes('access denied') ||
          message.includes('forbidden')) {
        return {
          type: 'permission',
          message: 'You don\'t have permission to perform this action.',
          originalError: error,
          shouldRedirect: false
        }
      }
      
      // Network errors
      if (message.includes('network') || 
          message.includes('offline') || 
          message.includes('connection') ||
          message.includes('timeout') ||
          message.includes('fetch')) {
        return {
          type: 'network',
          message: 'Network error. Please check your internet connection and try again.',
          originalError: error,
          shouldRedirect: false
        }
      }
      
      // Validation errors
      if (message.includes('validation') || 
          message.includes('invalid') || 
          message.includes('required') ||
          message.includes('must be')) {
        return {
          type: 'validation',
          message: error.message,
          originalError: error,
          shouldRedirect: false
        }
      }
      
      // Not found errors
      if (message.includes('not found') || 
          message.includes('does not exist') ||
          message.includes('missing')) {
        return {
          type: 'not_found',
          message: error.message,
          originalError: error,
          shouldRedirect: false
        }
      }
      
      // Server errors
      if (message.includes('server error') || 
          message.includes('internal error') ||
          message.includes('database error')) {
        return {
          type: 'server',
          message: 'Server error. Please try again later.',
          originalError: error,
          shouldRedirect: false
        }
      }
      
      // Default to unknown with original message
      return {
        type: 'unknown',
        message: error.message,
        originalError: error,
        shouldRedirect: false
      }
    }
    
    // Non-Error objects
    return {
      type: 'unknown',
      message: 'An unexpected error occurred',
      shouldRedirect: false
    }
  }
  
  /**
   * Get user-friendly error messages for toast notifications
   */
  static getToastMessage(error: AdminError): { title: string; description: string } {
    switch (error.type) {
      case 'auth':
        return {
          title: 'Authentication Required',
          description: 'Please log in again to continue.'
        }
      
      case 'permission':
        return {
          title: 'Access Denied',
          description: 'You don\'t have permission to perform this action.'
        }
      
      case 'network':
        return {
          title: 'Network Error',
          description: 'Please check your internet connection and try again.'
        }
      
      case 'validation':
        return {
          title: 'Validation Error',
          description: error.message
        }
      
      case 'not_found':
        return {
          title: 'Not Found',
          description: error.message
        }
      
      case 'server':
        return {
          title: 'Server Error',
          description: 'Something went wrong on our end. Please try again later.'
        }
      
      default:
        return {
          title: 'Error',
          description: error.message
        }
    }
  }
  
  /**
   * Get appropriate retry delay based on error type
   */
  static getRetryDelay(error: AdminError): number {
    switch (error.type) {
      case 'network':
        return 3000 // 3 seconds for network errors
      case 'server':
        return 5000 // 5 seconds for server errors
      case 'auth':
        return 2000 // 2 seconds before redirect
      default:
        return 0 // No automatic retry
    }
  }
  
  /**
   * Determine if error should show retry button
   */
  static shouldShowRetry(error: AdminError): boolean {
    return ['network', 'server', 'unknown'].includes(error.type)
  }
  
  /**
   * Log error with appropriate level and context
   */
  static logError(error: AdminError, context: string): void {
    const logData = {
      type: error.type,
      message: error.message,
      context,
      timestamp: new Date().toISOString(),
      originalError: error.originalError?.stack
    }
    
    if (error.type === 'server' || error.type === 'unknown') {
      console.error(`[ADMIN_ERROR] ${context}:`, logData)
    } else {
      console.warn(`[ADMIN_ERROR] ${context}:`, logData)
    }
  }
}

/**
 * Hook for handling admin errors consistently
 */
export function useAdminErrorHandler() {
  const handleError = (error: unknown, context: string) => {
    const adminError = AdminErrorHandler.parseError(error)
    AdminErrorHandler.logError(adminError, context)
    return adminError
  }
  
  return { handleError }
}