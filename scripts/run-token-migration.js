#!/usr/bin/env node

/**
 * Token Database Migration Runner
 * Executes the token database migration script
 */

const { execSync } = require('child_process');
const path = require('path');

// Load environment variables
require('dotenv').config({ path: '.env.local' });

console.log('🚀 Running Token Database Migration...\n');

try {
  // Check if required environment variables are set
  const requiredEnvVars = [
    'NEXT_PUBLIC_FIREBASE_API_KEY',
    'NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN',
    'NEXT_PUBLIC_FIREBASE_PROJECT_ID',
    'NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET',
    'NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID',
    'NEXT_PUBLIC_FIREBASE_APP_ID'
  ];

  const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
  
  if (missingVars.length > 0) {
    console.error('❌ Missing required environment variables:');
    missingVars.forEach(varName => console.error(`   - ${varName}`));
    console.error('\nPlease check your .env.local file');
    process.exit(1);
  }

  console.log('✓ Environment variables validated');

  // Run the TypeScript migration script
  const migrationPath = path.join(__dirname, 'token-database-migration.ts');
  
  console.log('📦 Compiling and running migration...\n');
  
  // Use ts-node to run the TypeScript file directly
  execSync(`npx ts-node --project tsconfig.json "${migrationPath}"`, {
    stdio: 'inherit',
    env: { ...process.env }
  });

  console.log('\n✅ Migration completed successfully!');

} catch (error) {
  console.error('\n❌ Migration failed:', error.message);
  process.exit(1);
}