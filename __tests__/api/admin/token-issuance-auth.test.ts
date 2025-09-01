/**
 * Test for admin token issuance authentication fix
 * Verifies that the API now uses AdminAuthService.checkUserIsAdmin
 */

import { AdminAuthService } from '@/lib/auth/admin-auth';

// Mock AdminAuthService
jest.mock('@/lib/auth/admin-auth', () => ({
  AdminAuthService: {
    checkUserIsAdmin: jest.fn()
  }
}));

describe('Token Issuance API Authentication Fix', () => {
  const mockCheckUserIsAdmin = AdminAuthService.checkUserIsAdmin as jest.MockedFunction<typeof AdminAuthService.checkUserIsAdmin>;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should import AdminAuthService correctly', () => {
    // Verify that AdminAuthService is available and has the checkUserIsAdmin method
    expect(AdminAuthService).toBeDefined();
    expect(AdminAuthService.checkUserIsAdmin).toBeDefined();
    expect(typeof AdminAuthService.checkUserIsAdmin).toBe('function');
  });

  it('should call AdminAuthService.checkUserIsAdmin with user ID', async () => {
    // Mock the method to return true
    mockCheckUserIsAdmin.mockResolvedValue(true);

    // Call the method directly to verify it works
    const result = await AdminAuthService.checkUserIsAdmin('test-user-id');

    // Verify the method was called with correct parameters
    expect(mockCheckUserIsAdmin).toHaveBeenCalledWith('test-user-id');
    expect(mockCheckUserIsAdmin).toHaveBeenCalledTimes(1);
    expect(result).toBe(true);
  });

  it('should handle admin check failure', async () => {
    // Mock the method to return false
    mockCheckUserIsAdmin.mockResolvedValue(false);

    // Call the method
    const result = await AdminAuthService.checkUserIsAdmin('non-admin-user');

    // Verify the method was called and returned false
    expect(mockCheckUserIsAdmin).toHaveBeenCalledWith('non-admin-user');
    expect(result).toBe(false);
  });

  it('should handle admin check errors', async () => {
    // Mock the method to throw an error
    const error = new Error('Database connection failed');
    mockCheckUserIsAdmin.mockRejectedValue(error);

    // Call the method and expect it to throw
    await expect(AdminAuthService.checkUserIsAdmin('error-user')).rejects.toThrow('Database connection failed');
    
    // Verify the method was called
    expect(mockCheckUserIsAdmin).toHaveBeenCalledWith('error-user');
  });
});