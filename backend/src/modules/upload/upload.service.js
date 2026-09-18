const axios = require('axios');
const { PDFDocument } = require('pdf-lib');
const mammoth = require('mammoth');
const officeParser = require('officeparser');
const logger = require('../../utils/logger');

const withTimeout = (promise, ms) => {
  let timeout;
  const timeoutPromise = new Promise((_, reject) => {
    timeout = setTimeout(() => reject(new Error('Operation timed out (possible decompression bomb)')), ms);
  });
  return Promise.race([promise, timeoutPromise]).finally(() => clearTimeout(timeout));
};

const getPageCount = async (fileUrl, mimetype, isEncrypted = false, claimedPages = 1) => {
  if (isEncrypted) {
    logger.info(`E2E Encrypted file detected. Bypassing server-side parse. Claimed pages: ${claimedPages}`);
    return claimedPages;
  }
  
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
      // P2: Protect against decompression bombs with a 5-second timeout
      const result = await withTimeout(mammoth.extractRawText({ buffer: response.data }), 5000);
      const text = result.value;
      const wordCount = text.split(/\s+/).filter(word => word.length > 0).length;
      const estimatedPages = Math.max(1, Math.ceil(wordCount / 400));
      logger.info(`DOCX page estimation: ${wordCount} words → ${estimatedPages} pages`);
      return estimatedPages;
    }
    else if (mimetype === 'application/vnd.openxmlformats-officedocument.presentationml.presentation') {
      const response = await axios.get(fileUrl, { responseType: 'arraybuffer' });
      // P2: Protect against decompression bombs with a 5-second timeout
      const text = await withTimeout(officeParser.parseOfficeAsync(response.data), 5000);
      const slideBlocks = text.split(/\n\n+/).filter(block => block.trim().length > 0);
      const slideCount = Math.max(1, slideBlocks.length);
      logger.info(`PPTX slide estimation: ${slideCount} slides detected`);
      return slideCount;
    }
  } catch (err) {
    logger.error('Error getting page count:', err);
    return 1; // Fallback — charge for at least 1 page
  }
  return 1;
};

module.exports = {
  getPageCount
};
