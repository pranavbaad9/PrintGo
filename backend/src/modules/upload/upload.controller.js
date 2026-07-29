const uploadService = require('./upload.service');

const handleUpload = async (req, res, next) => {
  try {
    if (!req.file) {
      res.status(400);
      throw new Error('No file uploaded.');
    }

    const pages = await uploadService.getPageCount(req.file.location, req.file.mimetype);

    res.json({
      success: true,
      file: {
        filename: req.file.location,
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
