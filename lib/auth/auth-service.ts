/**
 * Real Authentication Service for KAI Platform
 * Handles user registration, login, and session management
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
  token: string
  refreshToken: string
}

class AuthService {
  private baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api'
  private tokenKey = 'kai_auth_token'
  private refreshTokenKey = 'kai_refresh_token'

  /**
   * Register a new user
   */
  async register(credentials: RegisterCredentials): Promise<AuthResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(credentials),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Registration failed')
      }

      const data = await response.json()
      
      // Store tokens
      this.setTokens(data.token, data.refreshToken)
      
      return data
    } catch (error) {
      console.error('Registration error:', error)
      throw error
    }
  }

  /**
   * Login user
   */
  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(credentials),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Login failed')
      }

      const data = await response.json()
      
      // Store tokens
      this.setTokens(data.token, data.refreshToken)
      
      return data
    } catch (error) {
      console.error('Login error:', error)
      throw error
    }
  }

  /**
   * Logout user
   */
  async logout(): Promise<void> {
    try {
      const token = this.getToken()
      if (token) {
        await fetch(`${this.baseUrl}/auth/logout`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        })
      }
    } catch (error) {
      console.error('Logout error:', error)
    } finally {
      this.clearTokens()
    }
  }

  /**
   * Get current user
   */
  async getCurrentUser(): Promise<AuthUser | null> {
    try {
      const token = this.getToken()
      if (!token) return null

      const response = await fetch(`${this.baseUrl}/auth/me`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      })

      if (!response.ok) {
        if (response.status === 401) {
          // Token expired, try to refresh
          const refreshed = await this.refreshToken()
          if (refreshed) {
            return this.getCurrentUser()
          }
        }
        throw new Error('Failed to get user')
      }

      return await response.json()
    } catch (error) {
      console.error('Get current user error:', error)
      this.clearTokens()
      return null
    }
  }

  /**
   * Refresh authentication token
   */
  async refreshToken(): Promise<boolean> {
    try {
      const refreshToken = this.getRefreshToken()
      if (!refreshToken) return false

      const response = await fetch(`${this.baseUrl}/auth/refresh`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ refreshToken }),
      })

      if (!response.ok) {
        this.clearTokens()
        return false
      }

      const data = await response.json()
      this.setTokens(data.token, data.refreshToken)
      return true
    } catch (error) {
      console.error('Token refresh error:', error)
      this.clearTokens()
      return false
    }
  }

  /**
   * Update user profile
   */
  async updateProfile(updates: Partial<AuthUser>): Promise<AuthUser> {
    try {
      const token = this.getToken()
      if (!token) throw new Error('Not authenticated')

      const response = await fetch(`${this.baseUrl}/auth/profile`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(updates),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Profile update failed')
      }

      return await response.json()
    } catch (error) {
      console.error('Profile update error:', error)
      throw error
    }
  }

  /**
   * Check if user is authenticated
   */
  isAuthenticated(): boolean {
    return !!this.getToken()
  }

  /**
   * Get stored token
   */
  private getToken(): string | null {
    if (typeof window === 'undefined') return null
    return localStorage.getItem(this.tokenKey)
  }

  /**
   * Get stored refresh token
   */
  private getRefreshToken(): string | null {
    if (typeof window === 'undefined') return null
    return localStorage.getItem(this.refreshTokenKey)
  }

  /**
   * Store tokens
   */
  private setTokens(token: string, refreshToken: string): void {
    if (typeof window === 'undefined') return
    localStorage.setItem(this.tokenKey, token)
    localStorage.setItem(this.refreshTokenKey, refreshToken)
  }

  /**
   * Clear stored tokens
   */
  private clearTokens(): void {
    if (typeof window === 'undefined') return
    localStorage.removeItem(this.tokenKey)
    localStorage.removeItem(this.refreshTokenKey)
  }

  /**
   * Get authorization header
   */
  getAuthHeader(): Record<string, string> {
    const token = this.getToken()
    return token ? { 'Authorization': `Bearer ${token}` } : {}
  }
}

export const authService = new AuthService()