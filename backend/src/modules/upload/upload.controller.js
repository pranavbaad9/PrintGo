const uploadService = require('./upload.service');

const handleUpload = async (req, res, next) => {
  try {
    if (!req.file) {
      res.status(400);
      throw new Error('No file uploaded.');
    }

    // Use S3 URL if available, otherwise fallback to local URL
    const fileUrl = req.file.location || `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`;
    const pages = await uploadService.getPageCount(fileUrl, req.file.mimetype);

    res.json({
      success: true,
      file: {
        filename: fileUrl,
        originalName: req.file.originalname,
        size: req.file.size,
        mimetype: req.file.mimetype,
        pages: pages 
      }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { handleUpload };
