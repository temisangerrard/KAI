/**
 * Vitest Setup File
 * 
 * Global setup for performance and integration tests
 */

import { beforeAll, afterAll, vi } from 'vitest'

// Global test setup
beforeAll(() => {
  // Mock console methods to reduce noise during tests
  vi.spyOn(console, 'log').mockImplementation(() => {})
  vi.spyOn(console, 'warn').mockImplementation(() => {})
  vi.spyOn(console, 'error').mockImplementation(() => {})
  
  // Set test environment variables
  process.env.NODE_ENV = 'test'
  process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID = 'test-project'
  
  // Mock global objects that might not be available in Node.js
  global.fetch = vi.fn()
  global.Request = vi.fn() as any
  global.Response = vi.fn() as any
})

afterAll(() => {
  // Restore console methods
  vi.restoreAllMocks()
})

// Increase timeout for performance tests
vi.setConfig({
  testTimeout: 30000,
  hookTimeout: 10000
})