#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { scanUnusedImports } = require('./unused-imports-scanner');
const { cleanUnusedImports } = require('./remove-unused-imports');

/**
 * Clean unused imports from utility files (lib/ and hooks/ directories)
 */
function cleanUtilityImports() {
  console.log('🔍 Scanning for unused imports in utility files...\n');
  
  // Get scan results
  const results = scanUnusedImports();
  
  // Filter for utility files (lib/ and hooks/ directories) with unused imports
  const utilityFilesWithUnusedImports = results
    .filter(result => {
      return result.hasUnusedImports && 
             (result.filePath.startsWith('lib/') || result.filePath.startsWith('hooks/'));
    })
    .map(result => result.filePath);
  
  if (utilityFilesWithUnusedImports.length === 0) {
    console.log('✅ No unused imports found in utility files!');
    return;
  }
  
  console.log(`\n📋 Found ${utilityFilesWithUnusedImports.length} utility files with unused imports:`);
  utilityFilesWithUnusedImports.forEach(file => console.log(`   - ${file}`));
  console.log('');
  
  // Clean the files
  const cleanResults = cleanUnusedImports(utilityFilesWithUnusedImports, false);
  
  return cleanResults;
}

// Run if executed directly
if (require.main === module) {
  cleanUtilityImports();
}

module.exports = { cleanUtilityImports };