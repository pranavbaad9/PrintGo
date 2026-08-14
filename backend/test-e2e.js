const axios = require('axios');
const fs = require('fs');
const FormData = require('form-data');
const crypto = require('crypto');
require('dotenv').config();

const API = 'http://localhost:5000/api';

async function run() {
  try {
    console.log('--- PRINTGO E2E SIMULATION ---');
    
    // 1. Log in as Superadmin
    console.log('1. Logging in as superadmin...');
    const loginRes = await axios.post(`${API}/auth/login`, {
      email: 'admin',
      password: process.env.SUPERADMIN_PASSWORD || 'printgo_admin'
    });
    
    if (!loginRes.data.success) throw new Error('Login failed');
    const superAdminToken = loginRes.data.token;
    console.log('✅ Superadmin logged in.');

    const adminConfig = { headers: { Authorization: `Bearer ${superAdminToken}` } };

    // 2. Create Machine
    console.log('2. Creating a test machine...');
    const mRes = await axios.post(`${API}/machines`, {
      name: 'E2E Flow Machine',
      location: 'Testing Lab'
    }, adminConfig);
    const machine = mRes.data.machine;
    console.log(`✅ Machine created. ID: ${machine.id}, Key: ${machine.machineKey}`);

    // 3. Create Session
    console.log('3. Generating a kiosk session...');
    const sRes = await axios.post(`${API}/sessions/generate`, { machineId: machine.id });
    const sessionCode = sRes.data.session.code;
    const sessionId = sRes.data.session.id;
    console.log(`✅ Session created. Code: ${sessionCode}`);

    // 4. Verify Session (Mobile user scanning QR)
    console.log('4. Verifying session (Mobile user scanning QR)...');
    const vRes = await axios.post(`${API}/sessions/verify`, { code: sessionCode });
    const sessionToken = vRes.data.token;
    console.log('✅ Session verified. Token received.');
    
    const sessionConfig = { headers: { Authorization: `Bearer ${sessionToken}` } };

    // 5. Upload File
    console.log('5. Uploading a test document...');
    const formData = new FormData();
    // Create a tiny dummy PDF to upload
    fs.writeFileSync('dummy.pdf', '%PDF-1.4 dummy content');
    formData.append('document', fs.createReadStream('dummy.pdf'));
    
    const uRes = await axios.post(`${API}/upload`, formData, {
      headers: {
        ...formData.getHeaders(),
        Authorization: `Bearer ${sessionToken}`
      }
    });
    const fileData = uRes.data.file;
    console.log(`✅ File uploaded. URL: ${fileData.filename}`);

    // 6. Create Print Job (Price should be calculated server-side)
    console.log('6. Creating Print Job...');
    const jobRes = await axios.post(`${API}/jobs`, {
      file: fileData,
      settings: { color: 'bw', duplex: 'single', copies: 1, pageRangeType: 'all' }
    }, sessionConfig);
    const job = jobRes.data.job;
    console.log(`✅ Job created. Short ID: ${job.shortId}, Calculated Cost: ₹${job.cost}`);

    // 7. Initiate Payment
    console.log('7. Initiating Payment...');
    const pRes = await axios.post(`${API}/payments/order/${job.shortId}`, {}, sessionConfig);
    const gatewayOrderId = pRes.data.order.order_id;
    console.log(`✅ Payment initiated. Gateway Order ID: ${gatewayOrderId}`);

    // 8. Simulate Cashfree Webhook Success
    console.log('8. Simulating Cashfree Webhook (Payment Success)...');
    const webhookPayload = JSON.stringify({
      data: {
        order: { order_id: gatewayOrderId }
      },
      event_time: new Date().toISOString(),
      type: 'PAYMENT_SUCCESS_WEBHOOK'
    });

    const timestamp = Date.now().toString();
    const signature = crypto
      .createHmac('sha256', process.env.CASHFREE_SECRET_KEY || 'test_secret')
      .update(timestamp + webhookPayload)
      .digest('base64');

    const wRes = await axios.post(`${API}/payments/webhook/cashfree`, webhookPayload, {
      headers: {
        'x-webhook-timestamp': timestamp,
        'x-webhook-signature': signature,
        'Content-Type': 'application/json'
      }
    });
    console.log(`✅ Webhook processed. Status: ${wRes.status}`);

    // 9. Verify Job Status
    console.log('9. Checking final job status...');
    // We'll use superadmin to fetch the job directly from the DB bypassing session
    const getJobRes = await axios.get(`${API}/jobs/${job.shortId}`, sessionConfig);
    console.log(`✅ Final Job Status: ${getJobRes.data.job.status}`);

    if (getJobRes.data.job.status === 'PRINTING' || getJobRes.data.job.status === 'COMPLETED') {
       console.log('\n🚀 HAPPY PATH E2E TEST PASSED! The job successfully moved to the PRINTING state.');
    } else {
       throw new Error(`Job status is ${getJobRes.data.job.status}, expected PRINTING or COMPLETED`);
    }

    fs.unlinkSync('dummy.pdf');

  } catch (error) {
    if (fs.existsSync('dummy.pdf')) fs.unlinkSync('dummy.pdf');
    console.error('\n❌ TEST FAILED:');
    if (error.response) {
      console.error(error.response.status, error.response.data);
    } else {
      console.error(error.message);
    }
  }
}

run();
