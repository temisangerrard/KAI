/**
 * @jest-environment jsdom
 */

import { AdminErrorHandler } from '@/lib/utils/admin-error-handler'

describe('AdminErrorHandler', () => {
  describe('parseError', () => {
    it('should categorize authentication errors correctly', () => {
      const error = new Error('unauthorized access')
      const result = AdminErrorHandler.parseError(error)
      
      expect(result.type).toBe('auth')
      expect(result.message).toBe('Authentication required. Please log in again.')
      expect(result.shouldRedirect).toBe(true)
      expect(result.redirectPath).toBe('/admin/login')
    })

    it('should categorize permission errors correctly', () => {
      const error = new Error('Admin privileges required')
      const result = AdminErrorHandler.parseError(error)
      
      expect(result.type).toBe('permission')
      expect(result.message).toBe('You don\'t have permission to perform this action.')
      expect(result.shouldRedirect).toBe(false)
    })

    it('should categorize network errors correctly', () => {
      const error = new Error('network error: connection failed')
      const result = AdminErrorHandler.parseError(error)
      
      expect(result.type).toBe('network')
      expect(result.message).toBe('Network error. Please check your internet connection and try again.')
      expect(result.shouldRedirect).toBe(false)
    })

    it('should categorize not found errors correctly', () => {
      const error = new Error('Market not found')
      const result = AdminErrorHandler.parseError(error)
      
      expect(result.type).toBe('not_found')
      expect(result.message).toBe('Market not found')
      expect(result.shouldRedirect).toBe(false)
    })

    it('should handle unknown errors', () => {
      const error = new Error('Some random error')
      const result = AdminErrorHandler.parseError(error)
      
      expect(result.type).toBe('unknown')
      expect(result.message).toBe('Some random error')
      expect(result.shouldRedirect).toBe(false)
    })

    it('should handle non-Error objects', () => {
      const result = AdminErrorHandler.parseError('string error')
      
      expect(result.type).toBe('unknown')
      expect(result.message).toBe('An unexpected error occurred')
      expect(result.shouldRedirect).toBe(false)
    })
  })

  describe('getToastMessage', () => {
    it('should return appropriate toast messages for auth errors', () => {
      const adminError = {
        type: 'auth' as const,
        message: 'Authentication required. Please log in again.',
        shouldRedirect: true,
        redirectPath: '/admin/login'
      }
      
      const result = AdminErrorHandler.getToastMessage(adminError)
      
      expect(result.title).toBe('Authentication Required')
      expect(result.description).toBe('Please log in again to continue.')
    })

    it('should return appropriate toast messages for permission errors', () => {
      const adminError = {
        type: 'permission' as const,
        message: 'You don\'t have permission to perform this action.',
        shouldRedirect: false
      }
      
      const result = AdminErrorHandler.getToastMessage(adminError)
      
      expect(result.title).toBe('Access Denied')
      expect(result.description).toBe('You don\'t have permission to perform this action.')
    })

    it('should return appropriate toast messages for network errors', () => {
      const adminError = {
        type: 'network' as const,
        message: 'Network error. Please check your internet connection and try again.',
        shouldRedirect: false
      }
      
      const result = AdminErrorHandler.getToastMessage(adminError)
      
      expect(result.title).toBe('Network Error')
      expect(result.description).toBe('Please check your internet connection and try again.')
    })
  })

  describe('getRetryDelay', () => {
    it('should return appropriate delays for different error types', () => {
      expect(AdminErrorHandler.getRetryDelay({ type: 'network', message: '' })).toBe(3000)
      expect(AdminErrorHandler.getRetryDelay({ type: 'server', message: '' })).toBe(5000)
      expect(AdminErrorHandler.getRetryDelay({ type: 'auth', message: '' })).toBe(2000)
      expect(AdminErrorHandler.getRetryDelay({ type: 'unknown', message: '' })).toBe(0)
    })
  })

  describe('shouldShowRetry', () => {
    it('should return true for retryable errors', () => {
      expect(AdminErrorHandler.shouldShowRetry({ type: 'network', message: '' })).toBe(true)
      expect(AdminErrorHandler.shouldShowRetry({ type: 'server', message: '' })).toBe(true)
      expect(AdminErrorHandler.shouldShowRetry({ type: 'unknown', message: '' })).toBe(true)
    })

    it('should return false for non-retryable errors', () => {
      expect(AdminErrorHandler.shouldShowRetry({ type: 'auth', message: '' })).toBe(false)
      expect(AdminErrorHandler.shouldShowRetry({ type: 'permission', message: '' })).toBe(false)
      expect(AdminErrorHandler.shouldShowRetry({ type: 'validation', message: '' })).toBe(false)
    })
  })
})