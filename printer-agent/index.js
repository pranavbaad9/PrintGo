require('dotenv').config();
const { io } = require('socket.io-client');
const axios = require('axios');
const ptp = require('pdf-to-printer');
const fs = require('fs');
const path = require('path');
const os = require('os');
const util = require('util');
const { exec, execFile } = require('child_process');
const execFileAsync = util.promisify(execFile);
const crypto = require('crypto');
const forge = require('node-forge');
const pdfParse = require('pdf-parse');
const SpoolerMonitor = require('./src/spooler');
const { scanAndCreatePDF } = require('./src/scanner');

process.on('uncaughtException', (err) => {
  console.error('🔥 CRITICAL ERROR: Uncaught Exception:', err);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('🔥 CRITICAL ERROR: Unhandled Rejection at:', promise, 'reason:', reason);
});

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:5000';
const PRINTER_NAME = process.env.PRINTER_NAME || null; 
const MACHINE_KEY = process.env.MACHINE_KEY;

if (!MACHINE_KEY) {
  console.error('🔥 FATAL ERROR: MACHINE_KEY is not defined in .env');
  process.exit(1);
}

if (PRINTER_NAME && !/^[a-zA-Z0-9_\-\s\(\)\.]+$/.test(PRINTER_NAME)) {
  console.error('🔥 FATAL ERROR: PRINTER_NAME contains invalid characters. Only alphanumeric, space, underscore, dash, and parentheses are allowed.');
  process.exit(1);
}

// P3-003: Printer Compatibility & Driver Validation
async function validatePrinter() {
    if (PRINTER_NAME === 'SimulationMode') {
        console.log(`\n🖨️  Running in SIMULATION MODE. Skipping printer validation.`);
        return;
    }
    try {
        await execFileAsync('powershell.exe', ['-Command', `Get-Printer -Name '${PRINTER_NAME}' -ErrorAction Stop | Select-Object Name`]);
        console.log(`\n✅ Validated local printer: ${PRINTER_NAME}`);
    } catch (error) {
        console.error(`\n🔥 FATAL ERROR: Printer '${PRINTER_NAME}' does not exist on this machine.`);
        console.error(`Please verify the PRINTER_NAME in .env matches the Windows printer name exactly.\n`);
        process.exit(1);
    }
}

if (PRINTER_NAME) {
    validatePrinter();
} else {
  console.warn('⚠️  WARNING: PRINTER_NAME is not set. Running in simulation mode (no physical printing).');
}

console.log(`🖨️  PrintGo Enterprise Printer Agent Starting...`);
console.log(`🔗 Connecting to cloud backend: ${BACKEND_URL}`);

const tempDir = path.join(__dirname, 'temp');
if (!fs.existsSync(tempDir)) {
  fs.mkdirSync(tempDir);
}

const socket = io(BACKEND_URL, { 
  transports: ['websocket'],
  auth: { machineKey: MACHINE_KEY }
});

// Generate RSA Keypair on startup for E2EE
console.log('🔐 Generating RSA-OAEP Keypair for End-to-End Encryption...');
const rsaKeypair = forge.pki.rsa.generateKeyPair({ bits: 2048, e: 0x10001 });
const publicKeyPem = forge.pki.publicKeyToPem(rsaKeypair.publicKey);
const privateKeyPem = forge.pki.privateKeyToPem(rsaKeypair.privateKey);
console.log('✅ Keys generated successfully.');

const spoolerMonitor = new SpoolerMonitor({ execFile, printerName: PRINTER_NAME });

socket.on('connect', () => {
  console.log(`✅ Connected to cloud backend! (Socket ID: ${socket.id})`);
  
  // Register Public Key with Backend for E2EE
  socket.emit('register_public_key', { publicKey: publicKeyPem });
  
  // Periodically send printer status
  setInterval(() => {
    spoolerMonitor.checkPrinterStatus(socket);
  }, 30000); // every 30s
});

socket.on('printer_registration_failed', (data) => {
  console.error('❌ Registration Failed:', data.error);
  process.exit(1);
});

socket.on('printer_registered_success', (data) => {
  console.log(`✅ Registration Success. Machine: ${data.name}`);
});

socket.on('machine_suspended', (data) => {
  console.error(`❌ MACHINE SUSPENDED: ${data.message}`);
  console.error(`Stopping printer agent...`);
  process.exit(1);
});

socket.on('disconnect', () => {
  console.log(`❌ Disconnected from backend. Attempting to reconnect...`);
});

socket.on('connect_error', (err) => {
  console.error(`🔌 Connection Error: ${err.message}`);
});

// checkPrinterStatus logic has been moved to src/spooler.js

