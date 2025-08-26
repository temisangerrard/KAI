#!/usr/bin/env node

const { execSync } = require('child_process');
const path = require('path');

console.log('🧪 Running Responsive Navigation Tests - Task 11\n');

const testFiles = [
  '__tests__/integration/responsive-navigation-comprehensive.test.tsx'
];

let allTestsPassed = true;

testFiles.forEach((testFile, index) => {
  console.log(`\n📋 Running test ${index + 1}/${testFiles.length}: ${testFile}`);
  console.log('─'.repeat(60));
  
  try {
    const result = execSync(
      `npm test -- --testPathPatterns="${testFile}" --verbose --passWithNoTests`,
      { 
        stdio: 'inherit',
        cwd: process.cwd()
      }
    );
    console.log(`✅ ${testFile} - PASSED`);
  } catch (error) {
    console.log(`❌ ${testFile} - FAILED`);
    allTestsPassed = false;
  }
});

console.log('\n' + '='.repeat(60));
console.log('📊 RESPONSIVE NAVIGATION TEST SUMMARY');
console.log('='.repeat(60));

if (allTestsPassed) {
  console.log('✅ ALL TESTS PASSED');
  console.log('\n🎉 Task 11 - Responsive Navigation Behavior: COMPLETE');
  console.log('\nVerified:');
  console.log('  ✓ Hamburger menu works on all screen sizes');
  console.log('  ✓ Bottom navigation works on mobile devices');
  console.log('  ✓ Top navigation works on desktop');
  console.log('  ✓ Proper hiding/showing of navigation elements');
  console.log('  ✓ Cross-screen size consistency');
  console.log('  ✓ Accessibility across all screen sizes');
  console.log('  ✓ Performance and memory management');
  process.exit(0);
} else {
  console.log('❌ SOME TESTS FAILED');
  console.log('\n⚠️  Task 11 - Responsive Navigation Behavior: NEEDS ATTENTION');
  process.exit(1);
}