const axios = require('axios');
const fs = require('fs');
const path = require('path');

const URL = 'https://printgo-backend.onrender.com/api/auth/session/create';
// Or maybe the frontend is talking to ssoi? Let's check both
const URL2 = 'https://printgo-ssoi.onrender.com/api/auth/session/create';

async function poll() {
  console.log('Polling Render for exposed machine key...');
  try {
    const res = await axios.post(URL2, {});
    if (res.data.tempMachineKeyForSetup) {
      console.log('Found key on ssoi:', res.data.tempMachineKeyForSetup);
      updateEnv(res.data.tempMachineKeyForSetup, 'https://printgo-ssoi.onrender.com');
      process.exit(0);
    } else {
      console.log('Key not yet exposed. Deploying...');
    }
  } catch (err) {
    console.error('Error on ssoi:', err.message);
  }

  setTimeout(poll, 10000);
}

function updateEnv(machineKey, backendUrl) {
  const envPath = path.join(__dirname, '..', 'printer-agent', '.env');
  const envContent = `BACKEND_URL="${backendUrl}"\nMACHINE_KEY="${machineKey}"\nPRINTER_NAME=""\n`;
  fs.writeFileSync(envPath, envContent);
  console.log('Successfully updated printer-agent/.env!');
}

poll();
