const { Queue, Worker } = require('bullmq');
const { connection } = require('./redisClient');
const prisma = require('../utils/prisma');

const printQueue = new Queue('printQueue', { connection });

let globalIo = null;

const initWorker = (io) => {
  globalIo = io;
  
  const worker = new Worker('printQueue', async (job) => {
    const { shortId } = job.data;
    
    const dbJob = await prisma.job.findUnique({ where: { shortId } });
    if (!dbJob) return;

    if (dbJob.status === 'Waiting') {
      const updatedJob = await prisma.job.update({
        where: { shortId },
        data: { status: 'Printing' }
      });
      
      if (globalIo) {
        globalIo.emit('job_status_changed', updatedJob);
        
        const printData = {
          jobId: updatedJob.shortId,
          fileUrl: updatedJob.filename, // Note: now a full S3 URL
          originalName: updatedJob.originalName,
          settings: {
            color: updatedJob.color,
            duplex: updatedJob.duplex,
            copies: updatedJob.copies
          },
          price: updatedJob.price
        };
        
        if (updatedJob.machineId) {
          globalIo.to(`machine_${updatedJob.machineId}`).emit('physical_print_job', printData);
        } else {
          globalIo.emit('physical_print_job', printData);
        }
      }
      
      console.log(`Job ${shortId} is now Printing...`);
      
      // Simulate print time for completion
      const pagesToPrint = dbJob.pagesToPrint || dbJob.pages || 1;
      const copies = dbJob.copies || 1;
      const printTimeMs = pagesToPrint * copies * 2000;
      
      await new Promise(resolve => setTimeout(resolve, printTimeMs));
      
      const completedJob = await prisma.job.update({
        where: { shortId },
        data: { status: 'Completed' }
      });
      
      if (globalIo) globalIo.emit('job_status_changed', completedJob);
      console.log(`Job ${shortId} is now Completed!`);
    }
  }, { connection });

  worker.on('failed', (job, err) => {
    console.error(`Job ${job.id} failed with error ${err.message}`);
  });

  return worker;
};

const startPrintingProcess = async (shortId, io) => {
  if (!globalIo && io) globalIo = io;
  
  // Add job to BullMQ
  await printQueue.add('printJob', { shortId }, {
    attempts: 3,
    backoff: { type: 'exponential', delay: 1000 }
  });
};

const calculateEstimatedWaitTime = async (shortId) => {
  try {
    const queueJobs = await prisma.job.findMany({
      where: {
        status: { in: ['Waiting', 'Printing'] }
      },
      orderBy: { createdAt: 'asc' }
    });

    let waitTimeSeconds = 0;
    let jobsAhead = 0;

    for (const j of queueJobs) {
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

// Cleanup abandoned jobs every 15 minutes
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
  calculateEstimatedWaitTime,
  initWorker
};
