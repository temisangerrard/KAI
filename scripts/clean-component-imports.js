#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { scanUnusedImports } = require('./unused-imports-scanner');
const { cleanUnusedImports } = require('./remove-unused-imports');

/**
 * Clean unused imports from component files (.tsx files)
 */
function cleanComponentImports() {
  console.log('🔍 Scanning for unused imports in component files...\n');
  
  // Get scan results
  const results = scanUnusedImports();
  
  // Filter for component files (.tsx) with unused imports
  const componentFilesWithUnusedImports = results
    .filter(result => result.hasUnusedImports && result.filePath.endsWith('.tsx'))
    .map(result => result.filePath);
  
  if (componentFilesWithUnusedImports.length === 0) {
    console.log('✅ No unused imports found in component files!');
    return;
  }
  
  console.log(`\n📋 Found ${componentFilesWithUnusedImports.length} component files with unused imports:`);
  componentFilesWithUnusedImports.forEach(file => console.log(`   - ${file}`));
  console.log('');
  
  // Clean the files
  const cleanResults = cleanUnusedImports(componentFilesWithUnusedImports, false);
  
  return cleanResults;
}

// Run if executed directly
if (require.main === module) {
  cleanComponentImports();
}

module.exports = { cleanComponentImports };