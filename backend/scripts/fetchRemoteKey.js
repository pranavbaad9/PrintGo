const axios = require('axios');
const fs = require('fs');
const path = require('path');

const API = 'https://printgo-ssoi.onrender.com/api';

async function run() {
  try {
    console.log('Logging into Render backend...');
    const loginRes = await axios.post(`${API}/auth/login`, {
      email: 'admin',
      password: 'pg_admin_P#9xK2m$Q'
    });
    
    const token = loginRes.data.token;
    console.log('Logged in successfully!');
    
    console.log('Fetching machines...');
    const machinesRes = await axios.get(`${API}/machines`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    const machines = machinesRes.data.machines;
    if (!machines || machines.length === 0) {
      console.log('No machines found in remote DB. Creating one...');
      const createRes = await axios.post(`${API}/machines`, {
        name: 'Kiosk 1',
        location: 'Main Lobby'
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      console.log('Created machine:', createRes.data.machine.id);
      updateEnv(createRes.data.machine.machineKey);
    } else {
      console.log('Found active machine:', machines[0].id);
      updateEnv(machines[0].machineKey);
    }
  } catch (e) {
    console.error('Error:', e.response ? e.response.data : e.message);
  }
}

function updateEnv(machineKey) {
  const envPath = path.join(__dirname, '..', 'printer-agent', '.env');
  const envContent = `BACKEND_URL="https://printgo-ssoi.onrender.com"\nMACHINE_KEY="${machineKey}"\nPRINTER_NAME=""\n`;
  fs.writeFileSync(envPath, envContent);
  console.log('Successfully updated printer-agent/.env with the remote machine key!');
}

run();
