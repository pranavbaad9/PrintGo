const fs = require('fs');
const { PDFDocument } = require('pdf-lib');
const mammoth = require('mammoth');
const officeParser = require('officeparser');

const getPageCount = async (filePath, mimetype) => {
  try {
    if (mimetype === 'application/pdf') {
      const dataBuffer = fs.readFileSync(filePath);
      const pdfDoc = await PDFDocument.load(dataBuffer);
      return pdfDoc.getPageCount();
    } 
    else if (mimetype.includes('image/')) {
      return 1;
    }
    else if (mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
      const result = await mammoth.extractRawText({ path: filePath });
      const text = result.value;
      const wordCount = text.split(/\s+/).filter(word => word.length > 0).length;
      return Math.max(1, Math.ceil(wordCount / 400));
    }
    else if (mimetype === 'application/vnd.openxmlformats-officedocument.presentationml.presentation') {
      return new Promise((resolve) => {
        officeParser.parseOffice(filePath, function(data, err) {
          if (err) return resolve(1);
          const wordCount = data.split(/\s+/).filter(word => word.length > 0).length;
          resolve(Math.max(1, Math.ceil(wordCount / 50)));
        });
      });
    }
  } catch (err) {
    console.error('Error getting page count:', err);
    return 1; // Fallback
  }
  return 1;
};

const handleUpload = async (req, res, next) => {
  try {
    if (!req.file) {
      res.status(400);
      throw new Error('No file uploaded.');
    }

    const pages = await getPageCount(req.file.path, req.file.mimetype);

    res.json({
      success: true,
      file: {
        filename: req.file.filename,
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
