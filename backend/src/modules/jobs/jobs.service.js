const prisma = require('../../utils/prisma');
const crypto = require('crypto');
const AppError = require('../../utils/AppError');
const logger = require('../../utils/logger');

const generateShortId = () => crypto.randomBytes(4).toString('hex');

const getAllJobs = async (user) => {
  const where = {};
  if (user && user.role !== 'SUPERADMIN') {
    where.machine = { companyId: user.companyId };
  }

  return await prisma.printJob.findMany({
    where,
    include: {
      document: true,
      machine: true,
      customer: true
    },
    orderBy: { createdAt: 'desc' },
    take: 100
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
  const { file, settings, machineId } = jobData;
  
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

  // Server-side price calculation — client-sent cost is IGNORED
  const { calculatePrice } = require('../../services/pricing.service');
  const { cost, pagesToPrint } = calculatePrice(settings, { pages: file.pages });

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
      pagesToPrint,
      pageRangeType: settings.pageRangeType,
      customRange: settings.customRange || null
    },
    include: { document: true }
  });
  
  logger.info(`Job created with shortId ${newJob.shortId}, server-calculated cost: ₹${cost}`);
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
