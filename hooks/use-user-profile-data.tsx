"use client"

import { useState, useEffect } from 'react'
import { UserProfileDataService, UserProfileData } from '@/lib/services/user-profile-data-service'
import { useAuth } from '@/app/auth/auth-context'

export function useUserProfileData() {
  const { user, isAuthenticated } = useAuth()
  const [profileData, setProfileData] = useState<UserProfileData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isClient, setIsClient] = useState(false)

  // Fix hydration mismatch by ensuring client-side rendering
  useEffect(() => {
    setIsClient(true)
  }, [])

  useEffect(() => {
    if (!isClient || !isAuthenticated || !user?.id) {
      setProfileData(null)
      setIsLoading(false)
      return
    }

    const fetchProfileData = async () => {
      try {
        setIsLoading(true)
        setError(null)
        
        console.log('[USER_PROFILE_DATA_HOOK] Fetching profile data for user:', user.id)
        const data = await UserProfileDataService.getUserProfileData(user.id)
        console.log('[USER_PROFILE_DATA_HOOK] Retrieved profile data:', data)
        
        setProfileData(data)
      } catch (err) {
        console.error('[USER_PROFILE_DATA_HOOK] Error fetching profile data:', err)
        setError(err instanceof Error ? err.message : 'Failed to fetch profile data')
        
        // Set default empty data on error
        setProfileData({
          predictions: [],
          marketsCreated: [],
          predictionsCount: 0,
          marketsCreatedCount: 0,
          winRate: 0,
          tokensEarned: 0
        })
      } finally {
        setIsLoading(false)
      }
    }

    fetchProfileData()
  }, [user?.id, isAuthenticated, isClient])

  const refreshProfileData = async () => {
    if (!user?.id) {
      console.log('[USER_PROFILE_DATA_HOOK] Cannot refresh - no user ID')
      return
    }
    
    try {
      console.log('[USER_PROFILE_DATA_HOOK] Refreshing profile data for user:', user.id)
      setError(null)
      const data = await UserProfileDataService.getUserProfileData(user.id)
      console.log('[USER_PROFILE_DATA_HOOK] Refreshed profile data:', data)
      setProfileData(data)
    } catch (err) {
      console.error('[USER_PROFILE_DATA_HOOK] Error refreshing profile data:', err)
      setError(err instanceof Error ? err.message : 'Failed to refresh profile data')
    }
  }

  return {
    profileData,
    isLoading: isLoading || !isClient,
    error,
    refreshProfileData,
    // Convenience getters - always return consistent values
    predictions: isClient && profileData ? profileData.predictions : [],
    marketsCreated: isClient && profileData ? profileData.marketsCreated : [],
    predictionsCount: isClient && profileData ? profileData.predictionsCount : 0,
    marketsCreatedCount: isClient && profileData ? profileData.marketsCreatedCount : 0,
    winRate: isClient && profileData ? profileData.winRate : 0,
    tokensEarned: isClient && profileData ? profileData.tokensEarned : 0
  }
}