/**
 * Market Service for KAI platform
 * Handles market creation and management
 */

import { Market } from "@/lib/db/database"
import { TransactionService } from "@/lib/services/transaction-service"
import { z } from "zod"

// Market option interface for creation
interface MarketOption {
  id: string
  name: string
  percentage: number
  tokens: number
  color: string
}

/**
 * Check if a market is a sample/demo market (deprecated - no longer used)
 */
export const isSampleMarket = (market: Market): boolean => {
  return false // All markets are now live markets from Firestore
}

// Interface for market creation parameters
interface MarketCreationParams {
  title: string
  description: string
  category: string
  options: {
    name: string
    color: string
  }[]
  endDate: Date
  creatorId: string
  creatorRewardPercentage: number
  tags?: string[]
  draftId?: string
}

// Interface for market draft
export interface MarketDraft {
  id: string
  title: string
  description: string
  category: string
  options: {
    name: string
    color: string
  }[]
  endDate?: Date
  creatorId: string
  createdAt: Date
  updatedAt: Date
  tags?: string[]
}

/**
 * Generate a unique market ID
 */
const generateMarketId = (): string => {
  return `market_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
}

/**
 * Generate a unique option ID
 */
const generateOptionId = (marketId: string, index: number): string => {
  return `option_${marketId}_${index}`
}

/**
 * Create a new prediction market
 * @param params Market creation parameters
 * @returns Created market object
 */
export const createMarket = async (params: MarketCreationParams): Promise<Market> => {
  const {
    title,
    description,
    category,
    options,
    endDate,
    creatorId,
    creatorRewardPercentage,
    tags = [],
    draftId
  } = params
  
  // Generate market ID
  const marketId = generateMarketId()
  
  // Create prediction options
  const predictionOptions: MarketOption[] = options.map((option, index) => ({
    id: generateOptionId(marketId, index),
    name: option.name,
    percentage: 0, // Initial percentage is 0
    tokens: 0, // Initial tokens is 0
    color: option.color
  }))
  
  // Generate AI-suggested tags if none provided
  const marketTags = tags.length > 0 ? tags : generateAISuggestedTags(title, description, category)
  
  // Create market object (only include defined values)
  const market: Market = {
    id: marketId,
    title,
    description,
    category,
    options: predictionOptions,
    startDate: new Date(),
    endDate,
    status: 'active',
    totalTokens: 0,
    participants: 0,
    tags: marketTags
    // Note: imageUrl is optional and not included if undefined
  }
  
  // Record market creation transaction
  // In a real implementation, this would be handled by the backend
  // For now, we'll just simulate it with a small token reward
  const creatorReward = 50 // Fixed reward for creating a market
  await TransactionService.recordMarketCreation(
    creatorId,
    creatorReward,
    marketId,
    title
  )

  // Persist market via API
  try {
    const response = await fetch('/api/markets', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(market)
    })
    if (!response.ok) {
      throw new Error(`API responded with ${response.status}`)
    }
  } catch (error) {
    console.warn('API not available, market created locally only:', error)
    // In development mode without backend, we'll just continue
    // The market will be created locally but not persisted
  }
  
  // Delete draft if this was created from a draft
  if (draftId) {
    deleteMarketDraft(creatorId, draftId)
  }
  
  return market
}

// ----- API helpers -----

const OptionSchema = z.object({
  id: z.string(),
  name: z.string(),
  percentage: z.number(),
  tokens: z.number(),
  color: z.string(),
})

const MarketSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string(),
  category: z.string(),
  options: z.array(OptionSchema),
  startDate: z.coerce.date(),
  endDate: z.coerce.date(),
  status: z.enum(['draft', 'active', 'closed', 'pending_resolution', 'resolving', 'resolved', 'cancelled', 'ended']),
  totalTokens: z.number(),
  participants: z.number(),
  tags: z.array(z.string()).optional(),
})

const MarketArraySchema = z.array(MarketSchema)

const fetchJSON = async (url: string, options?: RequestInit) => {
  try {
    const res = await fetch(url, {
      ...options,
      // Add timeout to prevent hanging requests
      signal: AbortSignal.timeout(10000) // 10 second timeout
    })
    
    if (!res.ok) {
      throw new Error(`Request failed with status ${res.status}: ${res.statusText}`)
    }
    
    const data = await res.json()
    return data
  } catch (error) {
    // Provide more specific error information
    if (error.name === 'AbortError') {
      console.warn(`API request to ${url} timed out`)
    } else if (error.message.includes('fetch')) {
      console.warn(`Network error accessing ${url}:`, error.message)
    } else {
      console.warn(`API endpoint ${url} error:`, error.message)
    }
    
    // Re-throw the error so calling functions can handle it appropriately
    throw error
  }
}

/**
 * Get market by ID - only from live Firestore data
 */
export const getMarketById = async (marketId: string): Promise<Market | null> => {
  try {
    const data = await fetchJSON(`/api/markets/${marketId}`)
    const parsed = MarketSchema.safeParse(data)
    if (parsed.success) {
      console.log(`Found live market: ${marketId}`)
      return parsed.data
    } else {
      console.warn(`Invalid market data from API for ${marketId}:`, parsed.error)
      return null
    }
  } catch (error) {
    console.warn(`Failed to fetch market ${marketId} from API:`, error.message)
    return null
  }
}

/**
 * Get all markets - only live markets from Firestore
 */
export const getAllMarkets = async (): Promise<Market[]> => {
  try {
    // Fetch real markets from Firestore via API
    const data = await fetchJSON('/api/markets')
    const parsed = MarketArraySchema.safeParse(data)
    
    if (parsed.success) {
      console.log(`Loaded ${parsed.data.length} live markets from Firestore`)
      // Sort by start date (newest first)
      return parsed.data.sort((a, b) => 
        new Date(b.startDate).getTime() - new Date(a.startDate).getTime()
      )
    } else {
      console.warn('API returned invalid market data:', parsed.error)
      return []
    }
  } catch (error) {
    console.warn('Failed to fetch markets from API:', error)
    return []
  }
}



/**
 * Get trending markets using the trending service
 */
export const getTrendingMarkets = async (limit: number = 5): Promise<Market[]> => {
  const markets = await getAllMarkets()
  const { getTrendingMarkets: getTrendingMarketsFromService } = await import('@/lib/services/trending-service')
  const trendingMarkets = getTrendingMarketsFromService(markets, limit)
  return trendingMarkets.map(({ trendingScore, trendingReason, popularityIndicator, growthRate, engagementScore, ...market }) => market)
}

/**
 * Get trending markets with metadata
 */
export const getTrendingMarketsWithMetadata = async (limit: number = 10) => {
  const markets = await getAllMarkets()
  const { getTrendingMarkets: getTrendingMarketsFromService } = await import('@/lib/services/trending-service')
  return getTrendingMarketsFromService(markets, limit)
}

/**
 * Get featured markets for homepage
 */
export const getFeaturedMarkets = async (limit: number = 6) => {
  const markets = await getAllMarkets()
  const { getFeaturedMarkets: getFeaturedMarketsFromService } = await import('@/lib/services/trending-service')
  return getFeaturedMarketsFromService(markets, limit)
}

/**
 * Get markets by category
 */
export const getMarketsByCategory = async (category: string): Promise<Market[]> => {
  const markets = await getAllMarkets()
  return markets.filter(market => market.category === category)
}

/**
 * Get markets created by a user
 * @param userId User ID
 * @returns Array of markets created by the user
 */
export const getMarketsByCreator = (userId: string): Market[] => {
  // In a real implementation, this would query the backend for markets created by the user
  // For now, we'll just return an empty array
  return []
}

/**
 * Save market draft
 * @param draft Market draft to save
 * @returns Saved market draft
 */
export const saveMarketDraft = (draft: Omit<MarketDraft, 'id' | 'createdAt' | 'updatedAt'>): MarketDraft => {
  try {
    // Generate draft ID if not provided
    const draftId = draft.id || `draft_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
    
    // Get existing drafts
    const existingDrafts = getMarketDrafts(draft.creatorId)
    
    // Check if draft already exists
    const existingDraftIndex = existingDrafts.findIndex(d => d.id === draftId)
    
    // Create new draft object
    const now = new Date()
    const newDraft: MarketDraft = {
      ...draft,
      id: draftId,
      createdAt: existingDraftIndex >= 0 ? existingDrafts[existingDraftIndex].createdAt : now,
      updatedAt: now
    }
    
    // Update or add draft
    if (existingDraftIndex >= 0) {
      existingDrafts[existingDraftIndex] = newDraft
    } else {
      existingDrafts.push(newDraft)
    }
    
    // Save to local storage
    localStorage.setItem(`kai_market_drafts_${draft.creatorId}`, JSON.stringify(existingDrafts))
    
    return newDraft
  } catch (error) {
    console.error('Failed to save market draft:', error)
    throw new Error('Failed to save market draft')
  }
}

