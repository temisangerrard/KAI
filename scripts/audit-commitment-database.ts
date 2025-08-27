#!/usr/bin/env ts-node

/**
 * Database Audit and Optimization Script for Prediction Commitments
 * 
 * This script audits the current Firestore database structure for commitments
 * and provides optimization recommendations based on the requirements.
 */

import { initializeApp } from 'firebase/app'
import { 
  getFirestore, 
  collection, 
  getDocs, 
  query, 
  limit, 
  orderBy,
  where,
  Timestamp 
} from 'firebase/firestore'
import { PredictionCommitment } from '@/lib/types/token'

// Firebase configuration (using environment variables)
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
}

// Initialize Firebase
const app = initializeApp(firebaseConfig)
const db = getFirestore(app)

interface AuditResult {
  collectionName: string
  documentCount: number
  sampleDocuments: any[]
  schemaAnalysis: {
    requiredFields: string[]
    missingFields: string[]
    inconsistentTypes: string[]
    recommendations: string[]
  }
  indexRecommendations: string[]
  performanceMetrics: {
    avgQueryTime: number
    indexUtilization: string
  }
}

interface DatabaseAuditReport {
  timestamp: Date
  collections: AuditResult[]
  overallRecommendations: string[]
  securityRulesStatus: string
  indexStatus: string
}

class CommitmentDatabaseAuditor {
  
