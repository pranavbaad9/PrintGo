require('dotenv').config();

process.on('uncaughtException', (err) => {
  console.error('🔥 CRITICAL ERROR: Uncaught Exception:', err);
  // Keep the process alive or perform emergency cleanup
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('🔥 CRITICAL ERROR: Unhandled Rejection at:', promise, 'reason:', reason);
});
const { io } = require('socket.io-client');
const axios = require('axios');
const ptp = require('pdf-to-printer');
const fs = require('fs');
const path = require('path');
const os = require('os');

const BACKEND_URL = process.env.BACKEND_URL || 'https://printgo-backend.onrender.com';
const PRINTER_NAME = process.env.PRINTER_NAME || null; // If null, uses Windows default printer

console.log(`🖨️  PrintGo Local Printer Agent Starting...`);
console.log(`🔗 Connecting to cloud backend: ${BACKEND_URL}`);
if (PRINTER_NAME) {
  console.log(`🎯 Target Printer: ${PRINTER_NAME}`);
} else {
  console.log(`🎯 Target Printer: Windows Default Printer`);
}

// Ensure temp directory exists for downloaded PDFs
const tempDir = path.join(__dirname, 'temp');
if (!fs.existsSync(tempDir)) {
  fs.mkdirSync(tempDir);
}

const socket = io(BACKEND_URL);

socket.on('connect', () => {
  console.log(`✅ Connected to cloud backend! (Socket ID: ${socket.id})`);
  console.log(`📡 Listening for print jobs...`);
});

socket.on('disconnect', () => {
  console.log(`❌ Disconnected from backend. Attempting to reconnect...`);
});

socket.on('physical_print_job', async (jobData) => {
  console.log(`\n======================================================`);
  console.log(`📥 NEW PRINT JOB RECEIVED! [Job ID: ${jobData.jobId}]`);
  console.log(`📄 Document: ${jobData.originalName}`);
  console.log(`⚙️  Settings: ${jobData.settings.copies} copies, ${jobData.settings.color.toUpperCase()}, ${jobData.settings.duplex} sided`);
  console.log(`======================================================`);

  const fileUrl = `${BACKEND_URL}${jobData.fileUrl}`;
  const localFilePath = path.join(tempDir, `${jobData.jobId}.pdf`);

  try {
    // 1. Download the PDF from the cloud
    console.log(`⬇️  Downloading PDF from cloud...`);
    const response = await axios({
      method: 'GET',
      url: fileUrl,
      responseType: 'stream',
    });

    const writer = fs.createWriteStream(localFilePath);
    response.data.pipe(writer);

    await new Promise((resolve, reject) => {
      writer.on('finish', resolve);
      writer.on('error', reject);
    });

    console.log(`✅ Download complete. Sending to printer...`);

    // 2. Prepare print options
    const printOptions = {};
    if (PRINTER_NAME) {
      printOptions.printer = PRINTER_NAME;
    }
    
    // Note: pdf-to-printer uses SumatraPDF under the hood. 
    // Basic settings mapping (some advanced settings might require specific SumatraPDF args)
    const sumatraArgs = [];
    
    // Copies
    if (jobData.settings.copies > 1) {
        sumatraArgs.push(`-print-settings "${jobData.settings.copies}x"`);
    }

    if (sumatraArgs.length > 0) {
        // We pass the raw Sumatra args using the 'sumatraPdfArgs' array (if supported by the lib) 
        // or just let it print with defaults for now.
    }

    // 3. Print the file
    await ptp.print(localFilePath, printOptions);
    console.log(`🖨️  SUCCESS: Job ${jobData.jobId} sent to Windows Print Spooler!`);

    // Cleanup: Delete the local PDF after 1 minute
    setTimeout(() => {
      if (fs.existsSync(localFilePath)) {
        fs.unlinkSync(localFilePath);
        console.log(`🧹 Cleaned up temporary file for Job ${jobData.jobId}`);
      }
    }, 60000);

  } catch (error) {
    console.error(`❌ ERROR processing Job ${jobData.jobId}:`, error.message);
  }
});
