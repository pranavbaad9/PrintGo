
const axios = require('axios');
// Uses your live Render backend
const API = 'http://localhost:5000/api';

async function setupCollege() {
  try {
    console.log('Logging into live server...');
    // Make sure these match the ADMIN_USER and ADMIN_PASS in your Render Environment Variables!
    const loginRes = await axios.post(API + '/auth/login', {
      email: 'superadmin@printgo.com', 
      password: 'Admin@123!'
    });
    
    const config = { headers: { Authorization: 'Bearer ' + loginRes.data.token } };

    console.log('Creating College Library account...');
    const cRes = await axios.post(API + '/companies', {
      name: 'College Library',
      contactEmail: 'library@college.edu',
      contactPhone: '1234567890'
    }, config);
    const companyId = cRes.data.company.id;

    console.log('Registering Physical Kiosk Machine...');
    const mRes = await axios.post(API + '/machines', {
      name: 'Main College Kiosk',
      location: 'Library 1st Floor',
      companyId: companyId
    }, config);

    console.log('\n=============================================');
    console.log('✅ SUCCESS! YOUR LIVE MACHINE_KEY IS:');
    console.log(mRes.data.machine.machineKey);
    console.log('=============================================\n');
    console.log('Copy the key above into your printer-agent/.env file!');

  } catch(e) {
    console.error('❌ Error:', e.response ? e.response.data : e.message);
    console.log('\nHint: If it says Incorrect email or password, ensure the email and password in this script match your Render ADMIN_USER and ADMIN_PASS environment variables!');
  }
}
setupCollege();