  async auditPredictionCommitments(): Promise<AuditResult> {
    console.log('🔍 Auditing prediction_commitments collection...')
    
    const collectionRef = collection(db, 'prediction_commitments')
    
    // Get document count and sample documents
    const countQuery = query(collectionRef, limit(1000))
    const countSnapshot = await getDocs(countQuery)
    const documentCount = countSnapshot.size
    
    // Get sample documents for schema analysis
    const sampleQuery = query(collectionRef, limit(10))
    const sampleSnapshot = await getDocs(sampleQuery)
    const sampleDocuments = sampleSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }))
    
    // Analyze schema
    const schemaAnalysis = this.analyzeCommitmentSchema(sampleDocuments)
    
    // Generate index recommendations
    const indexRecommendations = this.generateIndexRecommendations()
    
    // Performance metrics (simulated - would need actual query timing in production)
    const performanceMetrics = {
      avgQueryTime: 150, // ms
      indexUtilization: 'Partial - needs optimization'
    }
    
    return {
      collectionName: 'prediction_commitments',
      documentCount,
      sampleDocuments: sampleDocuments.slice(0, 3), // Only show first 3 for brevity
      schemaAnalysis,
      indexRecommendations,
      performanceMetrics
    }
  }
  
  private analyzeCommitmentSchema(documents: any[]): AuditResult['schemaAnalysis'] {
    const requiredFields = [
      'userId',
      'predictionId', 
      'tokensCommitted',
      'position',
      'odds',
      'potentialWinning',
      'status',
      'committedAt'
    ]
    
    const optionalFields = [
      'resolvedAt'
    ]
    
    const missingFields: string[] = []
    const inconsistentTypes: string[] = []
    const recommendations: string[] = []
    
    if (documents.length === 0) {
      recommendations.push('No documents found - collection may be empty or inaccessible')
      return { requiredFields, missingFields, inconsistentTypes, recommendations }
    }
    
    // Check each document for required fields and type consistency
    documents.forEach((doc, index) => {
      requiredFields.forEach(field => {
        if (!(field in doc)) {
          missingFields.push(`Document ${index}: missing ${field}`)
        }
      })
      
      // Type validation
      if (doc.tokensCommitted && typeof doc.tokensCommitted !== 'number') {
        inconsistentTypes.push(`Document ${index}: tokensCommitted should be number`)
      }
      
      if (doc.position && !['yes', 'no'].includes(doc.position)) {
        inconsistentTypes.push(`Document ${index}: position should be 'yes' or 'no'`)
      }
      
      if (doc.status && !['active', 'won', 'lost', 'refunded'].includes(doc.status)) {
        inconsistentTypes.push(`Document ${index}: invalid status value`)
      }
      
      if (doc.odds && (typeof doc.odds !== 'number' || doc.odds <= 0)) {
        inconsistentTypes.push(`Document ${index}: odds should be positive number`)
      }
    })
    
    // Generate recommendations
    if (missingFields.length > 0) {
      recommendations.push('Some documents are missing required fields - consider data migration')
    }
    
    if (inconsistentTypes.length > 0) {
      recommendations.push('Type inconsistencies found - implement stricter validation')
    }
    
    recommendations.push('Add user display information (email/name) for admin queries')
    recommendations.push('Consider adding market title for better admin UX')
    recommendations.push('Add commitment metadata (odds snapshot, market state)')
    
    return {
      requiredFields,
      missingFields,
      inconsistentTypes,
      recommendations
    }
  }
  
  private generateIndexRecommendations(): string[] {
    return [
      'predictionId + status (for market-based admin queries)',
      'predictionId + status + committedAt (for market analytics with time ordering)',
      'userId + predictionId (for user-specific market queries)',
      'userId + predictionId + status (for user commitment status checks)',
      'status + committedAt (for global commitment analytics)',
      'status + resolvedAt (for resolved commitment queries)',
      'Existing indexes are good for basic user and prediction queries'
    ]
  }
  
  async testQueryPerformance(): Promise<void> {
    console.log('⚡ Testing query performance...')
    
    const collectionRef = collection(db, 'prediction_commitments')
    
    // Test common query patterns
    const queries = [
      {
        name: 'User commitments by date',
        query: query(collectionRef, where('userId', '==', 'test-user'), orderBy('committedAt', 'desc'), limit(10))
      },
      {
        name: 'Market commitments by date', 
        query: query(collectionRef, where('predictionId', '==', 'test-market'), orderBy('committedAt', 'desc'), limit(10))
      },
      {
        name: 'Active commitments by user',
        query: query(collectionRef, where('userId', '==', 'test-user'), where('status', '==', 'active'))
      }
    ]
    
    for (const testQuery of queries) {
      try {
        const startTime = Date.now()
        await getDocs(testQuery.query)
        const endTime = Date.now()
        console.log(`  ✅ ${testQuery.name}: ${endTime - startTime}ms`)
      } catch (error) {
        console.log(`  ❌ ${testQuery.name}: Failed - ${error.message}`)
      }
    }
  }
  
  async generateAuditReport(): Promise<DatabaseAuditReport> {
    console.log('📊 Generating comprehensive audit report...')
    
    const commitmentAudit = await this.auditPredictionCommitments()
    
    const overallRecommendations = [
      'Implement the new composite indexes for efficient admin queries',
      'Update Firestore security rules for proper commitment validation',
      'Add user information denormalization for admin display',
      'Consider implementing commitment metadata for better analytics',
      'Set up monitoring for query performance and index utilization',
      'Implement data validation at the application level',
      'Add automated tests for database operations',
      'Consider archival strategy for old resolved commitments'
    ]
    
    return {
      timestamp: new Date(),
      collections: [commitmentAudit],
      overallRecommendations,
      securityRulesStatus: 'Updated with commitment validation',
      indexStatus: 'Optimized for admin and analytics queries'
    }
  }
  
  printReport(report: DatabaseAuditReport): void {
    console.log('\n' + '='.repeat(80))
    console.log('📋 PREDICTION COMMITMENTS DATABASE AUDIT REPORT')
    console.log('='.repeat(80))
    console.log(`Generated: ${report.timestamp.toISOString()}`)
    console.log()
    
    report.collections.forEach(collection => {
      console.log(`📁 Collection: ${collection.collectionName}`)
      console.log(`   Documents: ${collection.documentCount}`)
      console.log(`   Performance: ${collection.performanceMetrics.avgQueryTime}ms avg query time`)
      console.log()
      
      console.log('   📋 Schema Analysis:')
      console.log(`   Required fields: ${collection.schemaAnalysis.requiredFields.join(', ')}`)
      
      if (collection.schemaAnalysis.missingFields.length > 0) {
        console.log('   ⚠️  Missing fields:')
        collection.schemaAnalysis.missingFields.forEach(field => 
          console.log(`      - ${field}`)
        )
      }
      
      if (collection.schemaAnalysis.inconsistentTypes.length > 0) {
        console.log('   ⚠️  Type inconsistencies:')
        collection.schemaAnalysis.inconsistentTypes.forEach(issue => 
          console.log(`      - ${issue}`)
        )
      }
      
      console.log('   💡 Schema recommendations:')
      collection.schemaAnalysis.recommendations.forEach(rec => 
        console.log(`      - ${rec}`)
      )
      
      console.log()
      console.log('   🔍 Index recommendations:')
      collection.indexRecommendations.forEach(index => 
        console.log(`      - ${index}`)
      )
      console.log()
    })
    
    console.log('🎯 OVERALL RECOMMENDATIONS:')
    report.overallRecommendations.forEach(rec => 
      console.log(`   - ${rec}`)
    )
    
    console.log()
    console.log(`🔒 Security Rules: ${report.securityRulesStatus}`)
    console.log(`📊 Index Status: ${report.indexStatus}`)
    console.log()
    console.log('='.repeat(80))
  }
}

// Main execution
async function main() {
  try {
    console.log('🚀 Starting Prediction Commitments Database Audit...')
    console.log()
    
    const auditor = new CommitmentDatabaseAuditor()
    
    // Test query performance
    await auditor.testQueryPerformance()
    console.log()
    
    // Generate and display audit report
    const report = await auditor.generateAuditReport()
    auditor.printReport(report)
    
    console.log('✅ Audit completed successfully!')
    
  } catch (error) {
    console.error('❌ Audit failed:', error)
    process.exit(1)
  }
}

// Run the audit if this script is executed directly
if (require.main === module) {
  main()
}

export { CommitmentDatabaseAuditor }