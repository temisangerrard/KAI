"use client"

import React, { createContext, useContext, useState, useEffect } from "react"
import { useIsSignedIn, useCurrentUser, useEvmAddress, useSignOut } from "@coinbase/cdp-hooks"
import { authService, type AuthUser, type LoginCredentials, type RegisterCredentials } from "./auth-service"

interface AuthContextType {
  user: AuthUser | null
  isLoading: boolean
  isAuthenticated: boolean
  login: (credentials: LoginCredentials) => Promise<void>
  register: (credentials: RegisterCredentials) => Promise<void>
  logout: () => Promise<void>
  updateUser: (updates: Partial<AuthUser>) => Promise<void>
  refreshUser: () => Promise<void>
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  isLoading: true,
  isAuthenticated: false,
  login: async () => {},
  register: async () => {},
  logout: async () => {},
  updateUser: async () => {},
  refreshUser: async () => {},
})

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  
  // Use CDP hooks for authentication state
  const isSignedIn = useIsSignedIn()
  const currentUser = useCurrentUser()
  const evmAddress = useEvmAddress()
  const { signOut: cdpSignOut } = useSignOut()

  // Initialize auth state with CDP user data
  useEffect(() => {
    // Don't run if CDP hooks haven't initialized yet
    if (isSignedIn === null || evmAddress === null) {
      console.log('⏳ CDP hooks not yet initialized, waiting...')
      return
    }

    const initializeAuth = async () => {
      try {
        // Extract values from CDP hook objects
        const signedIn = isSignedIn?.isSignedIn ?? false
        const addressString = evmAddress?.evmAddress || null
        
        // Extract email from CDP currentUser object with detailed debugging
        let userEmail = null
        
        console.log('🔍 Raw currentUser object:', JSON.stringify(currentUser, null, 2))
        
        if (currentUser?.currentUser?.authenticationMethods?.email?.email) {
          userEmail = currentUser.currentUser.authenticationMethods.email.email
          console.log('✅ Successfully extracted email:', userEmail)
        } else {
          console.log('❌ Failed to extract email, checking structure:')
          console.log('- currentUser exists:', !!currentUser)
          console.log('- currentUser.currentUser exists:', !!currentUser?.currentUser)
          console.log('- authenticationMethods exists:', !!currentUser?.currentUser?.authenticationMethods)
          console.log('- email exists:', !!currentUser?.currentUser?.authenticationMethods?.email)
          console.log('- email.email exists:', !!currentUser?.currentUser?.authenticationMethods?.email?.email)
        }
        
        console.log('CDP Auth Debug:', {
          rawIsSignedIn: isSignedIn,
          extractedSignedIn: signedIn,
          rawEvmAddress: evmAddress,
          extractedAddress: addressString,
          rawCurrentUser: currentUser,
          extractedEmail: userEmail
        })
        
        if (signedIn && addressString) {
          console.log('CDP user signed in with address:', addressString)
          
          // Try to get existing user profile
          let authUser = await authService.getUserByAddress(addressString)
          
          // If no profile exists, create one
          if (!authUser) {
            if (userEmail) {
              console.log('Creating new user profile for CDP user with email:', userEmail)
              authUser = await authService.createUserFromCDP(addressString, userEmail)
            } else {
              console.log('⚠️ No email available, cannot create user profile')
              // For now, we'll wait for email to be available
              setIsLoading(false)
              return
            }
          }
          
          if (authUser) {
            console.log('✅ User authenticated successfully:', authUser.email)
            setUser(authUser)
          } else {
            console.log('❌ Failed to create or retrieve user profile')
            setUser(null)
          }
        } else {
          console.log('CDP user signed out or no valid address', { signedIn, addressString })
          setUser(null)
        }
      } catch (error) {
        console.error('Error initializing auth state:', error)
        setUser(null)
      } finally {
        setIsLoading(false)
      }
    }

    setIsLoading(true)
    
    // Add a timeout to ensure loading state resolves
    const timeoutId = setTimeout(() => {
      setIsLoading(false)
    }, 5000)

    initializeAuth().finally(() => {
      clearTimeout(timeoutId)
    })

    return () => {
      clearTimeout(timeoutId)
    }
  }, [isSignedIn?.isSignedIn, evmAddress?.evmAddress, currentUser?.currentUser?.authenticationMethods?.email?.email])

  const login = async (credentials: LoginCredentials) => {
    try {
      setIsLoading(true)
      const response = await authService.login(credentials)
      setUser(response.user)
    } catch (error) {
      console.error('Login error:', error)
      throw error
    } finally {
      setIsLoading(false)
    }
  }

  const register = async (credentials: RegisterCredentials) => {
    try {
      setIsLoading(true)
      const response = await authService.register(credentials)
      setUser(response.user)
    } catch (error) {
      console.error('Registration error:', error)
      throw error
    } finally {
      setIsLoading(false)
    }
  }

  const logout = async () => {
    try {
      setIsLoading(true)
      // Use CDP signOut to clear the CDP session
      await cdpSignOut()
      setUser(null)
    } catch (error) {
      console.error('Logout error:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const updateUser = async (updates: Partial<AuthUser>) => {
    try {
      if (!user?.address) {
        throw new Error('User not authenticated')
      }
      const updatedUser = await authService.updateProfileByAddress(user.address, updates)
      setUser(updatedUser)
    } catch (error) {
      console.error('Profile update error:', error)
      throw error
    }
  }

  const refreshUser = async () => {
    try {
      // Extract values from CDP hook objects
      const signedIn = isSignedIn?.isSignedIn ?? false
      const addressString = evmAddress?.evmAddress || null
      const userEmail = currentUser?.currentUser?.authenticationMethods?.email?.email || null
      
      if (signedIn && addressString) {
        let authUser = await authService.getUserByAddress(addressString)
        
        // If no profile exists, create one
        if (!authUser && userEmail) {
          authUser = await authService.createUserFromCDP(addressString, userEmail)
        }
        
        setUser(authUser)
      } else {
        setUser(null)
      }
    } catch (error) {
      console.error('User refresh error:', error)
      setUser(null)
    }
  }

  // Debug logging for authentication state (only when key states change)
  useEffect(() => {
    const signedIn = isSignedIn?.isSignedIn ?? false
    const addressString = evmAddress?.evmAddress || null
    const userEmail = currentUser?.currentUser?.authenticationMethods?.email?.email || null
    
    console.log('Auth state debug:', {
      rawIsSignedIn: isSignedIn,
      extractedSignedIn: signedIn,
      hasUser: !!user,
      isLoading,
      addressString: addressString ? `${addressString.slice(0, 6)}...${addressString.slice(-4)}` : null,
      userEmail: userEmail
    })
  }, [isSignedIn, !!user, isLoading, evmAddress, currentUser])

  const value: AuthContextType = {
    user,
    isLoading,
    isAuthenticated: (isSignedIn?.isSignedIn ?? false) && !!user,
    login,
    register,
    logout,
    updateUser,
    refreshUser,
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}