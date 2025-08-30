// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app"
import { getFirestore } from "firebase/firestore"
import { getAnalytics } from "firebase/analytics"

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID
}

// Initialize Firebase
const app = initializeApp(firebaseConfig)

// Initialize Firebase services
export const db = getFirestore(app)

// Initialize Analytics (only in browser)
export const analytics = typeof window !== 'undefined' ? getAnalytics(app) : null

// Enable offline persistence for Firestore (optional)
if (typeof window !== 'undefined') {
  import('firebase/firestore').then(({ enableNetwork, connectFirestoreEmulator }) => {
    // Enable network for Firestore
    enableNetwork(db).catch((error) => {
      console.warn('Failed to enable Firestore network:', error)
    })
  })
}

export { app }

// Database functions
import {
  collection,
  getDocs,
  addDoc,
  doc,
  getDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit
} from 'firebase/firestore'

// Market type definition
export interface Market {
  id: string
  title: string
  description: string
  category: string
  options: Array<{
    id: string
    name: string
    percentage: number
    tokens: number
    color: string
  }>
  startDate: Date
  endDate: Date
  status: 'active' | 'ended' | 'cancelled'
  totalTokens: number
  participants: number
  tags?: string[]
}

// Get all markets with improved error handling
export async function getAllMarkets(): Promise<Market[]> {
  try {
    const marketsRef = collection(db, 'markets')

    // Add timeout to prevent hanging requests
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('Firestore request timeout')), 8000)
    })

    const snapshotPromise = getDocs(marketsRef)
    const snapshot = await Promise.race([snapshotPromise, timeoutPromise])

    const markets = snapshot.docs.map(doc => {
      const data = doc.data()
      console.log(`Transforming market ${doc.id}:`, {
        title: data.title,
        hasOptions: !!data.options,
        optionsLength: data.options?.length,
        firstOption: data.options?.[0]
      })

      // Transform Firestore data to match our Market interface
      const transformedMarket = {
        id: doc.id,
        title: data.title || '',
        description: data.description || '',
        category: data.category || 'Other',
        options: (data.options || []).map((option: any, index: number) => ({
          id: option.id || `option_${index}`,
          name: option.name || option.text || `Option ${index + 1}`,
          percentage: option.percentage || 0,
          tokens: option.tokens || option.totalTokens || 0,
          color: option.color || (index === 0 ? '#10B981' : index === 1 ? '#EF4444' : '#3B82F6')
        })),
        startDate: data.startDate?.toDate() || data.createdAt?.toDate() || new Date(),
        endDate: data.endDate?.toDate() || data.endsAt?.toDate() || new Date(),
        status: data.status === 'resolved' ? 'ended' : (data.status || 'active'),
        totalTokens: data.totalTokens || data.totalTokensStaked || 0,
        participants: data.participants || data.totalParticipants || 0,
        tags: data.tags || []
      }

      console.log(`Transformed market ${doc.id}:`, {
        title: transformedMarket.title,
        optionsLength: transformedMarket.options.length,
        firstOptionName: transformedMarket.options[0]?.name
      })

      return transformedMarket
    }) as Market[]

    console.log(`Successfully loaded ${markets.length} markets from Firestore`)
    return markets

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    console.warn(`Firestore unavailable: ${errorMessage}`)

    // Return empty array instead of mock data - let the service layer handle fallbacks
    return []
  }
}

// Create a new market
export async function createMarketRecord(market: Omit<Market, 'id'>): Promise<Market> {
  try {
    const marketsRef = collection(db, 'markets')

    // Clean the market data to remove undefined values
    const cleanMarketData: any = {
      title: market.title,
      description: market.description,
      category: market.category,
      options: market.options,
      startDate: market.startDate,
      endDate: market.endDate,
      status: market.status,
      totalTokens: market.totalTokens,
      participants: market.participants,
      createdAt: new Date(),
    }

    // Only add optional fields if they exist and are not empty
    if (market.tags && market.tags.length > 0) {
      cleanMarketData.tags = market.tags
    }

    const docRef = await addDoc(marketsRef, cleanMarketData)

    return {
      id: docRef.id,
      ...market,
    }
  } catch (error) {
    console.error('Error creating market:', error)
    throw new Error('Failed to create market')
  }
}

// Get market by ID with improved error handling
export async function getMarketById(id: string): Promise<Market | null> {
  try {
    const marketRef = doc(db, 'markets', id)

    // Add timeout to prevent hanging requests
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('Firestore request timeout')), 5000)
    })

    const snapshotPromise = getDoc(marketRef)
    const snapshot = await Promise.race([snapshotPromise, timeoutPromise])

    if (!snapshot.exists()) {
      console.log(`Market ${id} not found in Firestore`)
      return null
    }

    const data = snapshot.data()

    // Transform Firestore data to match our Market interface
    const market = {
      id: snapshot.id,
      title: data.title || '',
      description: data.description || '',
      category: data.category || 'Other',
      options: (data.options || []).map((option: any, index: number) => ({
        id: option.id || `option_${index}`,
        name: option.name || option.text || `Option ${index + 1}`,
        percentage: option.percentage || 0,
        tokens: option.tokens || option.totalTokens || 0,
        color: option.color || (index === 0 ? '#10B981' : index === 1 ? '#EF4444' : '#3B82F6')
      })),
      startDate: data.startDate?.toDate() || data.createdAt?.toDate() || new Date(),
      endDate: data.endDate?.toDate() || data.endsAt?.toDate() || new Date(),
      status: data.status === 'resolved' ? 'ended' : (data.status || 'active'),
      totalTokens: data.totalTokens || data.totalTokensStaked || 0,
      participants: data.participants || data.totalParticipants || 0,
      tags: data.tags || []
    } as Market

    console.log(`Successfully loaded market ${id} from Firestore`)
    return market

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    console.warn(`Failed to fetch market ${id} from Firestore: ${errorMessage}`)
    return null
  }
}

// Update market
export async function updateMarket(id: string, updates: Partial<Omit<Market, 'id'>>): Promise<Market | null> {
  try {
    const marketRef = doc(db, 'markets', id)
    await updateDoc(marketRef, {
      ...updates,
      updatedAt: new Date(),
    })

    // Return updated market
    return await getMarketById(id)
  } catch (error) {
    console.error('Error updating market:', error)
    throw new Error('Failed to update market')
  }
}

// Mock data removed - using only live Firestore markets


