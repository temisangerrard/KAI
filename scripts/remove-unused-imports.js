#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { analyzeFile } = require('./unused-imports-scanner');

/**
 * Script to automatically remove unused imports from TypeScript/React files
 */

/**
 * Remove unused imports from file content
 */
function removeUnusedImports(content, unusedImports) {
  let updatedContent = content;
  
  // Sort unused imports by their position in the file (reverse order to avoid index shifting)
  const sortedUnusedImports = unusedImports.sort((a, b) => {
    const aIndex = content.indexOf(a.fullMatch);
    const bIndex = content.indexOf(b.fullMatch);
    return bIndex - aIndex;
  });
  
  for (const unusedImport of sortedUnusedImports) {
    const { name, type, module, fullMatch } = unusedImport;
    
    // Find the import statement
    const importRegex = new RegExp(escapeRegex(fullMatch), 'g');
    const match = importRegex.exec(updatedContent);
    
    if (match) {
      const importStatement = match[0];
      
      // Check if this is a named import with multiple imports
      const namedImportMatch = importStatement.match(/import\s+\{([^}]+)\}\s+from\s+['"]([^'"]+)['"]/);
      
      if (namedImportMatch && type === 'named') {
        const [, namedImports, modulePath] = namedImportMatch;
        const importNames = namedImports.split(',').map(n => n.trim());
        
        // Remove only the specific unused import
        const filteredImports = importNames.filter(importName => {
          // Handle "as" aliases
          const actualName = importName.includes(' as ') 
            ? importName.split(' as ')[1].trim() 
            : importName.trim();
          return actualName !== name;
        });
        
        if (filteredImports.length === 0) {
          // Remove entire import statement if no imports left
          updatedContent = updatedContent.replace(importStatement, '');
        } else {
          // Update import statement with remaining imports
          const newImportStatement = `import { ${filteredImports.join(', ')} } from "${modulePath}"`;
          updatedContent = updatedContent.replace(importStatement, newImportStatement);
        }
      } else {
        // Remove entire import statement for default, namespace, or single named imports
        updatedContent = updatedContent.replace(importStatement, '');
      }
    }
  }
  
  // Clean up empty lines left by removed imports
  updatedContent = updatedContent.replace(/\n\s*\n\s*\n/g, '\n\n');
  
  return updatedContent;
}

/**
 * Escape special regex characters
 */
function escapeRegex(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Clean unused imports from a single file
 */
function cleanFile(filePath, dryRun = false) {
  try {
    const analysis = analyzeFile(filePath);
    
    if (!analysis.hasUnusedImports) {
      return {
        filePath,
        cleaned: false,
        removedCount: 0,
        message: 'No unused imports found'
      };
    }
    
    const originalContent = fs.readFileSync(filePath, 'utf8');
    const cleanedContent = removeUnusedImports(originalContent, analysis.unusedImports);
    
    if (!dryRun) {
      fs.writeFileSync(filePath, cleanedContent, 'utf8');
    }
    
    return {
      filePath,
      cleaned: true,
      removedCount: analysis.unusedImports.length,
      removedImports: analysis.unusedImports.map(imp => `${imp.name} (from "${imp.module}")`),
      message: `Removed ${analysis.unusedImports.length} unused imports`
    };
    
  } catch (error) {
    return {
      filePath,
      cleaned: false,
      removedCount: 0,
      error: error.message,
      message: `Error: ${error.message}`
    };
  }
}

/**
 * Clean unused imports from multiple files
 */
function cleanUnusedImports(filePaths, dryRun = false) {
  console.log(`🧹 ${dryRun ? 'Simulating cleanup of' : 'Cleaning'} unused imports...\n`);
  
  const results = [];
  let totalRemoved = 0;
  let filesModified = 0;
  
  for (const filePath of filePaths) {
    const result = cleanFile(filePath, dryRun);
    results.push(result);
    
    if (result.cleaned) {
      filesModified++;
      totalRemoved += result.removedCount;
      
      console.log(`📁 ${result.filePath}`);
      console.log(`   ${result.message}`);
      
      if (result.removedImports) {
        for (const removedImport of result.removedImports) {
          console.log(`   ❌ ${removedImport}`);
        }
      }
      console.log('');
    }
  }
  
  // Summary
  console.log('📊 CLEANUP SUMMARY');
  console.log('='.repeat(50));
  console.log(`Files processed: ${filePaths.length}`);
  console.log(`Files modified: ${filesModified}`);
  console.log(`Total imports removed: ${totalRemoved}`);
  
  if (totalRemoved === 0) {
    console.log('\n✅ No unused imports to clean!');
  } else {
    console.log(`\n${dryRun ? '🔍' : '✅'} ${dryRun ? 'Would remove' : 'Removed'} ${totalRemoved} unused imports from ${filesModified} files`);
  }
  
  return results;
}

// Export functions for use in other scripts
module.exports = { cleanFile, cleanUnusedImports, removeUnusedImports };

// CLI usage
if (require.main === module) {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const specificFiles = args.filter(arg => !arg.startsWith('--'));
  
  if (specificFiles.length > 0) {
    // Clean specific files
    cleanUnusedImports(specificFiles, dryRun);
  } else {
    console.log('Usage: node remove-unused-imports.js [--dry-run] [file1] [file2] ...');
    console.log('');
    console.log('Options:');
    console.log('  --dry-run    Show what would be removed without making changes');
    console.log('');
    console.log('Examples:');
    console.log('  node remove-unused-imports.js --dry-run app/page.tsx');
    console.log('  node remove-unused-imports.js app/page.tsx components/ui/button.tsx');
  }
}