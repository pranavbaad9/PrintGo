const axios = require('axios');
const { PDFDocument } = require('pdf-lib');
const mammoth = require('mammoth');
const officeParser = require('officeparser');
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
      // DOCX: Extract text and estimate pages from word count
      // ~400 words per page is a reasonable A4 single-spaced estimate
      const response = await axios.get(fileUrl, { responseType: 'arraybuffer' });
      const result = await mammoth.extractRawText({ buffer: response.data });
      const text = result.value;
      const wordCount = text.split(/\s+/).filter(word => word.length > 0).length;
      const estimatedPages = Math.max(1, Math.ceil(wordCount / 400));
      logger.info(`DOCX page estimation: ${wordCount} words → ${estimatedPages} pages`);
      return estimatedPages;
    }
    else if (mimetype === 'application/vnd.openxmlformats-officedocument.presentationml.presentation') {
      // P1-007: PPTX slide counting using officeparser
      // Previously always returned 1 — now parses the actual slide count
      const response = await axios.get(fileUrl, { responseType: 'arraybuffer' });
      const text = await officeParser.parseOfficeAsync(response.data);
      // officeParser separates slides with newlines; count non-empty sections
      // Each slide typically produces a text block separated by double newlines
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
