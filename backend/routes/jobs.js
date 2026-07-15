const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { jobs, saveJobs } = require('../data/jobsData');
const { startPrintingProcess, calculateEstimatedWaitTime } = require('../services/queueService');
const Razorpay = require('razorpay');
const crypto = require('crypto');

const router = express.Router();

// Get all jobs (Admin Dashboard)
router.get('/', (req, res) => {
  res.json({ success: true, jobs });
});

// Get a specific job
router.get('/:id', (req, res) => {
  const job = jobs.find(j => j.id === req.params.id);
  if (job) {
    const eta = calculateEstimatedWaitTime(job.id);
    res.json({ success: true, job: { ...job, eta } });
  } else {
    res.status(404).json({ error: 'Job not found' });
  }
});

// Create a new job
router.post('/', (req, res) => {
  const { file, settings, price } = req.body;

  const newJob = {
    id: uuidv4().substring(0, 8), // Short ID for queue
    file,
    settings,
    price,
    status: 'Pending_Payment', // Pending_Payment -> Waiting -> Printing -> Completed -> Cancelled
    createdAt: new Date().toISOString()
  };

  jobs.push(newJob);
  saveJobs();
  res.json({ success: true, job: newJob });
});

// Mark job as paid and move to Queue (Waiting)
router.post('/:id/pay', (req, res) => {
  const job = jobs.find(j => j.id === req.params.id);
  
  if (!job) {
    return res.status(404).json({ error: 'Job not found' });
  }

  if (job.status === 'Pending_Payment') {
    job.status = 'Waiting';
    saveJobs();
    req.app.get('io').emit('job_status_changed', job);
    // Simulate automatic print processing
    startPrintingProcess(job.id, req.app.get('io'));
    res.json({ success: true, job });
  } else {
    res.status(400).json({ error: 'Job cannot be paid for in its current state' });
  }
});

// Razorpay Order Creation
router.post('/:id/razorpay/order', async (req, res) => {
  const job = jobs.find(j => j.id === req.params.id);
  if (!job) return res.status(404).json({ error: 'Job not found' });
  
  if (job.status !== 'Pending_Payment') {
    return res.status(400).json({ error: 'Job is not pending payment' });
  }

  try {
    const razorpay = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET,
    });

    const options = {
      amount: Math.round(job.price * 100), // amount in paise
      currency: "INR",
      receipt: `receipt_${job.id}`
    };

    const order = await razorpay.orders.create(options);
    res.json({ success: true, order, keyId: process.env.RAZORPAY_KEY_ID });
  } catch (error) {
    console.error("Razorpay order error:", error);
    res.status(500).json({ error: 'Failed to create Razorpay order' });
  }
});

// Razorpay Verification
router.post('/:id/razorpay/verify', (req, res) => {
  const job = jobs.find(j => j.id === req.params.id);
  if (!job) return res.status(404).json({ error: 'Job not found' });

  const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

  const sign = razorpay_order_id + "|" + razorpay_payment_id;
  const expectedSign = crypto
    .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
    .update(sign.toString())
    .digest("hex");

  if (razorpay_signature === expectedSign) {
    if (job.status === 'Pending_Payment') {
      job.status = 'Waiting';
      saveJobs();
      req.app.get('io').emit('job_status_changed', job);
      startPrintingProcess(job.id, req.app.get('io'));
    }
    return res.json({ success: true, job });
  } else {
    return res.status(400).json({ error: 'Invalid signature sent!' });
  }
});

// Admin actions
router.put('/:id/status', (req, res) => {
  const { status } = req.body;
  const job = jobs.find(j => j.id === req.params.id);
  
  if (!job) return res.status(404).json({ error: 'Job not found' });
  
  job.status = status;
  saveJobs();
  req.app.get('io').emit('job_status_changed', job);
  res.json({ success: true, job });
});

module.exports = router;
