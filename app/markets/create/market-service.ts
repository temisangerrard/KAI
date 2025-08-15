/**
 * Market Service for KAI platform
 * Handles market creation and management
 */

import { Market, PredictionOption } from "@/app/auth/auth-context"
import { TransactionService } from "@/lib/services/transaction-service"

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
  const predictionOptions: PredictionOption[] = options.map((option, index) => ({
    id: generateOptionId(marketId, index),
    name: option.name,
    percentage: 0, // Initial percentage is 0
    tokens: 0, // Initial tokens is 0
    color: option.color
  }))
  
  // Generate AI-suggested tags if none provided
  const marketTags = tags.length > 0 ? tags : generateAISuggestedTags(title, description, category)
  
  // Create market object
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
  }
  
  // In a real implementation, this would call an API to create the market
  // For now, we'll just simulate it
  
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
  
  // Save market to local storage (in a real app, this would be handled by the backend)
  saveMarketToStorage(market)
  
  // Delete draft if this was created from a draft
  if (draftId) {
    deleteMarketDraft(creatorId, draftId)
  }
  
  return market
}

/**
 * Save market to local storage
 * @param market Market to save
 */
const saveMarketToStorage = (market: Market): void => {
  try {
    // Get existing markets
    const existingMarkets = getMarketsFromStorage()
    
    // Add new market
    existingMarkets.push(market)
    
    // Save to local storage
    localStorage.setItem('kai_markets', JSON.stringify(existingMarkets))
  } catch (error) {
    console.error('Failed to save market to storage:', error)
  }
}

// Import sample markets
import { sampleMarkets } from './sample-markets'

/**
 * Get markets from local storage
 * @returns Array of markets
 */
const getMarketsFromStorage = (): Market[] => {
  try {
    // Try to get markets from local storage
    const storedMarkets = localStorage.getItem('kai_markets')
    
    // If we have markets in storage, return them
    if (storedMarkets) {
      return JSON.parse(storedMarkets)
    }
    
    // Otherwise, use sample markets and save them to storage
    localStorage.setItem('kai_markets', JSON.stringify(sampleMarkets))
    return sampleMarkets
  } catch (error) {
    console.error('Failed to get markets from storage:', error)
    // Return sample markets if there's an error
    return sampleMarkets
  }
}

/**
 * Get market by ID
 * @param marketId Market ID
 * @returns Market object or null if not found
 */
export const getMarketById = (marketId: string): Market | null => {
  const markets = getMarketsFromStorage()
  return markets.find(market => market.id === marketId) || null
}

/**
 * Get all markets
 * @returns Array of markets
 */
export const getAllMarkets = (): Market[] => {
  return getMarketsFromStorage()
}

/**
 * Get trending markets using the trending service
 * @param limit Maximum number of markets to return
 * @returns Array of trending markets
 */
export const getTrendingMarkets = (limit: number = 5): Market[] => {
  const markets = getMarketsFromStorage()
  
  // Import trending service dynamically to avoid circular dependencies
  const { getTrendingMarkets: getTrendingMarketsFromService } = require('@/lib/services/trending-service')
  
  const trendingMarkets = getTrendingMarketsFromService(markets, limit)
  
  // Return just the market data without trending metadata for backward compatibility
  return trendingMarkets.map(({ trendingScore, trendingReason, popularityIndicator, growthRate, engagementScore, ...market }) => market)
}

/**
 * Get trending markets with full metadata
 * @param limit Maximum number of markets to return
 * @returns Array of trending markets with metadata
 */
export const getTrendingMarketsWithMetadata = (limit: number = 10) => {
  const markets = getMarketsFromStorage()
  
  // Import trending service dynamically to avoid circular dependencies
  const { getTrendingMarkets: getTrendingMarketsFromService } = require('@/lib/services/trending-service')
  
  return getTrendingMarketsFromService(markets, limit)
}

/**
 * Get featured markets for homepage
 * @param limit Maximum number of markets to return
 * @returns Array of featured markets with metadata
 */
export const getFeaturedMarkets = (limit: number = 6) => {
  const markets = getMarketsFromStorage()
  
  // Import trending service dynamically to avoid circular dependencies
  const { getFeaturedMarkets: getFeaturedMarketsFromService } = require('@/lib/services/trending-service')
  
  return getFeaturedMarketsFromService(markets, limit)
}

/**
 * Get markets by category
 * @param category Category to filter by
 * @returns Array of markets in the specified category
 */
export const getMarketsByCategory = (category: string): Market[] => {
  const markets = getMarketsFromStorage()
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