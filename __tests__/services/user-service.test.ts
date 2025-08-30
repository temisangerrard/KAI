/**
 * Unit tests for UserService
 * 
 * Tests wallet address-based CRUD operations for user profiles
 */

import { UserService, UserProfile } from '@/lib/services/user-service';

// Mock Firestore
jest.mock('@/lib/db/database', () => ({
  db: {}
}));

// Mock Firestore functions
jest.mock('firebase/firestore', () => ({
  doc: jest.fn(),
  getDoc: jest.fn(),
  setDoc: jest.fn(),
  updateDoc: jest.fn(),
  collection: jest.fn(),
  query: jest.fn(),
  where: jest.fn(),
  getDocs: jest.fn(),
  Timestamp: {
    fromDate: jest.fn((date) => ({ toDate: () => date }))
  }
}));

// Import mocked functions after mocking
import { doc, getDoc, setDoc, updateDoc, collection, query, where, getDocs } from 'firebase/firestore';

const mockDoc = doc as jest.MockedFunction<typeof doc>;
const mockGetDoc = getDoc as jest.MockedFunction<typeof getDoc>;
const mockSetDoc = setDoc as jest.MockedFunction<typeof setDoc>;
const mockUpdateDoc = updateDoc as jest.MockedFunction<typeof updateDoc>;
const mockCollection = collection as jest.MockedFunction<typeof collection>;
const mockQuery = query as jest.MockedFunction<typeof query>;
const mockWhere = where as jest.MockedFunction<typeof where>;
const mockGetDocs = getDocs as jest.MockedFunction<typeof getDocs>;

