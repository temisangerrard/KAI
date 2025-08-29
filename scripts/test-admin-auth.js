/**
 * Test script for Firebase Admin Auth capabilities
 * Run with: node scripts/test-admin-auth.js
 */

require('dotenv').config({ path: '.env.local' });

async function testAdminAuth() {
  try {
    console.log('🔐 Testing Firebase Admin Auth capabilities...');
    
    // Import the admin auth service
    const { AdminAuthService } = await import('../lib/auth/admin-auth.js');
    
    console.log('✅ Admin auth service imported successfully');
    
    // Test 1: Get all admin users
    console.log('\n=== Test 1: Get All Admin Users ===');
    const adminUsers = await AdminAuthService.getAllAdminUsers();
    console.log(`Found ${adminUsers.length} admin users:`);
    
    adminUsers.forEach((admin, index) => {
      console.log(`${index + 1}. ${admin.email} (${admin.displayName})`);
      console.log(`   - UID: ${admin.uid}`);
      console.log(`   - Source: ${admin.source}`);
      console.log(`   - Active: ${admin.isActive}`);
      console.log('');
    });
    
    // Test 2: Check admin status for a specific user
    if (adminUsers.length > 0) {
      const testUser = adminUsers[0];
      console.log(`=== Test 2: Check Admin Status for ${testUser.email} ===`);
      const isAdmin = await AdminAuthService.checkUserIsAdmin(testUser.uid);
      console.log(`Is admin: ${isAdmin}`);
    }
    
    console.log('\n✅ All tests completed successfully!');
    
  } catch (error) {
    console.error('❌ Error testing admin auth:', error);
    console.error('Error details:', error.message);
  }
}

testAdminAuth();