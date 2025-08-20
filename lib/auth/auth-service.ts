/**
 * Authentication Service for KAI Platform
 * Uses Next.js API routes under /api/auth for session management
 */

export interface AuthUser {
  id: string
  email: string
  displayName: string
  profileImage?: string
  tokenBalance: number
  hasCompletedOnboarding: boolean
  createdAt: string
  updatedAt: string
}

export interface LoginCredentials {
  email: string
  password: string
}

export interface RegisterCredentials {
  email: string
  password: string
  displayName: string
}

export interface AuthResponse {
  user: AuthUser
}

class AuthService {
  private baseUrl = '/api'

  /**
   * Register a new user
   */
  async register(credentials: RegisterCredentials): Promise<AuthResponse> {
    const response = await fetch(`${this.baseUrl}/auth/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify(credentials),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.message || 'Registration failed')
    }

    return await response.json()
  }

  /**
   * Login user
   */
  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    const response = await fetch(`${this.baseUrl}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify(credentials),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.message || 'Login failed')
    }

    return await response.json()
  }

  /**
   * Logout user
   */
  async logout(): Promise<void> {
    await fetch(`${this.baseUrl}/auth/logout`, {
      method: 'POST',
      credentials: 'include',
    })
  }

  /**
   * Get current authenticated user from session
   */
  async getCurrentUser(): Promise<AuthUser | null> {
    const response = await fetch(`${this.baseUrl}/auth/session`, {
      method: 'GET',
      credentials: 'include',
    })

    if (!response.ok) {
      return null
    }

    return await response.json()
  }

  /**
   * Update user profile
   */
  async updateProfile(updates: Partial<AuthUser>): Promise<AuthUser> {
    const response = await fetch(`${this.baseUrl}/auth/profile`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify(updates),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.message || 'Profile update failed')
    }

    return await response.json()
  }
}

export const authService = new AuthService()
