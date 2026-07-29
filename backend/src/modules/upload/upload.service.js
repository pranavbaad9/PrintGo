const axios = require('axios');
const { PDFDocument } = require('pdf-lib');
const mammoth = require('mammoth');
const logger = require('../../utils/logger');

const getPageCount = async (fileUrl, mimetype) => {
  try {
    if (mimetype === 'application/pdf') {
      const response = await axios.get(fileUrl, { responseType: 'arraybuffer' });
      const pdfDoc = await PDFDocument.load(response.data);
      return pdfDoc.getPageCount();
    } 
    else if (mimetype.includes('image/')) {
      return 1;
    }
    else if (mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
      const response = await axios.get(fileUrl, { responseType: 'arraybuffer' });
      const result = await mammoth.extractRawText({ buffer: response.data });
      const text = result.value;
      const wordCount = text.split(/\s+/).filter(word => word.length > 0).length;
      return Math.max(1, Math.ceil(wordCount / 400));
    }
    else if (mimetype === 'application/vnd.openxmlformats-officedocument.presentationml.presentation') {
      return 1;
    }
  } catch (err) {
    logger.error('Error getting page count:', err);
    return 1; // Fallback
  }
  return 1;
};

module.exports = {
  getPageCount
};
