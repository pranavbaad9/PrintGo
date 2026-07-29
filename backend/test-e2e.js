const axios = require('axios');
const API = 'http://localhost:5000/api';

async function run() {
  try {
    console.log('1. Logging in as superadmin...');
    const loginRes = await axios.post(`${API}/auth/login`, {
      username: 'admin',
      password: 'printgo_admin' // From .env
    });
    
    if (!loginRes.data.success) throw new Error('Login failed');
    const superAdminToken = loginRes.data.token;
    console.log('✅ Superadmin logged in. Token:', superAdminToken.substring(0, 20) + '...');

    const adminConfig = { headers: { Authorization: `Bearer ${superAdminToken}` } };

    console.log('2. Creating a Franchisee...');
    const fRes = await axios.post(`${API}/franchisees`, {
      name: 'E2E Test Store',
      email: `test_${Date.now()}@example.com`,
      phone: '9998887776'
    }, adminConfig);
    
    if (!fRes.data.success) throw new Error('Franchisee creation failed');
    const franchiseeId = fRes.data.franchisee.id;
    const franchiseePass = fRes.data.defaultPassword;
    console.log(`✅ Franchisee created. ID: ${franchiseeId}`);

    console.log('3. Creating a Machine for Franchisee...');
    const mRes = await axios.post(`${API}/machines`, {
      name: 'E2E Kiosk',
      location: 'Mall',
      franchiseeId,
      subscriptionPlan: 'Free'
    }, adminConfig);

    if (!mRes.data.success) throw new Error('Machine creation failed');
    console.log(`✅ Machine created. Key: ${mRes.data.machine.machineKey}`);

    console.log('4. Logging in as Franchisee...');
    const floginRes = await axios.post(`${API}/auth/login`, {
      username: fRes.data.franchisee.email,
      password: franchiseePass
    });

    if (!floginRes.data.success) throw new Error('Franchisee login failed');
    const fToken = floginRes.data.token;
    console.log('✅ Franchisee logged in. Role:', floginRes.data.role);

    const fConfig = { headers: { Authorization: `Bearer ${fToken}` } };

    console.log('5. Fetching Franchisee Dashboard data...');
    const dashRes = await axios.get(`${API}/franchisee/my-machines`, fConfig);
    if (!dashRes.data.success) throw new Error('Failed to fetch dashboard data');
    console.log(`✅ Dashboard data fetched. Machines count: ${dashRes.data.machines.length}`);

    console.log('\n🚀 ALL TESTS PASSED! E2E Architecture is completely functioning.');

  } catch (error) {
    console.error('❌ TEST FAILED:', error.response ? JSON.stringify(error.response.data, null, 2) : error.message);
  }
}

run();
