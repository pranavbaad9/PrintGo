const express = require('express');
const { 
  getAllJobs, 
  getJob, 
  createJob, 
  createCashfreeOrder, 
  cashfreeWebhook,
  verifyPayment, 
  updateJobStatus 
} = require('../controllers/jobsController');
const { authMiddleware, adminMiddleware } = require('../middlewares/auth');
const { createJobSchema, validate } = require('../utils/validators');

const router = express.Router();

router.get('/', authMiddleware, adminMiddleware, getAllJobs);
router.get('/:id', getJob);
router.post('/', validate(createJobSchema), createJob);
router.post('/:id/cashfree/order', createCashfreeOrder);
router.post('/cashfree/webhook', cashfreeWebhook);
router.get('/:id/verify', verifyPayment);
router.put('/:id/status', authMiddleware, adminMiddleware, updateJobStatus);

module.exports = router;
