const https = require('https');
const { execSync } = require('child_process');

console.log('==================================================');
console.log('PRINTGO KIOSK - SECURE OTA UPDATER');
console.log('==================================================');

// Fetch the backend API URL from env or use the production default
require('dotenv').config();
const API_URL = process.env.API_URL || 'https://printgo-ssoi.onrender.com';
const VERSION_ENDPOINT = `${API_URL}/api/machines/agent-version`;

console.log(`Fetching pinned agent version from ${VERSION_ENDPOINT}...`);

https.get(VERSION_ENDPOINT, (res) => {
  let data = '';

  res.on('data', (chunk) => {
    data += chunk;
  });

  res.on('end', () => {
    try {
      const response = JSON.parse(data);
      if (response.success && response.hash) {
        const pinnedHash = response.hash;
        console.log(`✅ Received pinned hash: ${pinnedHash}`);
        
        console.log('Pulling latest changes...');
        execSync('git fetch origin', { stdio: 'inherit' });
        
        console.log(`Checking out pinned hash: ${pinnedHash}...`);
        execSync(`git checkout ${pinnedHash}`, { stdio: 'inherit' });
        
        console.log('Installing dependencies...');
        execSync('npm install --production', { stdio: 'inherit' });
        
        console.log('Restarting PM2 agent process...');
        try {
          execSync('pm2 restart printgo-agent', { stdio: 'inherit' });
        } catch (e) {
          console.log('PM2 not found or failed to restart. If running manually, please restart the process.');
        }

        console.log('==================================================');
        console.log(`OTA Update Complete! Agent is running version ${pinnedHash}.`);
        console.log('==================================================');
      } else {
        console.error('❌ Failed to retrieve pinned hash from backend.');
        process.exit(1);
      }
    } catch (e) {
      console.error('❌ Error parsing backend response:', e.message);
      process.exit(1);
    }
  });
}).on('error', (e) => {
  console.error('❌ Error connecting to backend:', e.message);
  process.exit(1);
});