/**
 * Get market drafts for a user
 * @param userId User ID
 * @returns Array of market drafts
 */
export const getMarketDrafts = (userId: string): MarketDraft[] => {
  try {
    const storedDrafts = localStorage.getItem(`kai_market_drafts_${userId}`)
    return storedDrafts ? JSON.parse(storedDrafts) : []
  } catch (error) {
    console.error('Failed to get market drafts:', error)
    return []
  }
}

/**
 * Get market draft by ID
 * @param userId User ID
 * @param draftId Draft ID
 * @returns Market draft or null if not found
 */
export const getMarketDraftById = (userId: string, draftId: string): MarketDraft | null => {
  const drafts = getMarketDrafts(userId)
  return drafts.find(draft => draft.id === draftId) || null
}

/**
 * Delete market draft
 * @param userId User ID
 * @param draftId Draft ID
 * @returns True if draft was deleted, false otherwise
 */
export const deleteMarketDraft = (userId: string, draftId: string): boolean => {
  try {
    // Get existing drafts
    const existingDrafts = getMarketDrafts(userId)
    
    // Filter out the draft to delete
    const updatedDrafts = existingDrafts.filter(draft => draft.id !== draftId)
    
    // If no drafts were removed, return false
    if (updatedDrafts.length === existingDrafts.length) {
      return false
    }
    
    // Save updated drafts to local storage
    localStorage.setItem(`kai_market_drafts_${userId}`, JSON.stringify(updatedDrafts))
    
    return true
  } catch (error) {
    console.error('Failed to delete market draft:', error)
    return false
  }
}

