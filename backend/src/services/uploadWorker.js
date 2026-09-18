const { Worker } = require('bullmq');
const { connection } = require('./redisClient');
const uploadService = require('../modules/upload/upload.service');

const initUploadWorker = () => {
  if (!process.env.REDIS_HOST) {
    console.warn("No Redis configured, upload background worker disabled.");
    return null;
  }

  const worker = new Worker('uploadQueue', async (job) => {
    const { fileUrl, mimetype } = job.data;
    try {
      const pages = await uploadService.getPageCount(fileUrl, mimetype);
      return pages;
    } catch (error) {
      console.error(`Upload worker failed for job ${job.id}:`, error);
      throw error;
    }
  }, { connection, concurrency: 5 });

  worker.on('failed', (job, err) => {
    console.error(`Upload Job ${job.id} failed with error ${err.message}`);
  });

  return worker;
};

module.exports = { initUploadWorker };
