/**
 * User Service for CDP + Firebase Integration
 * Handles user creation and management via server-side API
 */

export interface UserProfile {
  uid: string
  email: string
  displayName: string
  walletAddress: string
  createdAt: Date
  lastLoginAt: Date
  tokenBalance: number
  level: number
  totalPredictions: number
  correctPredictions: number
  streak: number
  creationMethod: 'email'
  hasSmartAccount: boolean
  isSmartAccount: boolean
}

export interface CreateUserResponse {
  success: boolean
  user?: UserProfile
  message?: string
  error?: string
}

export class UserService {
  /**
   * Create or update user profile via server-side API
   */
  static async createUser(
    walletAddress: string, 
    email: string, 
    displayName?: string
  ): Promise<CreateUserResponse> {
    try {
      const response = await fetch('/api/users/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          walletAddress,
          email,
          displayName
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create user')
      }

      return data
    } catch (error) {
      console.error('UserService.createUser error:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  /**
   * Get user profile by wallet address
   */
  static async getUserByAddress(walletAddress: string): Promise<UserProfile | null> {
    try {
      const response = await fetch(`/api/users/${walletAddress}`)
      
      if (!response.ok) {
        if (response.status === 404) {
          return null // User not found
        }
        throw new Error('Failed to fetch user')
      }

      const data = await response.json()
      return data.user
    } catch (error) {
      console.error('UserService.getUserByAddress error:', error)
      return null
    }
  }
}