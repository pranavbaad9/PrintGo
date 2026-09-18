const { Queue } = require('bullmq');
const { connection } = require('../../services/redisClient');
const uploadService = require('./upload.service');

let uploadQueue = null;
if (connection) {
  uploadQueue = new Queue('uploadQueue', { connection });
}

const handleUpload = async (req, res, next) => {
  try {
    if (!req.file) {
      res.status(400);
      throw new Error('No file uploaded.');
    }

    const fileUrl = req.file.location || `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`;
    
    let pages = 1;
    const isEncrypted = req.body.isEncrypted === 'true';
    const claimedPages = parseInt(req.body.claimedPages) || 1;

    if (uploadQueue && !isEncrypted) {
      const job = await uploadQueue.add('countPages', { fileUrl, mimetype: req.file.mimetype });
      pages = await job.waitUntilFinished(new (require('bullmq').QueueEvents)('uploadQueue', { connection }));
    } else {
      // Fallback or Encrypted bypass
      pages = await uploadService.getPageCount(fileUrl, req.file.mimetype, isEncrypted, claimedPages);
    }

    const fileData = {
      filename: fileUrl,
      originalName: req.file.originalname,
      size: req.file.size,
      mimetype: req.file.mimetype,
      pages: pages 
    };

    // If uploaded by Kiosk Agent for a specific session (ADF Copy Flow)
    if (req.body.sessionId) {
      const io = req.app.get('io');
      if (io) {
        io.to(req.body.sessionId).emit('scan_completed', fileData);
      }
    }

    res.json({
      success: true,
      file: fileData
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { handleUpload };
