const axios = require('axios');

const BASE_URL = 'http://localhost:3001/api/v1';

async function testTokenStorage() {
  console.log('🧪 Testing Token Storage System...\n');

  try {
    // Test 1: Get auth URL
    console.log('1️⃣ Testing auth URL generation...');
    const authResponse = await axios.get(`${BASE_URL}/calendar/auth-url`, {
      withCredentials: true
    });
    console.log('✅ Auth URL generated:', authResponse.data.authUrl.substring(0, 100) + '...\n');

    // Test 2: Check if user has tokens (should be empty initially)
    console.log('2️⃣ Checking user tokens (should be empty initially)...');
    try {
      const tokensResponse = await axios.get(`${BASE_URL}/calendar/tokens`, {
        withCredentials: true
      });
      console.log('✅ User tokens response:', tokensResponse.data);
    } catch (error) {
      if (error.response?.status === 401) {
        console.log('✅ Expected: User not authenticated');
      } else {
        console.log('❌ Unexpected error:', error.response?.data);
      }
    }
    console.log('');

    console.log('🎯 Next Steps:');
    console.log('1. Open the auth URL in your browser');
    console.log('2. Complete the OAuth flow');
    console.log('3. Run this test again to see stored tokens');
    console.log('4. Create a meeting to test calendar integration');

  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
  }
}

testTokenStorage();