/**
 * Generate AI-suggested tags based on market content
 * @param title Market title
 * @param description Market description
 * @param category Market category
 * @returns Array of suggested tags
 */
export const generateAISuggestedTags = (title: string, description: string, category: string): string[] => {
  // In a real implementation, this would call an AI service to generate tags
  // For now, we'll use a simple keyword extraction algorithm
  
  // Combine title and description
  const content = `${title} ${description}`.toLowerCase()
  
  // Define common keywords by category
  const keywordsByCategory: Record<string, string[]> = {
    'Entertainment': ['tv', 'show', 'actor', 'actress', 'movie', 'series', 'episode', 'season', 'award', 'celebrity'],
    'Fashion': ['trend', 'style', 'designer', 'collection', 'runway', 'model', 'brand', 'clothing', 'accessory'],
    'Music': ['album', 'song', 'artist', 'band', 'concert', 'tour', 'release', 'single', 'chart', 'grammy'],
    'Celebrity': ['star', 'famous', 'gossip', 'relationship', 'breakup', 'wedding', 'divorce', 'scandal'],
    'TV Shows': ['episode', 'season', 'character', 'finale', 'premiere', 'reality', 'drama', 'comedy', 'streaming'],
    'Movies': ['film', 'director', 'actor', 'actress', 'box office', 'release', 'sequel', 'franchise', 'oscar'],
    'Social Media': ['influencer', 'follower', 'viral', 'trend', 'platform', 'content', 'post', 'engagement'],
    'Sports': ['team', 'player', 'game', 'match', 'championship', 'tournament', 'athlete', 'score', 'win', 'lose'],
    'Politics': ['election', 'candidate', 'vote', 'policy', 'government', 'campaign', 'debate', 'president'],
    'Technology': ['app', 'device', 'launch', 'update', 'feature', 'product', 'innovation', 'startup', 'release']
  }
  
  // Get keywords for the selected category
  const categoryKeywords = keywordsByCategory[category] || []
  
  // Find matching keywords in content
  const matchedKeywords = categoryKeywords.filter(keyword => content.includes(keyword))
  
  // Extract potential tags from content (words that are capitalized or contain special characters)
  const contentWords = content.split(/\s+/)
  const potentialTags = contentWords.filter(word => {
    // Remove punctuation
    const cleanWord = word.replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, "")
    // Check if word is long enough and not a common word
    return cleanWord.length > 3 && !['and', 'the', 'this', 'that', 'with', 'from', 'will'].includes(cleanWord)
  })
  
  // Combine matched keywords and potential tags, remove duplicates
  const combinedTags = [...new Set([...matchedKeywords, ...potentialTags.slice(0, 5)])]
  
  // Always include the category as a tag
  if (!combinedTags.includes(category.toLowerCase())) {
    combinedTags.unshift(category.toLowerCase())
  }
  
  // Format tags (capitalize first letter)
  const formattedTags = combinedTags.map(tag => 
    tag.charAt(0).toUpperCase() + tag.slice(1)
  )
  
  // Return up to 5 tags
  return formattedTags.slice(0, 5)
}