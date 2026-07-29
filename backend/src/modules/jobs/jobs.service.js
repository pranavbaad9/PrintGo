const prisma = require('../../utils/prisma');
const crypto = require('crypto');
const AppError = require('../../utils/AppError');
const logger = require('../../utils/logger');

const generateShortId = () => crypto.randomBytes(4).toString('hex');

const getAllJobs = async () => {
  return await prisma.printJob.findMany({
    orderBy: { createdAt: 'desc' }
  });
};

const getJobByShortId = async (shortId) => {
  const job = await prisma.printJob.findUnique({
    where: { shortId },
    include: { document: true, machine: true, payment: true }
  });
  if (!job) {
    throw new AppError('Job not found', 404);
  }
  return job;
};

const createJob = async (jobData) => {
  const { file, settings, cost, machineId } = jobData;
  
  // Create document first
  const document = await prisma.document.create({
    data: {
      originalName: file.originalName,
      filename: file.filename,
      mimetype: file.mimetype,
      size: file.size,
      pages: file.pages
    }
  });

  // Create job
  const newJob = await prisma.printJob.create({
    data: {
      shortId: generateShortId(),
      machineId: machineId || null,
      documentId: document.id,
      cost,
      color: settings.color,
      duplex: settings.duplex,
      copies: settings.copies,
      pagesToPrint: settings.pagesToPrint,
      pageRangeType: settings.pageRangeType,
      customRange: settings.customRange || null
    },
    include: { document: true }
  });
  
  logger.info(`Job created with shortId ${newJob.shortId}`);
  return newJob;
};

const updateJobStatus = async (shortId, status) => {
  const job = await prisma.printJob.update({
    where: { shortId },
    data: { status }
  });
  logger.info(`Job ${shortId} status updated to ${status}`);
  return job;
};

module.exports = {
  getAllJobs,
  getJobByShortId,
  createJob,
  updateJobStatus
};
