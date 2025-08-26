#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

/**
 * Script to identify unused imports in TypeScript/React files
 */

// File extensions to scan
const EXTENSIONS = ['.tsx', '.ts'];

// Directories to scan
const SCAN_DIRECTORIES = ['app', 'components', 'lib', 'hooks'];

// Patterns to ignore (these might be used in ways that are hard to detect)
const IGNORE_PATTERNS = [
  'React', // Often used implicitly in JSX
  'NextRequest', // Used in type annotations
  'NextResponse', // Used in type annotations
];

/**
 * Get all files with specified extensions from a directory
 */
function getFiles(dir, extensions = EXTENSIONS) {
  const files = [];
  
  if (!fs.existsSync(dir)) {
    return files;
  }
  
  const items = fs.readdirSync(dir);
  
  for (const item of items) {
    const fullPath = path.join(dir, item);
    const stat = fs.statSync(fullPath);
    
    if (stat.isDirectory()) {
      // Skip node_modules and .next directories
      if (item !== 'node_modules' && item !== '.next' && item !== '.git') {
        files.push(...getFiles(fullPath, extensions));
      }
    } else if (extensions.some(ext => item.endsWith(ext))) {
      files.push(fullPath);
    }
  }
  
  return files;
}

/**
 * Extract imports from a TypeScript/React file
 */
function extractImports(content) {
  const imports = [];
  
  // Match import statements
  const importRegex = /import\s+(?:(?:\{([^}]+)\})|(?:([^,\s]+)(?:\s*,\s*\{([^}]+)\})?)|(?:\*\s+as\s+([^,\s]+)))\s+from\s+['"]([^'"]+)['"]/g;
  
  let match;
  while ((match = importRegex.exec(content)) !== null) {
    const [fullMatch, namedImports, defaultImport, additionalNamed, namespaceImport, modulePath] = match;
    
    // Handle default imports
    if (defaultImport) {
      imports.push({
        name: defaultImport.trim(),
        type: 'default',
        module: modulePath,
        fullMatch
      });
    }
    
    // Handle namespace imports (import * as name)
    if (namespaceImport) {
      imports.push({
        name: namespaceImport.trim(),
        type: 'namespace',
        module: modulePath,
        fullMatch
      });
    }
    
    // Handle named imports
    const namedImportsList = namedImports || additionalNamed;
    if (namedImportsList) {
      const names = namedImportsList.split(',').map(name => {
        // Handle "as" aliases
        const parts = name.trim().split(/\s+as\s+/);
        return parts.length > 1 ? parts[1].trim() : parts[0].trim();
      });
      
      for (const name of names) {
        if (name) {
          imports.push({
            name: name,
            type: 'named',
            module: modulePath,
            fullMatch
          });
        }
      }
    }
  }
  
  return imports;
}

/**
 * Check if an import is used in the file content
 */
function isImportUsed(importName, content, importInfo) {
  // Skip ignored patterns
  if (IGNORE_PATTERNS.includes(importName)) {
    return true;
  }
  
  // Remove the import statement itself from content to avoid false positives
  const contentWithoutImports = content.replace(/import\s+.*?from\s+['"][^'"]+['"];?\s*/g, '');
  
  // Check for various usage patterns
  const usagePatterns = [
    // Direct usage: importName
    new RegExp(`\\b${escapeRegex(importName)}\\b`, 'g'),
    // JSX component: <ImportName>
    new RegExp(`<${escapeRegex(importName)}[\\s/>]`, 'g'),
    // JSX self-closing: <ImportName />
    new RegExp(`<${escapeRegex(importName)}\\s*/>`, 'g'),
    // Property access: importName.something
    new RegExp(`\\b${escapeRegex(importName)}\\.`, 'g'),
    // Function call: importName(
    new RegExp(`\\b${escapeRegex(importName)}\\(`, 'g'),
    // Type annotation: : ImportName
    new RegExp(`:\\s*${escapeRegex(importName)}\\b`, 'g'),
    // Generic type: <ImportName>
    new RegExp(`<${escapeRegex(importName)}>`, 'g'),
    // Array type: ImportName[]
    new RegExp(`\\b${escapeRegex(importName)}\\[\\]`, 'g'),
  ];
  
  return usagePatterns.some(pattern => pattern.test(contentWithoutImports));
}

/**
 * Escape special regex characters
 */
function escapeRegex(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Analyze a single file for unused imports
 */
function analyzeFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const imports = extractImports(content);
    const unusedImports = [];
    
    for (const importInfo of imports) {
      if (!isImportUsed(importInfo.name, content, importInfo)) {
        unusedImports.push(importInfo);
      }
    }
    
    return {
      filePath,
      totalImports: imports.length,
      unusedImports,
      hasUnusedImports: unusedImports.length > 0
    };
  } catch (error) {
    console.error(`Error analyzing ${filePath}:`, error.message);
    return {
      filePath,
      totalImports: 0,
      unusedImports: [],
      hasUnusedImports: false,
      error: error.message
    };
  }
}

/**
 * Main function to scan for unused imports
 */
function scanUnusedImports() {
  console.log('🔍 Scanning for unused imports in .tsx and .ts files...\n');
  
  const allFiles = [];
  
  // Collect all files from scan directories
  for (const dir of SCAN_DIRECTORIES) {
    const files = getFiles(dir);
    allFiles.push(...files);
  }
  
  console.log(`Found ${allFiles.length} files to analyze\n`);
  
  const results = [];
  let totalUnusedImports = 0;
  
  // Analyze each file
  for (const filePath of allFiles) {
    const result = analyzeFile(filePath);
    results.push(result);
    
    if (result.hasUnusedImports) {
      totalUnusedImports += result.unusedImports.length;
      
      console.log(`📁 ${result.filePath}`);
      console.log(`   Total imports: ${result.totalImports}`);
      console.log(`   Unused imports: ${result.unusedImports.length}`);
      
      for (const unusedImport of result.unusedImports) {
        console.log(`   ❌ ${unusedImport.name} (from "${unusedImport.module}")`);
      }
      console.log('');
    }
  }
  
  // Summary
  const filesWithUnusedImports = results.filter(r => r.hasUnusedImports).length;
  
  console.log('📊 SUMMARY');
  console.log('='.repeat(50));
  console.log(`Files analyzed: ${allFiles.length}`);
  console.log(`Files with unused imports: ${filesWithUnusedImports}`);
  console.log(`Total unused imports found: ${totalUnusedImports}`);
  
  if (totalUnusedImports === 0) {
    console.log('\n✅ No unused imports found!');
  } else {
    console.log(`\n⚠️  Found ${totalUnusedImports} unused imports across ${filesWithUnusedImports} files`);
  }
  
  return results;
}

// Run the scanner if this script is executed directly
if (require.main === module) {
  scanUnusedImports();
}

module.exports = { scanUnusedImports, analyzeFile };