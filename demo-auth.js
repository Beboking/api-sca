#!/usr/bin/env node

/**
 * Demo script to test the authentication system
 * Run with: node demo-auth.js
 */

const axios = require('axios');

const BASE_URL = 'http://localhost:3000';

async function demo() {
  console.log('🔐 Chess API Authentication Demo\n');

  try {
    // Step 1: Generate access code
    console.log('1. Generating access code...');
    const generateResponse = await axios.post(`${BASE_URL}/auth/generate-code`, {
      userInfo: {
        name: 'Demo User',
        purpose: 'Testing authentication system'
      }
    });

    const { accessCode, codeId, expiresAt } = generateResponse.data;
    console.log(`✅ Access code generated successfully!`);
    console.log(`   Code ID: ${codeId}`);
    console.log(`   Expires: ${expiresAt}`);
    console.log(`   Token: ${accessCode.substring(0, 50)}...\n`);

    // Step 2: Test protected endpoint
    console.log('2. Testing protected endpoint...');
    const searchResponse = await axios.get(`${BASE_URL}/games/search`, {
      headers: {
        'Authorization': `Bearer ${accessCode}`
      },
      params: {
        player: 'Magnus',
        limit: 5
      }
    });

    console.log(`✅ Search successful! Found ${searchResponse.data.games.length} games`);
    console.log(`   Total results: ${searchResponse.data.pagination.total}`);
    console.log(`   Search time: ${searchResponse.data.searchTime}ms\n`);

    // Step 3: Get access code info
    console.log('3. Getting access code information...');
    const infoResponse = await axios.get(`${BASE_URL}/auth/info`, {
      headers: {
        'Authorization': `Bearer ${accessCode}`
      }
    });

    console.log(`✅ Access code info retrieved:`);
    console.log(`   Usage count: ${infoResponse.data.usageCount}`);
    console.log(`   Time remaining: ${infoResponse.data.timeRemaining}`);
    console.log(`   Created: ${infoResponse.data.createdAt}\n`);

    // Step 4: Test without authentication
    console.log('4. Testing endpoint without authentication...');
    try {
      await axios.get(`${BASE_URL}/games/search?player=Magnus`);
      console.log('❌ This should have failed!');
    } catch (error) {
      if (error.response && error.response.status === 401) {
        console.log('✅ Correctly rejected unauthenticated request');
        console.log(`   Error: ${error.response.data.message}\n`);
      } else {
        throw error;
      }
    }

    // Step 5: Validate access code
    console.log('5. Validating access code...');
    const validateResponse = await axios.post(`${BASE_URL}/auth/validate`, {
      access_code: accessCode
    });

    console.log(`✅ Access code validation successful:`);
    console.log(`   Valid: ${validateResponse.data.valid}`);
    console.log(`   Usage count: ${validateResponse.data.usageCount}\n`);

    // Step 6: Test query parameter authentication
    console.log('6. Testing query parameter authentication...');
    const queryResponse = await axios.get(`${BASE_URL}/games/search`, {
      params: {
        access_code: accessCode,
        player: 'Carlsen',
        limit: 3
      }
    });

    console.log(`✅ Query parameter auth successful! Found ${queryResponse.data.games.length} games\n`);

    // Step 7: Get auth statistics
    console.log('7. Getting authentication statistics...');
    const statsResponse = await axios.get(`${BASE_URL}/auth/stats`, {
      headers: {
        'Authorization': `Bearer ${accessCode}`
      }
    });

    console.log(`✅ Auth statistics retrieved:`);
    console.log(`   Total codes: ${statsResponse.data.totalCodes}`);
    console.log(`   Active codes: ${statsResponse.data.activeCodes}`);
    console.log(`   Total usage: ${statsResponse.data.totalUsage}\n`);

    // Step 8: Revoke access code
    console.log('8. Revoking access code...');
    const revokeResponse = await axios.post(`${BASE_URL}/auth/revoke`, {}, {
      headers: {
        'Authorization': `Bearer ${accessCode}`
      }
    });

    console.log(`✅ Access code revoked: ${revokeResponse.data.message}`);

    // Step 9: Test revoked code
    console.log('9. Testing revoked access code...');
    try {
      await axios.get(`${BASE_URL}/games/search`, {
        headers: {
          'Authorization': `Bearer ${accessCode}`
        },
        params: { player: 'Magnus' }
      });
      console.log('❌ This should have failed!');
    } catch (error) {
      if (error.response && error.response.status === 401) {
        console.log('✅ Correctly rejected revoked access code');
        console.log(`   Error: ${error.response.data.message}\n`);
      } else {
        throw error;
      }
    }

    console.log('🎉 Authentication demo completed successfully!');
    console.log('\n📝 Summary:');
    console.log('   ✅ Access code generation');
    console.log('   ✅ Bearer token authentication');
    console.log('   ✅ Query parameter authentication');
    console.log('   ✅ Access code validation');
    console.log('   ✅ Usage tracking');
    console.log('   ✅ Access code revocation');
    console.log('   ✅ Proper rejection of invalid/revoked codes');

  } catch (error) {
    console.error('❌ Demo failed:', error.message);
    if (error.response) {
      console.error('   Status:', error.response.status);
      console.error('   Data:', JSON.stringify(error.response.data, null, 2));
    }
    process.exit(1);
  }
}

// Check if server is running
async function checkServer() {
  try {
    await axios.get(`${BASE_URL}/health`);
    return true;
  } catch (error) {
    return false;
  }
}

async function main() {
  console.log('Checking if server is running...');
  const serverRunning = await checkServer();
  
  if (!serverRunning) {
    console.log('❌ Server is not running. Please start the server first:');
    console.log('   npm start');
    process.exit(1);
  }
  
  console.log('✅ Server is running. Starting demo...\n');
  await demo();
}

if (require.main === module) {
  main();
}

module.exports = { demo };
