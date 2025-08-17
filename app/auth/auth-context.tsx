"use client"

import React, { createContext, useContext, useState, useEffect } from "react"

// Define user type
export interface User {
  id: string
  email: string
  displayName?: string
  profileImage?: string
  tokenBalance: number
  hasCompletedOnboarding?: boolean
  bio?: string
  location?: string
  joinDate?: Date
  predictions?: UserPrediction[]
  marketsCreated?: Market[]
  stats?: {
    predictionsCount: number
    marketsCreated: number
    winRate: number
    tokensEarned: number
  }
  preferences?: {
    tourCompleted?: boolean
    tourSkipped?: boolean
    dismissedTooltips?: string[]
    seenContextualHelp?: string[]
    seenSampleMarket?: boolean
  }
}

// Define prediction type
export interface UserPrediction {
  id: string
  marketId: string
  marketTitle: string
  optionId: string
  optionName: string
  tokensAllocated: number
  predictionDate: Date
  potentialWin: number
  status: 'active' | 'won' | 'lost'
}

// Define market type
export interface Market {
  id: string
  title: string
  description: string
  category: string
  options: PredictionOption[]
  startDate: Date
  endDate: Date
  status: 'active' | 'resolved' | 'cancelled'
  totalTokens: number
  participants: number
}

// Define prediction option type
export interface PredictionOption {
  id: string
  name: string
  percentage: number
  tokens: number
  color: string
}

// Define auth context type
interface AuthContextType {
  user: User | null
  isLoading: boolean
  isAuthenticated: boolean
  login: (email: string, password: string) => Promise<void>
  register: (email: string, password: string, displayName: string) => Promise<void>
  logout: () => void
  updateUser: (updates: Partial<User>) => void
}

// Create context with default values
const AuthContext = createContext<AuthContextType>({
  user: null,
  isLoading: true,
  isAuthenticated: false,
  login: async () => {},
  register: async () => {},
  logout: () => {},
})

// Auth provider component
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  // Check for existing session on mount
  useEffect(() => {
    // In a real app, this would check for an existing session token
    // and validate it with the backend
    const checkSession = async () => {
      try {
        // Mock: Check if we have a user in localStorage
        const savedUser = localStorage.getItem("kai_user")
        if (savedUser) {
          setUser(JSON.parse(savedUser))
        }
      } catch (error) {
        console.error("Session check failed:", error)
      } finally {
        setIsLoading(false)
      }
    }

    checkSession()
  }, [])

  // Login function
  const login = async (email: string, password: string) => {
    setIsLoading(true)
    try {
      // Mock API call - in a real app, this would call your backend
      // Simulate network delay
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      // Generate a user ID that will be consistent for the same email
      const userId = `user_${email.split('@')[0].toLowerCase()}_${email.length}`
      
      // Check if user has completed onboarding
      const hasCompletedOnboarding = localStorage.getItem(`kai_onboarding_completed_${userId}`) === "true"
      
      // Generate mock user data
      const mockPredictions: UserPrediction[] = [
        {
          id: "pred_1",
          marketId: "market_1",
          marketTitle: "Will Taylor Swift release a new album this year?",
          optionId: "option_1",
          optionName: "Yes",
          tokensAllocated: 250,
          predictionDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
          potentialWin: 500,
          status: 'active'
        },
        {
          id: "pred_2",
          marketId: "market_2",
          marketTitle: "Who will win the next season of The Bachelor?",
          optionId: "option_2",
          optionName: "Contestant #3",
          tokensAllocated: 150,
          predictionDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 1 week ago
          potentialWin: 300,
          status: 'active'
        },
        {
          id: "pred_3",
          marketId: "market_3",
          marketTitle: "Will Beyoncé announce a world tour?",
          optionId: "option_3",
          optionName: "Yes",
          tokensAllocated: 200,
          predictionDate: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000), // 2 weeks ago
          potentialWin: 400,
          status: 'won'
        }
      ];
      
      const mockMarkets: Market[] = [
        {
          id: "market_4",
          title: "Who will win the next season of The Bachelor?",
          description: "Place your predictions on the next Bachelor winner!",
          category: "Entertainment",
          options: [
            { id: "option_4_1", name: "Contestant #1", percentage: 30, tokens: 3000, color: "bg-kai-600" },
            { id: "option_4_2", name: "Contestant #2", percentage: 40, tokens: 4000, color: "bg-kai-400" },
            { id: "option_4_3", name: "Contestant #3", percentage: 30, tokens: 3000, color: "bg-blue-400" }
          ],
          startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 1 week ago
          endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
          status: 'active',
          totalTokens: 10000,
          participants: 120
        }
      ];
      
      // Mock successful login
      const newUser: User = {
        id: userId,
        email,
        displayName: email.split('@')[0],
        tokenBalance: 2500, // Starter tokens
        hasCompletedOnboarding,
        bio: "",
        location: "",
        joinDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Joined 30 days ago
        predictions: mockPredictions,
        marketsCreated: mockMarkets,
        stats: {
          predictionsCount: mockPredictions.length,
          marketsCreated: mockMarkets.length,
          winRate: 33, // 1 out of 3 predictions won
          tokensEarned: 500
        }
      }
      
      // Save to localStorage (in a real app, you'd store a token instead)
      localStorage.setItem("kai_user", JSON.stringify(newUser))
      setUser(newUser)
    } catch (error) {
      console.error("Login failed:", error)
      throw new Error("Login failed. Please check your credentials and try again.")
    } finally {
      setIsLoading(false)
    }
  }

  // Register function
  const register = async (email: string, password: string, displayName: string) => {
    setIsLoading(true)
    try {
      // Mock API call - in a real app, this would call your backend
      // Simulate network delay
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      // Generate a user ID that will be consistent for the same email
      const userId = `user_${email.split('@')[0].toLowerCase()}_${email.length}`
      
      // New users haven't completed onboarding
      const hasCompletedOnboarding = false
      
      // New users start with empty predictions and markets
      const mockPredictions: UserPrediction[] = [];
      const mockMarkets: Market[] = [];
      
      // Mock successful registration
      const newUser: User = {
        id: userId,
        email,
        displayName,
        tokenBalance: 2500, // Starter tokens
        hasCompletedOnboarding,
        bio: "",
        location: "",
        joinDate: new Date(), // Joined today
        predictions: mockPredictions,
        marketsCreated: mockMarkets,
        stats: {
          predictionsCount: 0,
          marketsCreated: 0,
          winRate: 0,
          tokensEarned: 0
        }
      }
      
      // Save to localStorage (in a real app, you'd store a token instead)
      localStorage.setItem("kai_user", JSON.stringify(newUser))
      setUser(newUser)
    } catch (error) {
      console.error("Registration failed:", error)
      throw new Error("Registration failed. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  // Logout function
  const logout = () => {
    localStorage.removeItem("kai_user")
    setUser(null)
  }

  // Update user function
  const updateUser = (updates: Partial<User>) => {
    if (!user) return;
    
    const updatedUser = { ...user, ...updates };
    localStorage.setItem("kai_user", JSON.stringify(updatedUser));
    setUser(updatedUser);
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        login,
        register,
        logout,
        updateUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

// Custom hook to use auth context
export const useAuth = () => useContext(AuthContext)