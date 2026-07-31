const { Queue, Worker } = require('bullmq');
const { connection } = require('./redisClient');
const prisma = require('../utils/prisma');

let printQueue = null;
let useRedis = true;

try {
  // Check if we can use BullMQ/Redis
  printQueue = new Queue('printQueue', { connection });
} catch(e) {
  useRedis = false;
  console.warn("BullMQ initialization failed, using in-memory queue fallback.");
}

let globalIo = null;

const processJob = async (shortId) => {
  try {
    const dbJob = await prisma.printJob.findUnique({ 
      where: { shortId },
      include: { document: true }
    });
    if (!dbJob) return;

    if (dbJob.status === 'WAITING') {
      const updatedJob = await prisma.printJob.update({
        where: { shortId },
        data: { status: 'PRINTING' },
        include: { document: true }
      });
      
      if (globalIo) {
        globalIo.emit('job_status_changed', updatedJob);
        
        const printData = {
          jobId: updatedJob.shortId,
          fileUrl: updatedJob.document ? updatedJob.document.filename : '', 
          originalName: updatedJob.document ? updatedJob.document.originalName : '',
          settings: {
            color: updatedJob.color,
            duplex: updatedJob.duplex,
            copies: updatedJob.copies
          },
          price: updatedJob.cost
        };
        
        if (updatedJob.machineId) {
          globalIo.to(`machine_${updatedJob.machineId}`).emit('physical_print_job', printData);
        } else {
          globalIo.emit('physical_print_job', printData);
        }
      }
      
      console.log(`Job ${shortId} is now PRINTING...`);
      
      const pagesToPrint = updatedJob.pagesToPrint || 1;
      const copies = updatedJob.copies || 1;
      const printTimeMs = pagesToPrint * copies * 2000;
      
      await new Promise(resolve => setTimeout(resolve, printTimeMs));
      
      const completedJob = await prisma.printJob.update({
        where: { shortId },
        data: { status: 'COMPLETED' },
        include: { document: true }
      });
      
      if (globalIo) globalIo.emit('job_status_changed', completedJob);
      console.log(`Job ${shortId} is now COMPLETED!`);
    }
  } catch(e) {
    console.error(`Error processing job ${shortId}:`, e);
  }
};

const initWorker = (io) => {
  globalIo = io;
  if (!useRedis) return null;
  
  try {
    const worker = new Worker('printQueue', async (job) => {
      const { shortId } = job.data;
      await processJob(shortId);
    }, { connection });

    worker.on('failed', (job, err) => {
      console.error(`Job ${job.id} failed with error ${err.message}`);
    });
    return worker;
  } catch(e) {
    useRedis = false;
    console.warn("Failed to start BullMQ worker, falling back to in-memory.");
    return null;
  }
};

const startPrintingProcess = async (shortId, io) => {
  if (!globalIo && io) globalIo = io;
  
  if (useRedis && printQueue) {
    try {
      await printQueue.add('printJob', { shortId }, {
        attempts: 3,
        backoff: { type: 'exponential', delay: 1000 }
      });
    } catch(e) {
      console.warn("Failed to add to Redis queue, running synchronously.");
      processJob(shortId);
    }
  } else {
    // In-memory fallback: just process asynchronously
    processJob(shortId);
  }
};

const calculateEstimatedWaitTime = async (shortId) => {
  try {
    const queueJobs = await prisma.printJob.findMany({
      where: {
        status: { in: ['WAITING', 'PRINTING'] }
      },
      orderBy: { createdAt: 'asc' }
    });

    let waitTimeSeconds = 0;
    let jobsAhead = 0;

    for (const j of queueJobs) {
      if (j.shortId === shortId) break; 
      const pagesToPrint = j.pagesToPrint || 1;
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
    const result = await prisma.printJob.deleteMany({
      where: {
        status: 'PENDING_PAYMENT',
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
