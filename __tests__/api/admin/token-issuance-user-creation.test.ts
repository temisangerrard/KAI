/**
 * Test for token issuance with missing user documents
 * Verifies that the API can handle users who exist in Firebase Auth but not in Firestore
 */

import { NextRequest } from 'next/server';
import { POST } from '@/app/api/admin/tokens/issue/route';

// Mock Firebase dependencies
jest.mock('firebase/firestore', () => ({
  doc: jest.fn(),
  getDoc: jest.fn(),
  setDoc: jest.fn(),
  updateDoc: jest.fn(),
  addDoc: jest.fn(),
  collection: jest.fn(),
  serverTimestamp: jest.fn(() => ({ seconds: 1234567890, nanoseconds: 0 })),
  Timestamp: {
    now: jest.fn(() => ({ seconds: 1234567890, nanoseconds: 0 }))
  },
  runTransaction: jest.fn()
}));

jest.mock('@/lib/db/database', () => ({
  db: {}
}));

// Mock AdminAuthService
jest.mock('@/lib/auth/admin-auth', () => ({
  AdminAuthService: {
    verifyAdminAuth: jest.fn()
  }
}));

// Mock Firebase Admin
jest.mock('@/lib/firebase-admin', () => ({
  adminAuth: {
    getUser: jest.fn()
  }
}));

describe('Token Issuance User Creation Fix', () => {
  const { AdminAuthService } = require('@/lib/auth/admin-auth');
  const mockVerifyAdminAuth = AdminAuthService.verifyAdminAuth as jest.MockedFunction<typeof AdminAuthService.verifyAdminAuth>;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock admin authentication as successful
    mockVerifyAdminAuth.mockResolvedValue({
      isAdmin: true,
      userId: 'admin-user-123'
    });
  });

  it('should create missing user document when user exists in Firebase Auth but not Firestore', async () => {
    const { getDoc, setDoc, addDoc, runTransaction } = require('firebase/firestore');
    const { adminAuth } = require('@/lib/firebase-admin');

    // Mock user doesn't exist in Firestore users collection
    getDoc
      .mockResolvedValueOnce({ exists: () => false }) // User doesn't exist in users collection
      .mockResolvedValueOnce({ exists: () => false }); // User balance doesn't exist

    // Mock user exists in Firebase Auth
    adminAuth.getUser.mockResolvedValue({
      uid: 'firebase-user-123',
      email: 'user@example.com',
      displayName: 'Test User',
      photoURL: 'https://example.com/photo.jpg'
    });

    // Mock successful document creation
    addDoc.mockResolvedValue({ id: 'issuance-123' });
    runTransaction.mockResolvedValue(undefined);

    const mockRequest = {
      headers: {
        get: jest.fn().mockReturnValue('admin-user-123')
      },
      json: jest.fn().mockResolvedValue({
        userId: 'firebase-user-123',
        amount: 100,
        reason: 'Welcome bonus',
        adminId: 'admin-user-123',
        adminName: 'Admin User',
        requiresApproval: false
      })
    } as unknown as NextRequest;

    const response = await POST(mockRequest);
    const responseData = await response.json();

    // Verify successful response
    expect(response.status).toBe(200);
    expect(responseData.success).toBe(true);

    // Verify Firebase Auth was checked
    expect(adminAuth.getUser).toHaveBeenCalledWith('firebase-user-123');

    // Verify user document was created
    expect(setDoc).toHaveBeenCalledWith(
      expect.anything(), // doc reference
      expect.objectContaining({
        uid: 'firebase-user-123',
        email: 'user@example.com',
        displayName: 'Test User',
        photoURL: 'https://example.com/photo.jpg',
        tokenBalance: 2500,
        level: 1,
        totalPredictions: 0,
        correctPredictions: 0,
        streak: 0
      })
    );

    console.log('✅ Test passed: Missing user document created successfully');
  });

  it('should return 404 when user does not exist in Firebase Auth either', async () => {
    const { getDoc } = require('firebase/firestore');
    const { adminAuth } = require('@/lib/firebase-admin');

    // Mock user doesn't exist in Firestore users collection
    getDoc.mockResolvedValue({ exists: () => false });

    // Mock user doesn't exist in Firebase Auth either
    adminAuth.getUser.mockRejectedValue(new Error('User not found'));

    const mockRequest = {
      headers: {
        get: jest.fn().mockReturnValue('admin-user-123')
      },
      json: jest.fn().mockResolvedValue({
        userId: 'non-existent-user',
        amount: 100,
        reason: 'Test',
        adminId: 'admin-user-123',
        adminName: 'Admin User',
        requiresApproval: false
      })
    } as unknown as NextRequest;

    const response = await POST(mockRequest);
    const responseData = await response.json();

    // Verify 404 response
    expect(response.status).toBe(404);
    expect(responseData.success).toBe(false);
    expect(responseData.error).toBe('User not found');

    // Verify Firebase Auth was checked
    expect(adminAuth.getUser).toHaveBeenCalledWith('non-existent-user');

    console.log('✅ Test passed: Non-existent user properly rejected');
  });

  it('should work normally when user exists in both Firebase Auth and Firestore', async () => {
    const { getDoc, addDoc, runTransaction } = require('firebase/firestore');

    // Mock user exists in Firestore users collection
    getDoc
      .mockResolvedValueOnce({ exists: () => true }) // User exists in users collection
      .mockResolvedValueOnce({ exists: () => false }); // User balance doesn't exist

    // Mock successful document creation
    addDoc.mockResolvedValue({ id: 'issuance-123' });
    runTransaction.mockResolvedValue(undefined);

    const mockRequest = {
      headers: {
        get: jest.fn().mockReturnValue('admin-user-123')
      },
      json: jest.fn().mockResolvedValue({
        userId: 'existing-user-123',
        amount: 100,
        reason: 'Regular issuance',
        adminId: 'admin-user-123',
        adminName: 'Admin User',
        requiresApproval: false
      })
    } as unknown as NextRequest;

    const response = await POST(mockRequest);
    const responseData = await response.json();

    // Verify successful response
    expect(response.status).toBe(200);
    expect(responseData.success).toBe(true);

    console.log('✅ Test passed: Normal flow works for existing users');
  });
});