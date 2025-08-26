#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Read package.json
const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
const dependencies = { ...packageJson.dependencies, ...packageJson.devDependencies };

// Packages that are used in build processes or configs (should not be removed)
const buildAndConfigPackages = [
  'next',
  'react',
  'react-dom',
  'typescript',
  'eslint',
  'eslint-config-next',
  'postcss',
  'tailwindcss',
  'autoprefixer',
  '@types/node',
  '@types/react',
  '@types/react-dom'
];

// Function to search for package usage in codebase
function searchPackageUsage(packageName) {
  try {
    // Search for direct imports
    const importResult = execSync(`grep -r "from ['\"]${packageName}" . --include="*.ts" --include="*.tsx" --include="*.js" --include="*.jsx" --exclude-dir=node_modules --exclude-dir=.next --exclude-dir=.git`, { encoding: 'utf8' });
    if (importResult.trim()) return true;
  } catch (e) {
    // No matches found
  }

  try {
    // Search for require statements
    const requireResult = execSync(`grep -r "require(['\"]${packageName}" . --include="*.ts" --include="*.tsx" --include="*.js" --include="*.jsx" --exclude-dir=node_modules --exclude-dir=.next --exclude-dir=.git`, { encoding: 'utf8' });
    if (requireResult.trim()) return true;
  } catch (e) {
    // No matches found
  }

  return false;
}

// Function to check if package is used in config files
function checkConfigUsage(packageName) {
  const configFiles = [
    'next.config.mjs',
    'tailwind.config.ts',
    'postcss.config.mjs',
    'tsconfig.json',
    '.eslintrc.json',
    'components.json'
  ];

  for (const configFile of configFiles) {
    if (fs.existsSync(configFile)) {
      const content = fs.readFileSync(configFile, 'utf8');
      if (content.includes(packageName)) {
        return true;
      }
    }
  }
  return false;
}

console.log('🔍 Analyzing package usage...\n');

const unusedPackages = [];
const usedPackages = [];

// Analyze each package
for (const [packageName, version] of Object.entries(dependencies)) {
  console.log(`Checking ${packageName}...`);
  
  // Skip build and config packages
  if (buildAndConfigPackages.includes(packageName)) {
    console.log(`  ✅ ${packageName} - Build/Config package (keeping)`);
    usedPackages.push(packageName);
    continue;
  }

  // Check for usage in codebase
  const isUsedInCode = searchPackageUsage(packageName);
  const isUsedInConfig = checkConfigUsage(packageName);

  if (isUsedInCode || isUsedInConfig) {
    console.log(`  ✅ ${packageName} - Used`);
    usedPackages.push(packageName);
  } else {
    console.log(`  ❌ ${packageName} - Potentially unused`);
    unusedPackages.push(packageName);
  }
}

console.log('\n📊 Analysis Results:');
console.log(`Total packages: ${Object.keys(dependencies).length}`);
console.log(`Used packages: ${usedPackages.length}`);
console.log(`Potentially unused packages: ${unusedPackages.length}`);

if (unusedPackages.length > 0) {
  console.log('\n🗑️  Potentially unused packages:');
  unusedPackages.forEach(pkg => {
    console.log(`  - ${pkg} (${dependencies[pkg]})`);
  });
  
  console.log('\n⚠️  Manual verification needed for:');
  console.log('  - Packages used in dynamic imports');
  console.log('  - Packages used in build processes');
  console.log('  - Packages used by other dependencies');
} else {
  console.log('\n✅ All packages appear to be in use!');
}

// Export results for further processing
const results = {
  total: Object.keys(dependencies).length,
  used: usedPackages,
  potentiallyUnused: unusedPackages,
  analysis: unusedPackages.map(pkg => ({
    name: pkg,
    version: dependencies[pkg],
    reason: 'No direct imports found in codebase'
  }))
};

fs.writeFileSync('package-analysis.json', JSON.stringify(results, null, 2));
console.log('\n📄 Detailed analysis saved to package-analysis.json');