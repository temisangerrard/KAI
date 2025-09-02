const { config } = require('dotenv');

// Load environment variables
config({ path: '.env.local' });

console.log('🚀 Testing CDP API Configuration...');
console.log('CDP_API_KEY_NAME:', process.env.CDP_API_KEY_NAME ? 'SET' : 'NOT SET');
console.log('CDP_API_KEY_SECRET:', process.env.CDP_API_KEY_SECRET ? 'SET' : 'NOT SET');

if (process.env.CDP_API_KEY_NAME) {
  console.log('API Key Name:', process.env.CDP_API_KEY_NAME.substring(0, 8) + '...');
}

if (process.env.CDP_API_KEY_SECRET) {
  console.log('API Key Secret:', process.env.CDP_API_KEY_SECRET.substring(0, 10) + '...');
}

console.log('✅ Environment check complete!');