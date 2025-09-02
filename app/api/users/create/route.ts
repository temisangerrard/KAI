import { NextRequest, NextResponse } from 'next/server'
import { adminDb } from '@/lib/firebase-admin'

interface CreateUserRequest {
  walletAddress: string
  email: string
  displayName?: string
}

interface UserProfile {
  uid: string
  email: string
  displayName: string
  walletAddress: string
  createdAt: any
  lastLoginAt: any
  tokenBalance: number
  level: number
  totalPredictions: number
  correctPredictions: number
  streak: number
  creationMethod: 'email'
  hasSmartAccount: boolean
  isSmartAccount: boolean
}

export async function POST(request: NextRequest) {
  try {
    const body: CreateUserRequest = await request.json()
    const { walletAddress, email, displayName } = body

    if (!walletAddress || !email) {
      return NextResponse.json(
        { error: 'Wallet address and email are required' },
        { status: 400 }
      )
    }

    // Check if this email already exists in Firestore
    const emailQuery = await adminDb.collection('users')
      .where('email', '==', email)
      .limit(1)
      .get()

    if (!emailQuery.empty) {
      // Email exists - just update login time (wallet address should be the same)
      const existingUserDoc = emailQuery.docs[0]
      const existingUserId = existingUserDoc.id
      const existingData = existingUserDoc.data()
      
      // Update only the login time
      await adminDb.collection('users').doc(existingUserId).update({
        lastLoginAt: new Date(),
      })
      
      const updatedData = {
        ...existingData,
        lastLoginAt: new Date()
      }
      
      return NextResponse.json({
        success: true,
        user: { id: existingUserId, ...updatedData },
        message: 'Welcome back! Login time updated'
      })
    }

    // Create new user profile with generated Firebase UID
    const newUserRef = adminDb.collection('users').doc() // Auto-generate Firebase UID
    const newUserId = newUserRef.id
    
    const userProfile: UserProfile = {
      uid: newUserId, // Use Firebase-generated UID
      email,
      displayName: displayName || email.split('@')[0],
      walletAddress,
      createdAt: new Date(),
      lastLoginAt: new Date(),
      tokenBalance: 2500, // Starting tokens
      level: 1,
      totalPredictions: 0,
      correctPredictions: 0,
      streak: 0,
      creationMethod: 'email',
      hasSmartAccount: true,
      isSmartAccount: true
    }

    await newUserRef.set(userProfile)

    return NextResponse.json({
      success: true,
      user: { id: newUserId, ...userProfile },
      message: 'New user created successfully'
    })

  } catch (error) {
    console.error('Error creating user:', error)
    return NextResponse.json(
      { error: 'Failed to create user' },
      { status: 500 }
    )
  }
}