describe('UserService', () => {
  const mockAddress = '0x1234567890123456789012345678901234567890';
  const mockEmail = 'test@example.com';
  const mockInvalidAddress = 'invalid-address';
  const mockInvalidEmail = 'invalid-email';

  beforeEach(() => {
    jest.clearAllMocks();
    mockDoc.mockReturnValue({ id: mockAddress });
    mockCollection.mockReturnValue({});
    mockQuery.mockReturnValue({});
    mockWhere.mockReturnValue({});
  });

  describe('getUserByAddress', () => {
    it('should return user profile when user exists', async () => {
      const mockUserData = {
        email: mockEmail,
        displayName: 'Test User',
        createdAt: { toDate: () => new Date('2024-01-01') },
        lastLoginAt: { toDate: () => new Date('2024-01-02') },
        tokens: {
          available: 100,
          committed: 50,
          totalEarned: 200,
          totalSpent: 50
        },
        stats: {
          totalPredictions: 10,
          correctPredictions: 7,
          winRate: 0.7,
          totalTokensWon: 150,
          totalTokensLost: 50
        },
        preferences: {
          notifications: true,
          emailUpdates: false,
          theme: 'dark'
        }
      };

      mockGetDoc.mockResolvedValue({
        exists: () => true,
        id: mockAddress,
        data: () => mockUserData
      });

      const result = await UserService.getUserByAddress(mockAddress);

      expect(result).toEqual({
        address: mockAddress,
        email: mockEmail,
        displayName: 'Test User',
        avatarUrl: undefined,
        createdAt: new Date('2024-01-01'),
        lastLoginAt: new Date('2024-01-02'),
        tokens: {
          available: 100,
          committed: 50,
          totalEarned: 200,
          totalSpent: 50
        },
        stats: {
          totalPredictions: 10,
          correctPredictions: 7,
          winRate: 0.7,
          totalTokensWon: 150,
          totalTokensLost: 50
        },
        preferences: {
          notifications: true,
          emailUpdates: false,
          theme: 'dark'
        }
      });

      expect(mockDoc).toHaveBeenCalledWith({}, 'users', mockAddress);
      expect(mockGetDoc).toHaveBeenCalled();
    });

    it('should return null when user does not exist', async () => {
      mockGetDoc.mockResolvedValue({
        exists: () => false
      });

      const result = await UserService.getUserByAddress(mockAddress);

      expect(result).toBeNull();
    });

    it('should throw error for invalid address format', async () => {
      await expect(UserService.getUserByAddress(mockInvalidAddress))
        .rejects.toThrow('Invalid wallet address format');
    });

    it('should throw error for empty address', async () => {
      await expect(UserService.getUserByAddress(''))
        .rejects.toThrow('Wallet address is required');
    });

    it('should handle Firestore errors gracefully', async () => {
      mockGetDoc.mockRejectedValue(new Error('Firestore error'));

      await expect(UserService.getUserByAddress(mockAddress))
        .rejects.toThrow('Failed to fetch user: Firestore error');
    });
  });

  describe('createUser', () => {
    it('should create new user with default values', async () => {
      // Mock that user doesn't exist
      mockGetDoc.mockResolvedValue({ exists: () => false });
      mockSetDoc.mockResolvedValue(undefined);

      const result = await UserService.createUser(mockAddress, mockEmail);

      expect(result).toEqual({
        address: mockAddress,
        email: mockEmail,
        displayName: undefined,
        avatarUrl: undefined,
        createdAt: expect.any(Date),
        lastLoginAt: expect.any(Date),
        tokens: {
          available: 100,
          committed: 0,
          totalEarned: 0,
          totalSpent: 0
        },
        stats: {
          totalPredictions: 0,
          correctPredictions: 0,
          winRate: 0,
          totalTokensWon: 0,
          totalTokensLost: 0
        },
        preferences: {
          notifications: true,
          emailUpdates: true,
          theme: 'auto'
        }
      });

      expect(mockSetDoc).toHaveBeenCalled();
    });

    it('should create user with additional data', async () => {
      mockGetDoc.mockResolvedValue({ exists: () => false });
      mockSetDoc.mockResolvedValue(undefined);

      const additionalData = {
        displayName: 'Custom Name',
        tokens: { available: 200 }
      };

      const result = await UserService.createUser(mockAddress, mockEmail, additionalData);

      expect(result.displayName).toBe('Custom Name');
      expect(result.tokens.available).toBe(200);
    });

    it('should throw error if user already exists', async () => {
      mockGetDoc.mockResolvedValue({
        exists: () => true,
        id: mockAddress,
        data: () => ({ email: mockEmail })
      });

      await expect(UserService.createUser(mockAddress, mockEmail))
        .rejects.toThrow('User with this wallet address already exists');
    });

    it('should throw error for invalid address format', async () => {
      await expect(UserService.createUser(mockInvalidAddress, mockEmail))
        .rejects.toThrow('Invalid wallet address format');
    });

    it('should throw error for invalid email format', async () => {
      await expect(UserService.createUser(mockAddress, mockInvalidEmail))
        .rejects.toThrow('Invalid email format');
    });

    it('should throw error for missing required fields', async () => {
      await expect(UserService.createUser('', mockEmail))
        .rejects.toThrow('Wallet address and email are required');

      await expect(UserService.createUser(mockAddress, ''))
        .rejects.toThrow('Wallet address and email are required');
    });
  });

  describe('updateUser', () => {
    const mockExistingUser: UserProfile = {
      address: mockAddress,
      email: mockEmail,
      createdAt: new Date('2024-01-01'),
      lastLoginAt: new Date('2024-01-02'),
      tokens: {
        available: 100,
        committed: 50,
        totalEarned: 200,
        totalSpent: 50
      },
      stats: {
        totalPredictions: 10,
        correctPredictions: 7,
        winRate: 0.7,
        totalTokensWon: 150,
        totalTokensLost: 50
      },
      preferences: {
        notifications: true,
        emailUpdates: true,
        theme: 'auto'
      }
    };

    it('should update user profile successfully', async () => {
      // Mock existing user
      mockGetDoc.mockResolvedValueOnce({
        exists: () => true,
        id: mockAddress,
        data: () => mockExistingUser
      });

      // Mock updated user
      const updatedUser = { ...mockExistingUser, displayName: 'Updated Name' };
      mockGetDoc.mockResolvedValueOnce({
        exists: () => true,
        id: mockAddress,
        data: () => updatedUser
      });

      mockUpdateDoc.mockResolvedValue(undefined);

      const updates = { displayName: 'Updated Name' };
      const result = await UserService.updateUser(mockAddress, updates);

      expect(result.displayName).toBe('Updated Name');
      expect(mockUpdateDoc).toHaveBeenCalled();
    });

    it('should throw error if user does not exist', async () => {
      mockGetDoc.mockResolvedValue({ exists: () => false });

      await expect(UserService.updateUser(mockAddress, { displayName: 'Test' }))
        .rejects.toThrow('User not found');
    });

    it('should throw error for invalid address format', async () => {
      await expect(UserService.updateUser(mockInvalidAddress, { displayName: 'Test' }))
        .rejects.toThrow('Invalid wallet address format');
    });

    it('should throw error for empty address', async () => {
      await expect(UserService.updateUser('', { displayName: 'Test' }))
        .rejects.toThrow('Wallet address is required');
    });
  });

  describe('getUserByEmail', () => {
    it('should return user when found by email', async () => {
      const mockUserData = {
        email: mockEmail,
        createdAt: { toDate: () => new Date('2024-01-01') },
        lastLoginAt: { toDate: () => new Date('2024-01-02') },
        tokens: { available: 100, committed: 0, totalEarned: 0, totalSpent: 0 },
        stats: { totalPredictions: 0, correctPredictions: 0, winRate: 0, totalTokensWon: 0, totalTokensLost: 0 },
        preferences: { notifications: true, emailUpdates: true, theme: 'auto' }
      };

      mockGetDocs.mockResolvedValue({
        empty: false,
        docs: [{
          id: mockAddress,
          data: () => mockUserData
        }]
      });

      const result = await UserService.getUserByEmail(mockEmail);

      expect(result).not.toBeNull();
      expect(result?.email).toBe(mockEmail);
      expect(result?.address).toBe(mockAddress);
    });

    it('should return null when no user found by email', async () => {
      mockGetDocs.mockResolvedValue({ empty: true, docs: [] });

      const result = await UserService.getUserByEmail(mockEmail);

      expect(result).toBeNull();
    });

    it('should throw error for empty email', async () => {
      await expect(UserService.getUserByEmail(''))
        .rejects.toThrow('Email is required');
    });
  });

  describe('userExists', () => {
    it('should return true when user exists', async () => {
      mockGetDoc.mockResolvedValue({
        exists: () => true,
        id: mockAddress,
        data: () => ({ email: mockEmail })
      });

      const result = await UserService.userExists(mockAddress);

      expect(result).toBe(true);
    });

    it('should return false when user does not exist', async () => {
      mockGetDoc.mockResolvedValue({ exists: () => false });

      const result = await UserService.userExists(mockAddress);

      expect(result).toBe(false);
    });

    it('should return false on error', async () => {
      mockGetDoc.mockRejectedValue(new Error('Database error'));

      const result = await UserService.userExists(mockAddress);

      expect(result).toBe(false);
    });
  });

  describe('getOrCreateUser', () => {
    it('should return existing user and update last login', async () => {
      const mockExistingUser = {
        address: mockAddress,
        email: mockEmail,
        createdAt: new Date('2024-01-01'),
        lastLoginAt: new Date('2024-01-02'),
        tokens: { available: 100, committed: 0, totalEarned: 0, totalSpent: 0 },
        stats: { totalPredictions: 0, correctPredictions: 0, winRate: 0, totalTokensWon: 0, totalTokensLost: 0 },
        preferences: { notifications: true, emailUpdates: true, theme: 'auto' }
      };

      // Mock existing user found
      mockGetDoc.mockResolvedValue({
        exists: () => true,
        id: mockAddress,
        data: () => mockExistingUser
      });

      mockUpdateDoc.mockResolvedValue(undefined);

      const result = await UserService.getOrCreateUser(mockAddress, mockEmail);

      expect(result.address).toBe(mockAddress);
      expect(result.email).toBe(mockEmail);
    });

    it('should create new user when user does not exist', async () => {
      // Mock user doesn't exist, then exists after creation
      mockGetDoc.mockResolvedValueOnce({ exists: () => false });
      mockSetDoc.mockResolvedValue(undefined);

      const result = await UserService.getOrCreateUser(mockAddress, mockEmail);

      expect(result.address).toBe(mockAddress);
      expect(result.email).toBe(mockEmail);
      expect(result.tokens.available).toBe(100); // Default starting tokens
    });
  });

  describe('updateLastLogin', () => {
    it('should update last login timestamp without throwing error', async () => {
      const mockExistingUser = {
        address: mockAddress,
        email: mockEmail,
        createdAt: new Date('2024-01-01'),
        lastLoginAt: new Date('2024-01-02'),
        tokens: { available: 100, committed: 0, totalEarned: 0, totalSpent: 0 },
        stats: { totalPredictions: 0, correctPredictions: 0, winRate: 0, totalTokensWon: 0, totalTokensLost: 0 },
        preferences: { notifications: true, emailUpdates: true, theme: 'auto' }
      };

      mockGetDoc.mockResolvedValue({
        exists: () => true,
        id: mockAddress,
        data: () => mockExistingUser
      });

      mockUpdateDoc.mockResolvedValue(undefined);

      // Should not throw error
      await expect(UserService.updateLastLogin(mockAddress)).resolves.toBeUndefined();
    });

    it('should not throw error even if update fails', async () => {
      mockGetDoc.mockRejectedValue(new Error('Database error'));

      // Should not throw error even on failure
      await expect(UserService.updateLastLogin(mockAddress)).resolves.toBeUndefined();
    });
  });
});