// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app"
import { getAuth } from "firebase/auth"
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
export const auth = getAuth(app)
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
  status: 'active' | 'resolved' | 'cancelled'
  totalTokens: number
  participants: number
  tags?: string[]
}

// Get all markets
export async function getAllMarkets(): Promise<Market[]> {
  try {
    const marketsRef = collection(db, 'markets')
    const snapshot = await getDocs(marketsRef)
    
    const markets = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      startDate: doc.data().startDate?.toDate() || new Date(),
      endDate: doc.data().endDate?.toDate() || new Date(),
    })) as Market[]
    
    // If no markets in Firestore, return mock data for development
    if (markets.length === 0) {
      console.log('No markets in Firestore, returning mock data')
      return getMockMarkets()
    }
    
    return markets
  } catch (error) {
    console.warn('Firestore unavailable (offline or API disabled), using mock data:', error.message)
    // Return mock data if Firestore fails (offline, API disabled, etc.)
    return getMockMarkets()
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

// Get market by ID
export async function getMarketById(id: string): Promise<Market | null> {
  try {
    const marketRef = doc(db, 'markets', id)
    const snapshot = await getDoc(marketRef)
    
    if (!snapshot.exists()) {
      // Try to find in mock data
      const mockMarkets = getMockMarkets()
      return mockMarkets.find(market => market.id === id) || null
    }
    
    return {
      id: snapshot.id,
      ...snapshot.data(),
      startDate: snapshot.data().startDate?.toDate() || new Date(),
      endDate: snapshot.data().endDate?.toDate() || new Date(),
    } as Market
  } catch (error) {
    console.warn('Firestore unavailable for market fetch, using mock data:', error.message)
    // Try to find in mock data as fallback
    const mockMarkets = getMockMarkets()
    return mockMarkets.find(market => market.id === id) || null
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

// Mock data for development
function getMockMarkets(): Market[] {
  return [
    {
      id: '1',
      title: 'Who will win the Golden Globe for Best Actor?',
      description: 'Predict the winner of the 2024 Golden Globe Award for Best Actor in a Motion Picture - Drama',
      category: 'Entertainment',
      options: [
        { id: '1a', name: 'Cillian Murphy', percentage: 45, tokens: 4500, color: '#10B981' },
        { id: '1b', name: 'Bradley Cooper', percentage: 30, tokens: 3000, color: '#3B82F6' },
        { id: '1c', name: 'Leonardo DiCaprio', percentage: 15, tokens: 1500, color: '#F59E0B' },
        { id: '1d', name: 'Paul Giamatti', percentage: 10, tokens: 1000, color: '#EF4444' },
      ],
      startDate: new Date('2024-01-01'),
      endDate: new Date('2024-01-07'),
      status: 'active',
      totalTokens: 10000,
      participants: 234,
      tags: ['awards', 'movies', 'golden-globes']
    },
    {
      id: '2',
      title: 'Will Taylor Swift attend the Super Bowl?',
      description: 'Will Taylor Swift be spotted at Super Bowl LVIII in Las Vegas?',
      category: 'Sports',
      options: [
        { id: '2a', name: 'Yes', percentage: 75, tokens: 7500, color: '#10B981' },
        { id: '2b', name: 'No', percentage: 25, tokens: 2500, color: '#EF4444' },
      ],
      startDate: new Date('2024-02-01'),
      endDate: new Date('2024-02-11'),
      status: 'active',
      totalTokens: 10000,
      participants: 567,
      tags: ['sports', 'celebrity', 'super-bowl']
    },
    {
      id: '3',
      title: 'Next Netflix #1 Show',
      description: 'Which show will be #1 on Netflix US next week?',
      category: 'Entertainment',
      options: [
        { id: '3a', name: 'Stranger Things', percentage: 40, tokens: 2000, color: '#10B981' },
        { id: '3b', name: 'Wednesday', percentage: 35, tokens: 1750, color: '#3B82F6' },
        { id: '3c', name: 'The Crown', percentage: 25, tokens: 1250, color: '#F59E0B' },
      ],
      startDate: new Date('2024-01-15'),
      endDate: new Date('2024-01-22'),
      status: 'active',
      totalTokens: 5000,
      participants: 123,
      tags: ['streaming', 'netflix', 'tv-shows']
    }
  ]
}


