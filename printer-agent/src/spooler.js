const os = require('os');
const fs = require('fs');

class SpoolerMonitor {
  constructor({ execFile, printerName }) {
    this.execFile = execFile;
    this.printerName = printerName;
  }

  checkPrinterStatus(socket) {
    if (!this.printerName || this.printerName === 'SimulationMode') return;
    
    this.execFile('powershell.exe', ['-Command', `Get-WmiObject -Class Win32_Printer -Filter "Name='${this.printerName}'" | Select-Object PrinterStatus, ExtendedPrinterStatus, ErrorState`], (error, stdout) => {
      if (error) {
        console.error(`Error querying printer status: ${error.message}`);
        return;
      }
      
      let isError = false;
      let errorMessage = '';

      if (stdout.includes('4') && stdout.includes('Paper Out')) {
        isError = true;
        errorMessage = 'Out of Paper';
      } else if (stdout.includes('True') && stdout.includes('Offline')) { 
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
        printerName: this.printerName,
        telemetry: {
          memoryUsage: `${memoryUsage}%`,
          uptime: `${uptime}s`,
          platform: os.platform(),
          arch: os.arch()
        },
        timestamp: new Date().toISOString()
      });
    });
  }

  startPollingJob(jobId, localFilePath, socket) {
    if (!this.printerName || this.printerName === 'SimulationMode') {
      console.log(`⚠️  SIMULATION MODE: Bypassing physical print for job ${jobId}`);
      socket.emit('print_spooler_success', { jobId });
      setTimeout(() => {
        socket.emit('print_physical_success', { jobId });
        if (fs.existsSync(localFilePath)) fs.unlinkSync(localFilePath);
      }, 3000);
      return null;
    }

    console.log(`👀 Monitoring spooler queue for Job ${jobId}...`);
    let checkAttempts = 0;
    let wasSeenInQueue = false; 
    const maxAttempts = 120; // 2 minutes (120 * 1s)
    
    const pollSpooler = setInterval(() => {
      checkAttempts++;
      if (checkAttempts > maxAttempts) {
        clearInterval(pollSpooler);
        console.error(`⚠️  Spooler monitoring timed out for Job ${jobId}. Emitting physical error.`);
        socket.emit('print_physical_error', { jobId, error: 'Spooler Timeout' });
        if (fs.existsSync(localFilePath)) fs.unlinkSync(localFilePath);
        return;
      }

      this.execFile('powershell.exe', ['-Command', `Get-PrintJob -PrinterName '${this.printerName}' | Select-Object DocumentName, JobStatus | ConvertTo-Json`], (error, stdout) => {
        if (error) return; 
        if (!stdout || stdout.trim() === '') {
          if (wasSeenInQueue || checkAttempts > 5) {
            clearInterval(pollSpooler);
            console.log(`✅ Job ${jobId} physically completed (cleared from spooler)!`);
            socket.emit('print_physical_success', { jobId });
            if (fs.existsSync(localFilePath)) fs.unlinkSync(localFilePath);
          }
          return;
        }

        try {
          let jobs = JSON.parse(stdout);
          if (!Array.isArray(jobs)) jobs = [jobs];

          const ourJob = jobs.find(j => j.DocumentName && j.DocumentName.includes(jobId));
          
          if (ourJob) {
            wasSeenInQueue = true; 
            const status = ourJob.JobStatus || '';
            if (status.includes('Error') || status.includes('PaperOut') || status.includes('PaperJam') || status.includes('Blocked')) {
              clearInterval(pollSpooler);
              console.error(`❌ Physical Print Error for Job ${jobId}: ${status}`);
              socket.emit('print_physical_error', { jobId, error: status });
              this.execFile('powershell.exe', ['-Command', `Get-PrintJob -PrinterName '${this.printerName}' | Where-Object DocumentName -like '*${jobId}*' | Remove-PrintJob`]);
              if (fs.existsSync(localFilePath)) fs.unlinkSync(localFilePath);
            }
          } else if (wasSeenInQueue) {
            clearInterval(pollSpooler);
            console.log(`✅ Job ${jobId} physically completed (cleared from spooler)!`);
            socket.emit('print_physical_success', { jobId });
            if (fs.existsSync(localFilePath)) fs.unlinkSync(localFilePath);
          }
        } catch (e) {
          // JSON parse error, ignore and retry next second
        }
      });
    }, 1000);

    return pollSpooler;
  }
}

module.exports = SpoolerMonitor;
