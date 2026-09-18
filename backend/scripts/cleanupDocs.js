require('dotenv').config();
const prisma = require('../src/utils/prisma');
const { deleteFile } = require('../src/utils/storage');
const logger = require('../src/utils/logger');

const cleanupAbandonedDocuments = async () => {
  try {
    logger.info('Starting abandoned document cleanup...');
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    // 1. Delete abandoned PrintJobs (PENDING_PAYMENT for > 24 hours)
    // This removes the foreign key restrict constraint on the documents.
    const abandonedJobs = await prisma.printJob.findMany({
      where: {
        status: 'PENDING_PAYMENT',
        createdAt: { lt: twentyFourHoursAgo }
      }
    });

    if (abandonedJobs.length > 0) {
      const jobIds = abandonedJobs.map(j => j.id);
      await prisma.printJob.deleteMany({
        where: { id: { in: jobIds } }
      });
      logger.info(`Deleted ${jobIds.length} abandoned PrintJobs`);
    }

    // 2. Find abandoned Documents (No associated jobs, older than 24 hours)
    const abandonedDocs = await prisma.document.findMany({
      where: {
        createdAt: { lt: twentyFourHoursAgo },
        printJobs: {
          none: {} // Document has 0 print jobs
        }
      }
    });

    if (abandonedDocs.length > 0) {
      for (const doc of abandonedDocs) {
        // Delete the physical file from S3 / Local Disk
        await deleteFile(doc.filename);
      }

      // Delete the database records
      const docIds = abandonedDocs.map(d => d.id);
      await prisma.document.deleteMany({
        where: { id: { in: docIds } }
      });
      logger.info(`Deleted ${docIds.length} abandoned Documents and their physical files`);
    } else {
      logger.info('No abandoned documents found to clean up.');
    }

    logger.info('Cleanup complete.');
  } catch (error) {
    logger.error('Error during cleanup:', error);
  } finally {
    await prisma.$disconnect();
  }
};

// If run directly
if (require.main === module) {
  cleanupAbandonedDocuments();
}

module.exports = cleanupAbandonedDocuments;
