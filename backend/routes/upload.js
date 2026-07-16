const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const { PDFDocument } = require('pdf-lib');
const mammoth = require('mammoth');
const officeParser = require('officeparser');

const router = express.Router();

// Multer storage configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${uuidv4()}${ext}`);
  }
});

const fileFilter = (req, file, cb) => {
  const allowedTypes = [
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // docx
    'application/vnd.openxmlformats-officedocument.presentationml.presentation', // pptx
    'image/jpeg',
    'image/png'
  ];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only PDF, DOCX, PPTX, JPG, PNG are allowed.'), false);
  }
};

const upload = multer({ 
  storage, 
  limits: { fileSize: 25 * 1024 * 1024 }, // 25MB limit
  fileFilter 
});

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
      // DOCX estimation (~400 words per page)
      const result = await mammoth.extractRawText({ path: filePath });
      const text = result.value;
      const wordCount = text.split(/\s+/).filter(word => word.length > 0).length;
      return Math.max(1, Math.ceil(wordCount / 400));
    }
    else if (mimetype === 'application/vnd.openxmlformats-officedocument.presentationml.presentation') {
      // PPTX estimation
      return new Promise((resolve) => {
        officeParser.parseOffice(filePath, function(data, err) {
          if (err) return resolve(1); // Fallback
          const wordCount = data.split(/\s+/).filter(word => word.length > 0).length;
          resolve(Math.max(1, Math.ceil(wordCount / 50))); // Roughly 50 words per slide on average
        });
      });
    }
  } catch (err) {
    console.error('Error getting page count:', err);
    return 1; // Fallback to 1 page if extraction fails
  }
  return 1;
};

router.post('/', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded.' });
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
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
