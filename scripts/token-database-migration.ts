/**
 * Token Database Migration Script
 * Sets up initial token packages and database structure
 */

import { initializeApp } from 'firebase/app'
import { getFirestore, collection, doc, setDoc, Timestamp } from 'firebase/firestore'
import { TokenPackage } from '@/lib/types/token'

// Firebase configuration (use environment variables)
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
const db = getFirestore(app)

/**
 * Initial token packages configuration
 */
const INITIAL_TOKEN_PACKAGES: Omit<TokenPackage, 'id' | 'createdAt'>[] = [
  {
    name: 'Starter Pack',
    tokens: 100,
    priceUSD: 4.99,
    bonusTokens: 0,
    stripePriceId: 'price_starter_pack', // Replace with actual Stripe price ID
    isActive: true,
    sortOrder: 1
  },
  {
    name: 'Popular Pack',
    tokens: 500,
    priceUSD: 19.99,
    bonusTokens: 50,
    stripePriceId: 'price_popular_pack', // Replace with actual Stripe price ID
    isActive: true,
    sortOrder: 2
  },
  {
    name: 'Power Pack',
    tokens: 1000,
    priceUSD: 34.99,
    bonusTokens: 150,
    stripePriceId: 'price_power_pack', // Replace with actual Stripe price ID
    isActive: true,
    sortOrder: 3
  },
  {
    name: 'Ultimate Pack',
    tokens: 2500,
    priceUSD: 79.99,
    bonusTokens: 500,
    stripePriceId: 'price_ultimate_pack', // Replace with actual Stripe price ID
    isActive: true,
    sortOrder: 4
  }
]

/**
 * Create initial token packages
 */
async function createInitialTokenPackages(): Promise<void> {
  console.log('Creating initial token packages...')
  
  try {
    const tokenPackagesRef = collection(db, 'token_packages')
    
    for (const packageData of INITIAL_TOKEN_PACKAGES) {
      const packageWithTimestamp: Omit<TokenPackage, 'id'> = {
        ...packageData,
        createdAt: Timestamp.now()
      }
      
      // Use package name as document ID for consistency
      const docId = packageData.name.toLowerCase().replace(/\s+/g, '_')
      const packageRef = doc(tokenPackagesRef, docId)
      
      await setDoc(packageRef, packageWithTimestamp)
      console.log(`✓ Created token package: ${packageData.name}`)
    }
    
    console.log('✅ Successfully created all initial token packages')
  } catch (error) {
    console.error('❌ Error creating token packages:', error)
    throw error
  }
}

/**
 * Create database indexes (to be run manually in Firebase Console)
 */
function generateIndexCommands(): void {
  console.log('\n📋 Manual Index Creation Commands for Firebase Console:')
  console.log('Run these commands in the Firebase Console > Firestore > Indexes\n')
  
  const indexes = [
    // User balances indexes
    {
      collection: 'user_balances',
      fields: [
        { field: 'userId', order: 'ASCENDING' },
        { field: 'lastUpdated', order: 'DESCENDING' }
      ]
    },
    // Token transactions indexes
    {
      collection: 'token_transactions',
      fields: [
        { field: 'userId', order: 'ASCENDING' },
        { field: 'timestamp', order: 'DESCENDING' }
      ]
    },
    {
      collection: 'token_transactions',
      fields: [
        { field: 'userId', order: 'ASCENDING' },
        { field: 'type', order: 'ASCENDING' },
        { field: 'timestamp', order: 'DESCENDING' }
      ]
    },
    {
      collection: 'token_transactions',
      fields: [
        { field: 'status', order: 'ASCENDING' },
        { field: 'timestamp', order: 'DESCENDING' }
      ]
    },
    // Token packages indexes
    {
      collection: 'token_packages',
      fields: [
        { field: 'isActive', order: 'ASCENDING' },
        { field: 'sortOrder', order: 'ASCENDING' }
      ]
    },
    // Prediction commitments indexes
    {
      collection: 'prediction_commitments',
      fields: [
        { field: 'userId', order: 'ASCENDING' },
        { field: 'committedAt', order: 'DESCENDING' }
      ]
    },
    {
      collection: 'prediction_commitments',
      fields: [
        { field: 'predictionId', order: 'ASCENDING' },
        { field: 'committedAt', order: 'DESCENDING' }
      ]
    },
    {
      collection: 'prediction_commitments',
      fields: [
        { field: 'userId', order: 'ASCENDING' },
        { field: 'status', order: 'ASCENDING' },
        { field: 'committedAt', order: 'DESCENDING' }
      ]
    }
  ]
  
  indexes.forEach((index, i) => {
    console.log(`${i + 1}. Collection: ${index.collection}`)
    console.log('   Fields:')
    index.fields.forEach(field => {
      console.log(`   - ${field.field}: ${field.order}`)
    })
    console.log('')
  })
}

/**
 * Validate database setup
 */
async function validateDatabaseSetup(): Promise<void> {
  console.log('\n🔍 Validating database setup...')
  
  try {
    // Check if token packages were created
    const { TokenPackageService } = await import('@/lib/services/token-database')
    const packages = await TokenPackageService.getActivePackages()
    
    if (packages.length === 0) {
      throw new Error('No token packages found')
    }
    
    console.log(`✓ Found ${packages.length} active token packages`)
    
    packages.forEach(pkg => {
      console.log(`  - ${pkg.name}: ${pkg.tokens} tokens for $${pkg.priceUSD}`)
    })
    
    console.log('✅ Database setup validation completed successfully')
  } catch (error) {
    console.error('❌ Database validation failed:', error)
    throw error
  }
}

/**
 * Main migration function
 */
async function runMigration(): Promise<void> {
  console.log('🚀 Starting Token Database Migration...\n')
  
  try {
    // Step 1: Create initial token packages
    await createInitialTokenPackages()
    
    // Step 2: Generate index commands
    generateIndexCommands()
    
    // Step 3: Validate setup
    await validateDatabaseSetup()
    
    console.log('\n🎉 Token database migration completed successfully!')
    console.log('\n📝 Next steps:')
    console.log('1. Create the indexes shown above in Firebase Console')
    console.log('2. Update Stripe price IDs in the token packages')
    console.log('3. Test token purchase flow in development')
    
  } catch (error) {
    console.error('\n💥 Migration failed:', error)
    process.exit(1)
  }
}

// Run migration if this script is executed directly
if (require.main === module) {
  runMigration()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error('Migration failed:', error)
      process.exit(1)
    })
}

export { runMigration, createInitialTokenPackages, validateDatabaseSetup }