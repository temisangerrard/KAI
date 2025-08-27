// Simple test script to check token issuance API
// Run with: node test-token-issuance.js

const testTokenIssuance = async () => {
  try {
    const response = await fetch('http://localhost:3000/api/admin/tokens/issue', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        userId: 'test-user-id',
        amount: 100,
        reason: 'Test issuance',
        adminId: 'admin-test',
        adminName: 'Test Admin',
        requiresApproval: false
      })
    });

    const data = await response.json();
    console.log('Response status:', response.status);
    console.log('Response data:', data);
  } catch (error) {
    console.error('Error:', error);
  }
};

// Uncomment to test:
// testTokenIssuance();

console.log('Test script ready. Uncomment the last line to run the test.');