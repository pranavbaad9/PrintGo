require('dotenv').config();
const { io } = require('socket.io-client');
const axios = require('axios');
const ptp = require('pdf-to-printer');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { exec } = require('child_process');

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

// P3-003: Printer Compatibility & Driver Validation
if (PRINTER_NAME) {
  try {
    const { execSync } = require('child_process');
    const stdout = execSync(`powershell "Get-Printer -Name '${PRINTER_NAME}' -ErrorAction Stop | Select-Object Name | ConvertTo-Json"`).toString();
    if (!stdout || stdout.trim() === '') {
      throw new Error('Printer not found');
    }
  } catch (err) {
    console.error(`🔥 FATAL ERROR: Printer '${PRINTER_NAME}' does not exist on this machine.`);
    console.error('Please verify the PRINTER_NAME in .env matches the Windows printer name exactly.');
    process.exit(1);
  }
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

socket.on('connect', () => {
  console.log(`✅ Connected to cloud backend! (Socket ID: ${socket.id})`);
  
  // Periodically send printer status
  setInterval(() => {
    checkPrinterStatus();
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

    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const memoryUsage = ((totalMem - freeMem) / totalMem * 100).toFixed(2);
    const uptime = os.uptime();

    socket.emit('printer_status_update', {
      isError,
      errorMessage,
      printerName: PRINTER_NAME,
      telemetry: {
        memoryUsage: `${memoryUsage}%`,
        uptime: `${uptime}s`,
        platform: os.platform(),
        arch: os.arch()
      },
      timestamp: new Date().toISOString()
    });
  });
};

socket.on('physical_print_job', async (jobData) => {
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
      responseType: 'stream',
      headers: { 'x-machine-key': MACHINE_KEY }
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
        printOptions.pages = jobData.settings.customRange;
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
      console.log(`👀 Monitoring spooler queue for Job ${jobData.jobId}...`);
      let checkAttempts = 0;
      const maxAttempts = 120; // 2 minutes (120 * 1s)
      
      const pollSpooler = setInterval(() => {
        checkAttempts++;
        if (checkAttempts > maxAttempts) {
          clearInterval(pollSpooler);
          console.warn(`⚠️  Spooler monitoring timed out for Job ${jobData.jobId}`);
          return;
        }

        exec(`powershell "Get-PrintJob -PrinterName '${PRINTER_NAME}' | Select-Object DocumentName, JobStatus | ConvertTo-Json"`, (error, stdout) => {
          if (error) return; // ignore errors and retry
          if (!stdout || stdout.trim() === '') {
            // No jobs in queue! This means our job finished printing successfully and was cleared.
            clearInterval(pollSpooler);
            console.log(`✅ Job ${jobData.jobId} physically completed (cleared from spooler)!`);
            socket.emit('print_physical_success', { jobId: jobData.jobId });
            return;
          }

          try {
            let jobs = JSON.parse(stdout);
            if (!Array.isArray(jobs)) jobs = [jobs];

            // Find our job (document name usually contains the filename we sent)
            const ourJob = jobs.find(j => j.DocumentName && j.DocumentName.includes(jobData.jobId));
            
            if (!ourJob) {
              // Our job is no longer in the queue. Success!
              clearInterval(pollSpooler);
              console.log(`✅ Job ${jobData.jobId} physically completed (cleared from spooler)!`);
              socket.emit('print_physical_success', { jobId: jobData.jobId });
            } else {
              // Check for errors
              const status = ourJob.JobStatus || '';
              if (status.includes('Error') || status.includes('PaperOut') || status.includes('PaperJam') || status.includes('Blocked')) {
                clearInterval(pollSpooler);
                console.error(`❌ Physical Print Error for Job ${jobData.jobId}: ${status}`);
                socket.emit('print_physical_error', { jobId: jobData.jobId, error: status });
                exec(`powershell "Get-PrintJob -PrinterName '${PRINTER_NAME}' | Where-Object DocumentName -like '*${jobData.jobId}*' | Remove-PrintJob"`);
              }
            }
          } catch (e) {
            // JSON parse error, ignore and retry next second
          }
        });
      }, 1000); // Check every second
    } else {
      // Simulation mode bypass (No physical printer)
      console.log(`⚠️  SIMULATION MODE: Bypassing physical print for job ${jobData.jobId}`);
      socket.emit('print_spooler_success', { jobId: jobData.jobId });
      setTimeout(() => {
        socket.emit('print_physical_success', { jobId: jobData.jobId });
      }, 3000);
    }

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

// Send heartbeat every 30 seconds to keep machine online status active
setInterval(() => {
  socket.emit('heartbeat');
}, 30000);
