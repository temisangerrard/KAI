/**
 * Integration test for token issuance API error handling consistency
 * Verifies that the API returns consistent error responses
 */

import { NextRequest } from 'next/server';
import { POST, PUT } from '@/app/api/admin/tokens/issue/route';

// Mock Firebase dependencies
jest.mock('firebase/firestore', () => ({
  doc: jest.fn(),
  getDoc: jest.fn(),
  setDoc: jest.fn(),
  updateDoc: jest.fn(),
  addDoc: jest.fn(),
  collection: jest.fn(),
  Timestamp: {
    now: jest.fn(() => ({ seconds: 1234567890, nanoseconds: 0 }))
  },
  runTransaction: jest.fn()
}));

jest.mock('@/lib/db/database', () => ({
  db: {}
}));

describe('Token Issuance API Error Handling', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/admin/tokens/issue', () => {
    it('should return consistent unauthorized error when no user ID provided', async () => {
      const mockRequest = {
        headers: {
          get: jest.fn().mockReturnValue(null)
        },
        json: jest.fn().mockResolvedValue({
          userId: 'test-user',
          amount: 100,
          reason: 'Test',
          adminId: 'admin-123',
          adminName: 'Admin User'
        })
      } as unknown as NextRequest;

      const response = await POST(mockRequest);
      const responseData = await response.json();

      expect(response.status).toBe(401);
      expect(responseData).toEqual({
        success: false,
        error: 'Unauthorized',
        message: 'Authentication required. Please ensure you are logged in.'
      });
    });

    it('should return consistent unauthorized error when user is not admin', async () => {
      // Mock Firebase getDoc to return non-admin user
      const { getDoc } = require('firebase/firestore');
      getDoc.mockResolvedValue({
        exists: () => false
      });

      const mockRequest = {
        headers: {
          get: jest.fn().mockReturnValue('non-admin-user')
        },
        json: jest.fn().mockResolvedValue({
          userId: 'test-user',
          amount: 100,
          reason: 'Test',
          adminId: 'admin-123',
          adminName: 'Admin User'
        })
      } as unknown as NextRequest;

      const response = await POST(mockRequest);
      const responseData = await response.json();

      expect(response.status).toBe(401);
      expect(responseData).toEqual({
        success: false,
        error: 'Unauthorized',
        message: 'Access denied. Admin privileges required.'
      });
    });

    it('should return consistent validation error for missing fields', async () => {
      // Mock Firebase getDoc to return admin user
      const { getDoc } = require('firebase/firestore');
      getDoc.mockResolvedValue({
        exists: () => true,
        data: () => ({ isActive: true })
      });

      const mockRequest = {
        headers: {
          get: jest.fn().mockReturnValue('admin-user')
        },
        json: jest.fn().mockResolvedValue({
          // Missing required fields
          userId: '',
          amount: 100,
          reason: 'Test'
        })
      } as unknown as NextRequest;

      const response = await POST(mockRequest);
      const responseData = await response.json();

      expect(response.status).toBe(400);
      expect(responseData).toEqual({
        success: false,
        error: 'Validation failed',
        message: 'Missing required fields: userId, amount, reason, adminId, adminName'
      });
    });

    it('should return consistent validation error for invalid amount', async () => {
      // Mock Firebase getDoc to return admin user
      const { getDoc } = require('firebase/firestore');
      getDoc.mockResolvedValue({
        exists: () => true,
        data: () => ({ isActive: true })
      });

      const mockRequest = {
        headers: {
          get: jest.fn().mockReturnValue('admin-user')
        },
        json: jest.fn().mockResolvedValue({
          userId: 'test-user',
          amount: -100, // Invalid negative amount
          reason: 'Test',
          adminId: 'admin-123',
          adminName: 'Admin User'
        })
      } as unknown as NextRequest;

      const response = await POST(mockRequest);
      const responseData = await response.json();

      expect(response.status).toBe(400);
      expect(responseData).toEqual({
        success: false,
        error: 'Validation failed',
        message: 'Amount must be positive'
      });
    });

    it('should return consistent not found error for non-existent user', async () => {
      // Mock Firebase getDoc to return admin user for auth, but non-existent target user
      const { getDoc } = require('firebase/firestore');
      getDoc
        .mockResolvedValueOnce({
          exists: () => true,
          data: () => ({ isActive: true })
        })
        .mockResolvedValueOnce({
          exists: () => false // Target user doesn't exist
        });

      const mockRequest = {
        headers: {
          get: jest.fn().mockReturnValue('admin-user')
        },
        json: jest.fn().mockResolvedValue({
          userId: 'non-existent-user',
          amount: 100,
          reason: 'Test',
          adminId: 'admin-123',
          adminName: 'Admin User'
        })
      } as unknown as NextRequest;

      const response = await POST(mockRequest);
      const responseData = await response.json();

      expect(response.status).toBe(404);
      expect(responseData).toEqual({
        success: false,
        error: 'User not found',
        message: 'User with ID non-existent-user does not exist'
      });
    });
  });

  describe('PUT /api/admin/tokens/issue', () => {
    it('should return consistent unauthorized error when no user ID provided', async () => {
      const mockRequest = {
        headers: {
          get: jest.fn().mockReturnValue(null)
        },
        json: jest.fn().mockResolvedValue({
          issuanceId: 'test-issuance',
          action: 'approve',
          adminId: 'admin-123',
          adminName: 'Admin User'
        })
      } as unknown as NextRequest;

      const response = await PUT(mockRequest);
      const responseData = await response.json();

      expect(response.status).toBe(401);
      expect(responseData).toEqual({
        success: false,
        error: 'Unauthorized',
        message: 'Authentication required. Please ensure you are logged in.'
      });
    });

    it('should return consistent validation error for invalid action', async () => {
      // Mock Firebase getDoc to return admin user
      const { getDoc } = require('firebase/firestore');
      getDoc.mockResolvedValue({
        exists: () => true,
        data: () => ({ isActive: true })
      });

      const mockRequest = {
        headers: {
          get: jest.fn().mockReturnValue('admin-user')
        },
        json: jest.fn().mockResolvedValue({
          issuanceId: 'test-issuance',
          action: 'invalid-action', // Invalid action
          adminId: 'admin-123',
          adminName: 'Admin User'
        })
      } as unknown as NextRequest;

      const response = await PUT(mockRequest);
      const responseData = await response.json();

      expect(response.status).toBe(400);
      expect(responseData).toEqual({
        success: false,
        error: 'Validation failed',
        message: 'Action must be either "approve" or "reject"'
      });
    });
  });
});