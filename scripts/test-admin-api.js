/**
 * Test script for Admin API endpoints
 * Run with: node scripts/test-admin-api.js
 * Make sure your dev server is running on localhost:3000
 */

async function testAdminAPI() {
  try {
    console.log('🔐 Testing Admin API endpoints...');
    
    // Test 1: Get all admin users
    console.log('\n=== Test 1: GET /api/admin/manage-admins ===');
    const response = await fetch('http://localhost:3000/api/admin/manage-admins');
    
    if (response.ok) {
      const data = await response.json();
      console.log('✅ API Response:', JSON.stringify(data, null, 2));
      
      if (data.admins && data.admins.length > 0) {
        console.log(`\n📊 Found ${data.admins.length} admin users:`);
        data.admins.forEach((admin, index) => {
          console.log(`${index + 1}. ${admin.email} (${admin.displayName || 'No name'})`);
          console.log(`   - UID: ${admin.uid}`);
          console.log(`   - Source: ${admin.source}`);
          console.log(`   - Active: ${admin.isActive}`);
          console.log('');
        });
      }
    } else {
      console.error('❌ API request failed:', response.status, response.statusText);
      const errorText = await response.text();
      console.error('Error details:', errorText);
    }
    
  } catch (error) {
    console.error('❌ Error testing admin API:', error.message);
    console.log('\n💡 Make sure your development server is running:');
    console.log('   npm run dev');
  }
}

testAdminAPI();