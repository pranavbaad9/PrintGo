const express = require('express');
const multer = require('multer');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const uploadController = require('./upload.controller');
const AppError = require('../../utils/AppError');

const router = express.Router();

const { getStorage } = require('../../utils/storage');

const upload = multer({
  storage: getStorage(),
  limits: { fileSize: 50 * 1024 * 1024 }, // 50 MB limit (was 1000MB — P1-003)
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'image/jpeg',
      'image/png'
    ];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new AppError('Invalid file type.', 400), false);
    }
  }
});

const { requireSessionOrUser } = require('../../middlewares/session');

router.post('/', requireSessionOrUser, upload.single('file'), uploadController.handleUpload);

module.exports = router;
