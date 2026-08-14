const path = require('path');
const fs = require('fs');
const prisma = require('../../utils/prisma');
const AppError = require('../../utils/AppError');

const serveDocument = async (req, res, next) => {
  try {
    const { filename } = req.params;
    if (!filename) {
      return next(new AppError('Filename is required', 400));
    }

    // fileAuth middleware ensures req.user, req.session, or req.machine is present
    
    // Find the document and its associated print job
    const document = await prisma.document.findFirst({
      where: { filename },
      include: {
        printJob: {
          include: {
            machine: true
          }
        }
      }
    });

    if (!document) {
      return next(new AppError('File not found', 404));
    }

    // Ownership Validation
    let isAuthorized = false;

    if (req.machine) {
      // Requested by a Printer Agent (Machine)
      if (document.printJob && document.printJob.length > 0) {
        isAuthorized = document.printJob.some(job => job.machineId === req.machine.id);
      }
    } else if (req.session) {
      // Requested by a Kiosk/Mobile Session
      if (document.printJob && document.printJob.length > 0) {
        isAuthorized = document.printJob.some(job => job.machineId === req.session.machineId || job.machineId === null);
      } else {
        // If the document has no jobs yet (just uploaded), we will permit access.
        // It's a temporary state and the document will be linked to a job soon.
        if (document.printJob.length === 0) {
          isAuthorized = true;
        }
      }
    } else if (req.user) {
      // Requested by an Admin User
      if (req.user.role === 'SUPERADMIN') {
        isAuthorized = true;
      } else {
        // Normal admin can only view files for their company's machines
        if (document.printJob && document.printJob.length > 0) {
          isAuthorized = document.printJob.some(job => job.machine && job.machine.companyId === req.user.companyId);
        }
      }
    }

    if (!isAuthorized) {
      return next(new AppError('Access denied: You do not have permission to view this file', 403));
    }

    const uploadsDir = path.join(__dirname, '../../../../uploads');
    const filePath = path.join(uploadsDir, filename);

    if (!fs.existsSync(filePath)) {
      return next(new AppError('File not found on disk', 404));
    }

    res.sendFile(filePath);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  serveDocument
};
