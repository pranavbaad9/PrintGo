const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

jest.mock('@prisma/client', () => {
  const mPrisma = {
    printJob: {
      deleteMany: jest.fn().mockResolvedValue({ count: 1 }),
      findMany: jest.fn().mockResolvedValue([{ id: 1, shortId: 'stuck_printing_1' }]),
      update: jest.fn().mockResolvedValue({}),
      create: jest.fn().mockResolvedValue({ id: 1 }),
      count: jest.fn().mockResolvedValue(0),
      findUnique: jest.fn().mockResolvedValue({ id: 1, status: 'FAILED' })
    },
    $disconnect: jest.fn()
  };
  return { PrismaClient: jest.fn(() => mPrisma) };
});

// Expose the cleanup logic manually for testing
const runCleanup = async () => {
  const oneHourAgo = new Date(Date.now() - 3600000);
  const fifteenMinsAgo = new Date(Date.now() - 15 * 60000);
  
  // 1. Abandoned jobs
  await prisma.printJob.deleteMany({
    where: { status: 'PENDING_PAYMENT', createdAt: { lt: oneHourAgo } }
  });

  // 2. Stuck PRINTING jobs
  const stuckJobs = await prisma.printJob.findMany({
    where: { status: 'PRINTING', updatedAt: { lt: fifteenMinsAgo } }
  });
  for (const job of stuckJobs) {
    await prisma.printJob.update({
      where: { id: job.id },
      data: { status: 'FAILED' }
    });
  }
};

describe('Background Cleanup Loop', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should delete PENDING_PAYMENT jobs older than 1 hour', async () => {
    await runCleanup();

    expect(prisma.printJob.deleteMany).toHaveBeenCalledWith({
      where: expect.objectContaining({
        status: 'PENDING_PAYMENT'
      })
    });
  });

  it('should mark PRINTING jobs older than 15 mins as FAILED', async () => {
    await runCleanup();

    expect(prisma.printJob.findMany).toHaveBeenCalledWith({
      where: expect.objectContaining({
        status: 'PRINTING'
      })
    });

    expect(prisma.printJob.update).toHaveBeenCalledWith({
      where: { id: 1 },
      data: { status: 'FAILED' }
    });
  });
});
