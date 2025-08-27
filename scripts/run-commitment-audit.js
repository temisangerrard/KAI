#!/usr/bin/env node

/**
 * Script to run the commitment database audit
 * This script loads environment variables and runs the TypeScript audit
 */

const { execSync } = require('child_process')
const path = require('path')
require('dotenv').config({ path: '.env.local' })

console.log('🔍 Running Prediction Commitments Database Audit...')
console.log()

try {
  // Check if required environment variables are set
  const requiredEnvVars = [
    'NEXT_PUBLIC_FIREBASE_API_KEY',
    'NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN', 
    'NEXT_PUBLIC_FIREBASE_PROJECT_ID',
    'NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET',
    'NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID',
    'NEXT_PUBLIC_FIREBASE_APP_ID'
  ]
  
  const missingVars = requiredEnvVars.filter(varName => !process.env[varName])
  
  if (missingVars.length > 0) {
    console.error('❌ Missing required environment variables:')
    missingVars.forEach(varName => console.error(`   - ${varName}`))
    console.error('\nPlease ensure your .env.local file contains all required Firebase configuration.')
    process.exit(1)
  }
  
  console.log('✅ Environment variables validated')
  console.log()
  
  // Run the TypeScript audit script
  const scriptPath = path.join(__dirname, 'audit-commitment-database.ts')
  
  console.log('📊 Executing database audit...')
  execSync(`npx ts-node ${scriptPath}`, { 
    stdio: 'inherit',
    env: { ...process.env }
  })
  
} catch (error) {
  console.error('❌ Audit execution failed:', error.message)
  process.exit(1)
}