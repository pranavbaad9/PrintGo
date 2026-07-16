const { jobs, saveJobs } = require('../data/jobsData');

// Helper to simulate the printing process
const startPrintingProcess = (jobId, io) => {
  const job = jobs.find(j => j.id === jobId);
  if (!job) return;

  // Simulate print time: 2 seconds per page
  const pagesToPrint = job.settings?.pagesToPrint || job.file?.pages || 1;
  const copies = job.settings?.copies || 1;
  const printTimeMs = pagesToPrint * copies * 2000;

  // After 2 seconds, move to printing
  setTimeout(() => {
    if (job.status === 'Waiting') {
      job.status = 'Printing';
      saveJobs();
      if(io) {
        io.emit('job_status_changed', job);
        // Emit to the physical printer agent
        io.emit('physical_print_job', {
          jobId: job.id,
          fileUrl: `/uploads/${job.file.filename}`, // Relative URL
          originalName: job.file.originalName,
          settings: job.settings,
          price: job.price
        });
      }
      console.log(`Job ${jobId} is now Printing...`);
      
      // After calculated print time, move to completed
      setTimeout(() => {
        if (job.status === 'Printing') { // Admin might have cancelled it
          job.status = 'Completed';
          saveJobs();
          if(io) io.emit('job_status_changed', job);
          console.log(`Job ${jobId} is now Completed!`);

          // WhatsApp Mock
          if (job.settings?.notifyWhatsApp && job.settings?.phoneNumber) {
            console.log(`\n======================================================`);
            console.log(`✅ [WHATSAPP MOCK] Message sent to ${job.settings.phoneNumber}`);
            console.log(`Message: "Hello! Your print job #${job.id} is completed and ready for pickup at PrintGo!"`);
            console.log(`======================================================\n`);
          }
        }
      }, printTimeMs);
    }
  }, 2000);
};

const calculateEstimatedWaitTime = (jobId) => {
  // Find position in queue
  const queue = jobs.filter(j => j.status === 'Waiting' || j.status === 'Printing');
  let waitTimeSeconds = 0;

  for (const j of queue) {
    if (j.id === jobId) break; // Only count jobs ahead of this one
    const pagesToPrint = j.settings?.pagesToPrint || j.file?.pages || 1;
    const copies = j.settings?.copies || 1;
    waitTimeSeconds += (pagesToPrint * copies * 2); // 2 seconds per page
  }
  
  // Add 2 seconds padding per job for mechanical delay
  const jobsAhead = queue.findIndex(j => j.id === jobId);
  if (jobsAhead > 0) {
    waitTimeSeconds += (jobsAhead * 2); 
  }

  // If waitTime is less than 3 seconds (maybe currently printing and almost done)
  return Math.max(waitTimeSeconds, 3);
};

// Cleanup abandoned jobs every 15 minutes (remove Pending Payment jobs older than 1 hour)
setInterval(() => {
  const oneHourAgo = Date.now() - 3600000;
  const initialLength = jobs.length;
  
  // Modifying the original array in place to maintain reference
  for (let i = jobs.length - 1; i >= 0; i--) {
    const job = jobs[i];
    if (job.status === 'Pending_Payment' && new Date(job.createdAt).getTime() < oneHourAgo) {
      jobs.splice(i, 1);
    }
  }

  if (jobs.length !== initialLength) {
    console.log(`🧹 Cleaned up ${initialLength - jobs.length} abandoned jobs from memory.`);
    saveJobs();
  }
}, 15 * 60 * 1000);

module.exports = {
  startPrintingProcess,
  calculateEstimatedWaitTime
};
