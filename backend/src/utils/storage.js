const { S3Client, DeleteObjectCommand, GetObjectCommand } = require('@aws-sdk/client-s3');
const multer = require('multer');
const multerS3 = require('multer-s3');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const logger = require('./logger');

const useS3 = !!process.env.AWS_S3_BUCKET;

let s3Client;
if (useS3) {
  s3Client = new S3Client({
    region: process.env.AWS_REGION || 'ap-south-1',
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
    }
  });
  logger.info('Storage Service initialized with AWS S3');
} else {
  logger.info('Storage Service initialized with Local Disk (AWS_S3_BUCKET not set)');
}

const getStorage = () => {
  if (useS3) {
    return multerS3({
      s3: s3Client,
      bucket: process.env.AWS_S3_BUCKET,
      metadata: function (req, file, cb) {
        cb(null, { fieldName: file.fieldname });
      },
      key: function (req, file, cb) {
        const ext = path.extname(file.originalname);
        cb(null, `uploads/${uuidv4()}${ext}`);
      }
    });
  } else {
    return multer.diskStorage({
      destination: function (req, file, cb) {
        const uploadDir = path.join(__dirname, '../../uploads');
        if (!fs.existsSync(uploadDir)) {
          fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
      },
      filename: function (req, file, cb) {
        const ext = path.extname(file.originalname);
        cb(null, `${uuidv4()}${ext}`);
      }
    });
  }
};

const deleteFile = async (filename) => {
  if (!filename) return;

  try {
    if (filename.startsWith('http') && filename.includes('amazonaws.com')) {
      // It's an S3 URL
      if (!useS3) {
        logger.warn(`Cannot delete S3 file ${filename} because S3 is not configured`);
        return;
      }
      
      const url = new URL(filename);
      // Example url: https://bucket-name.s3.ap-south-1.amazonaws.com/uploads/uuid.pdf
      // Key is the pathname without the leading slash
      const key = url.pathname.substring(1); 
      
      await s3Client.send(new DeleteObjectCommand({
        Bucket: process.env.AWS_S3_BUCKET,
        Key: key
      }));
      logger.info(`Deleted S3 file: ${key}`);
    } else {
      // It's a local file
      const filePath = filename.startsWith('/')
        ? path.join(__dirname, '..', '..', filename)
        : path.join(__dirname, '..', '..', 'uploads', path.basename(filename));
      
      if (fs.existsSync(filePath)) {
        fs.unlink(filePath, (err) => {
          if (err) logger.error(`Failed to delete local file: ${filePath}`, err);
          else logger.info(`Deleted local file: ${filePath}`);
        });
      }
    }
  } catch (error) {
    logger.error(`Error deleting file ${filename}:`, error);
  }
};

module.exports = {
  getStorage,
  deleteFile,
  useS3
};