socket.on('physical_print_job', async (jobData) => {
  // Command Injection Prevention (P0)
  if (!jobData.jobId || !/^[a-zA-Z0-9_-]+$/.test(jobData.jobId)) {
    console.error(`❌ REJECTED Job: Invalid jobId format (potential injection): ${jobData.jobId}`);
    return;
  }

  console.log(`\n======================================================`);
  console.log(`📥 NEW PRINT JOB RECEIVED! [Job ID: ${jobData.jobId}]`);
  console.log(`📄 Document: ${jobData.originalName}`);
  console.log(`======================================================`);

  const fileUrl = jobData.fileUrl.startsWith('http') 
    ? jobData.fileUrl 
    : `${BACKEND_URL}${jobData.fileUrl}`;
  
  const localFilePath = path.join(tempDir, `${jobData.jobId}.pdf`);

  try {
    console.log(`⬇️  Downloading PDF from cloud...`);
    const response = await axios({
      method: 'GET',
      url: fileUrl,
      responseType: 'arraybuffer', // Get as buffer for decryption
      headers: { 'x-machine-key': MACHINE_KEY }
    });

    let fileBuffer = response.data;

    // E2E Decryption & Page Verification
    if (jobData.encryptedKey && jobData.iv) {
      console.log(`🔒 Encrypted job detected. Decrypting...`);
      try {
        // 1. Decrypt AES Key using RSA Private Key
        const encryptedKeyBuffer = Buffer.from(jobData.encryptedKey, 'base64');
        const decryptedKey = crypto.privateDecrypt(
          {
            key: privateKeyPem,
            padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
            oaepHash: 'sha256'
          },
          encryptedKeyBuffer
        );

        // 2. Decrypt File Payload using AES-GCM
        const decipher = crypto.createDecipheriv('aes-256-gcm', Buffer.from(jobData.iv, 'base64'), decryptedKey);
        
        // Extract Auth Tag (last 16 bytes)
        const authTag = fileBuffer.slice(-16);
        const encryptedData = fileBuffer.slice(0, -16);
        
        decipher.setAuthTag(authTag);
        
        const decryptedBuffer = Buffer.concat([decipher.update(encryptedData), decipher.final()]);
        fileBuffer = decryptedBuffer;
        
        console.log(`✅ Decryption successful. Validating page count...`);
        
        // 3. Verify Page Count (Fraud Protection)
        const pdfData = await pdfParse(fileBuffer);
        const actualPages = pdfData.numpages;
        const claimedPages = jobData.pagesToPrint || 1;
        
        if (actualPages > claimedPages) {
          throw new Error(`Fraud detected! Claimed pages: ${claimedPages}, Actual pages: ${actualPages}`);
        }
        
        console.log(`📄 Page count validated (${actualPages} pages).`);
      } catch (decErr) {
        throw new Error(`Security Exception: ${decErr.message}`);
      }
    }

    fs.writeFileSync(localFilePath, fileBuffer);
    console.log(`✅ File saved to disk. Sending to printer...`);

    const printOptions = {};
    if (PRINTER_NAME) {
      printOptions.printer = PRINTER_NAME;
    }
    
    // Apply settings if available
    if (jobData.settings) {
      if (jobData.settings.copies) {
        printOptions.copies = jobData.settings.copies;
      }
      if (jobData.settings.color === 'bw') {
        printOptions.monochrome = true;
      }
      // P1-004: Pass duplex setting to printer
      if (jobData.settings.duplex === 'double') {
        printOptions.duplex = true;
      }
      if (jobData.settings.pageRangeType === 'custom' && jobData.settings.customRange) {
        // P1: Validate customRange input to prevent command injection
        if (/^[0-9,-]+$/.test(jobData.settings.customRange)) {
          printOptions.pages = jobData.settings.customRange;
        } else {
          console.error(`⚠️  WARNING: Invalid customRange input detected: ${jobData.settings.customRange}. Ignoring.`);
        }
      }
    }
    
    if (PRINTER_NAME) {
      console.log(`⚙️  Print options:`, JSON.stringify(printOptions));
      
      // Attempt printing
      await ptp.print(localFilePath, printOptions);
      console.log(`🖨️  SUCCESS: Job ${jobData.jobId} sent to Windows Print Spooler!`);
      
      // Notify backend that spooler accepted the job
      socket.emit('print_spooler_success', { jobId: jobData.jobId });

      // P3-001: True Print Verification via Spooler Polling
      spoolerMonitor.startPollingJob(jobData.jobId, localFilePath, socket);
    } else {
      // Simulation mode bypass (No physical printer)
      spoolerMonitor.startPollingJob(jobData.jobId, localFilePath, socket);
    }



  } catch (error) {
    console.error(`❌ ERROR processing Job ${jobData.jobId}:`, error.message);
    socket.emit('print_spooler_error', { jobId: jobData.jobId, error: error.message });
    if (fs.existsSync(localFilePath)) fs.unlinkSync(localFilePath);
  }
});

socket.on('start_adf_scan', async ({ sessionId }) => {
  console.log(`\n======================================================`);
  console.log(`📥 NEW COPY SCAN REQUESTED! [Session ID: ${sessionId}]`);
  console.log(`======================================================`);

  try {
    const scanId = crypto.randomBytes(8).toString('hex');
    const result = await scanAndCreatePDF(scanId);
    
    console.log(`✅ Document scanned successfully (${result.pages} pages). Uploading to backend...`);
    
    const FormData = require('form-data');
    const form = new FormData();
    form.append('file', fs.createReadStream(result.pdfPath));
    form.append('sessionId', sessionId);
    
    await axios.post(`${BACKEND_URL}/api/upload`, form, {
      headers: {
        ...form.getHeaders(),
        'x-machine-key': MACHINE_KEY
      }
    });
    
    console.log(`✅ Upload complete for session ${sessionId}. Cloud will handle payment and printing.`);
    
    // Clean up local temp file
    fs.unlinkSync(result.pdfPath);
  } catch (error) {
    console.error(`❌ ERROR during ADF Scan:`, error.message);
    // You could emit an error back to the session if desired
  }
});

// Send heartbeat every 30 seconds to keep machine online status active
setInterval(() => {
  socket.emit('heartbeat');
}, 30000);

// P4-001: Render Free Tier Keep-Alive
// Render spins down free instances after 15 mins of inactivity. 
// A raw HTTP GET request every 10 minutes ensures the server stays awake while the kiosk is online.
setInterval(async () => {
  try {
    await axios.get(`${BACKEND_URL}/api/health`);
    console.log(`📡 Keep-Alive ping sent to ${BACKEND_URL}/api/health`);
  } catch (error) {
    console.error(`⚠️  Keep-Alive ping failed: ${error.message}`);
  }
}, 10 * 60 * 1000); // 10 minutes
