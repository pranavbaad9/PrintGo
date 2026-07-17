require('dotenv').config();
const { io } = require('socket.io-client');
const axios = require('axios');
const ptp = require('pdf-to-printer');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

process.on('uncaughtException', (err) => {
  console.error('🔥 CRITICAL ERROR: Uncaught Exception:', err);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('🔥 CRITICAL ERROR: Unhandled Rejection at:', promise, 'reason:', reason);
});

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:5000';
const PRINTER_NAME = process.env.PRINTER_NAME || null; 

console.log(`🖨️  PrintGo Enterprise Printer Agent Starting...`);
console.log(`🔗 Connecting to cloud backend: ${BACKEND_URL}`);

const tempDir = path.join(__dirname, 'temp');
if (!fs.existsSync(tempDir)) {
  fs.mkdirSync(tempDir);
}

const socket = io(BACKEND_URL, { transports: ['websocket'] });

socket.on('connect', () => {
  console.log(`✅ Connected to cloud backend! (Socket ID: ${socket.id})`);
  
  // Register as printer agent
  socket.emit('register_printer', { printerName: PRINTER_NAME || 'Windows Default' });
  
  // Periodically send printer status
  setInterval(() => {
    checkPrinterStatus();
  }, 30000); // every 30s
});

socket.on('disconnect', () => {
  console.log(`❌ Disconnected from backend. Attempting to reconnect...`);
});

const checkPrinterStatus = () => {
  if (!PRINTER_NAME) return;
  // Use powershell to check if printer is offline or out of paper
  exec(`powershell "Get-WmiObject -Class Win32_Printer -Filter \\"Name='${PRINTER_NAME}'\\" | Select-Object PrinterStatus, ExtendedPrinterStatus, ErrorState"`, (error, stdout) => {
    if (error) {
      console.error(`Error querying printer status: ${error.message}`);
      return;
    }
    
    let isError = false;
    let errorMessage = '';

    // ErrorState 4 = Paper Out, 5 = Paper Jam, 6 = Offline
    if (stdout.includes('4') && stdout.includes('Paper Out')) {
      isError = true;
      errorMessage = 'Out of Paper';
    } else if (stdout.includes('True') && stdout.includes('Offline')) { // 'WorkOffline' header exists, we want to check if the value is 'True'
      isError = true;
      errorMessage = 'Printer Offline';
    } else if (stdout.includes('5')) {
      isError = true;
      errorMessage = 'Paper Jam';
    }

    socket.emit('printer_status_update', {
      isError,
      errorMessage,
      printerName: PRINTER_NAME,
      timestamp: new Date().toISOString()
    });
  });
};

socket.on('physical_print_job', async (jobData) => {
  console.log(`\n======================================================`);
  console.log(`📥 NEW PRINT JOB RECEIVED! [Job ID: ${jobData.jobId}]`);
  console.log(`📄 Document: ${jobData.originalName}`);
  console.log(`======================================================`);

  const fileUrl = `${BACKEND_URL}${jobData.fileUrl}`;
  const localFilePath = path.join(tempDir, `${jobData.jobId}.pdf`);

  try {
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

    const printOptions = {};
    if (PRINTER_NAME) {
      printOptions.printer = PRINTER_NAME;
    }
    
    // Attempt printing
    await ptp.print(localFilePath, printOptions);
    console.log(`🖨️  SUCCESS: Job ${jobData.jobId} sent to Windows Print Spooler!`);
    
    // Notify backend that spooler accepted the job
    socket.emit('print_spooler_success', { jobId: jobData.jobId });

    setTimeout(() => {
      if (fs.existsSync(localFilePath)) {
        fs.unlinkSync(localFilePath);
      }
    }, 60000);

  } catch (error) {
    console.error(`❌ ERROR processing Job ${jobData.jobId}:`, error.message);
    socket.emit('print_spooler_error', { jobId: jobData.jobId, error: error.message });
  }
});
