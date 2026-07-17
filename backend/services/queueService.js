const prisma = require('../utils/prisma');

const startPrintingProcess = async (shortId, io) => {
  try {
    const job = await prisma.job.findUnique({ where: { shortId } });
    if (!job) return;

    // Simulate print time: 2 seconds per page
    const pagesToPrint = job.pagesToPrint || job.pages || 1;
    const copies = job.copies || 1;
    const printTimeMs = pagesToPrint * copies * 2000;

    // Wait 2 seconds before printing
    setTimeout(async () => {
      const currentJob = await prisma.job.findUnique({ where: { shortId } });
      if (currentJob && currentJob.status === 'Waiting') {
        const updatedJob = await prisma.job.update({
          where: { shortId },
          data: { status: 'Printing' }
        });
        
        if (io) {
          io.emit('job_status_changed', updatedJob);
          // Emit to the physical printer agent
          io.emit('physical_print_job', {
            jobId: updatedJob.shortId,
            fileUrl: `/uploads/${updatedJob.filename}`,
            originalName: updatedJob.originalName,
            settings: {
              color: updatedJob.color,
              duplex: updatedJob.duplex,
              copies: updatedJob.copies
            },
            price: updatedJob.price
          });
        }
        console.log(`Job ${shortId} is now Printing...`);
        
        // After calculated print time, move to completed
        setTimeout(async () => {
          const finalCheck = await prisma.job.findUnique({ where: { shortId } });
          if (finalCheck && finalCheck.status === 'Printing') { 
            const completedJob = await prisma.job.update({
              where: { shortId },
              data: { status: 'Completed' }
            });
            if (io) io.emit('job_status_changed', completedJob);
            console.log(`Job ${shortId} is now Completed!`);
          }
        }, printTimeMs);
      }
    }, 2000);
  } catch (error) {
    console.error('Error in startPrintingProcess:', error);
  }
};

const calculateEstimatedWaitTime = async (shortId) => {
  try {
    const queue = await prisma.job.findMany({
      where: {
        status: { in: ['Waiting', 'Printing'] }
      },
      orderBy: { createdAt: 'asc' }
    });

    let waitTimeSeconds = 0;
    let jobsAhead = 0;

    for (const j of queue) {
      if (j.shortId === shortId) break; 
      const pagesToPrint = j.pagesToPrint || j.pages || 1;
      const copies = j.copies || 1;
      waitTimeSeconds += (pagesToPrint * copies * 2);
      jobsAhead++;
    }
    
    if (jobsAhead > 0) {
      waitTimeSeconds += (jobsAhead * 2); 
    }

    return Math.max(waitTimeSeconds, 3);
  } catch (error) {
    console.error('Error calculating ETA:', error);
    return 3;
  }
};

// Cleanup abandoned jobs every 15 minutes (remove Pending Payment jobs older than 1 hour)
setInterval(async () => {
  try {
    const oneHourAgo = new Date(Date.now() - 3600000);
    const result = await prisma.job.deleteMany({
      where: {
        status: 'Pending_Payment',
        createdAt: {
          lt: oneHourAgo
        }
      }
    });

    if (result.count > 0) {
      console.log(`🧹 Cleaned up ${result.count} abandoned jobs from database.`);
    }
  } catch (error) {
    console.error('Error during cleanup:', error);
  }
}, 15 * 60 * 1000);

module.exports = {
  startPrintingProcess,
  calculateEstimatedWaitTime
};
