const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { jobs, saveJobs } = require('../data/jobsData');
const { startPrintingProcess, calculateEstimatedWaitTime } = require('../services/queueService');
const crypto = require('crypto');
const axios = require('axios');

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

// Cashfree Order Creation
router.post('/:id/cashfree/order', async (req, res) => {
  const job = jobs.find(j => j.id === req.params.id);
  if (!job) return res.status(404).json({ error: 'Job not found' });
  
  if (job.status !== 'Pending_Payment') {
    return res.status(400).json({ error: 'Job is not pending payment' });
  }

  try {
    const response = await axios.post('https://sandbox.cashfree.com/pg/orders', {
      customer_details: {
        customer_id: `cust_${job.id}`,
        customer_phone: '9876543210',
        customer_name: 'PrintGo User'
      },
      order_meta: {
        return_url: `http://localhost:5173/` // Dummy return url since we use modal
      },
      order_amount: job.price,
      order_currency: 'INR'
    }, {
      headers: {
        'x-client-id': process.env.CASHFREE_APP_ID,
        'x-client-secret': process.env.CASHFREE_SECRET_KEY,
        'x-api-version': '2023-08-01',
        'Content-Type': 'application/json'
      }
    });

    res.json({ 
      success: true, 
      paymentSessionId: response.data.payment_session_id,
      orderId: response.data.order_id
    });
  } catch (error) {
    console.error("Cashfree order error:", error?.response?.data || error.message);
    res.status(500).json({ error: 'Failed to create Cashfree order' });
  }
});

// Cashfree Verification
router.post('/:id/cashfree/verify', async (req, res) => {
  const job = jobs.find(j => j.id === req.params.id);
  if (!job) return res.status(404).json({ error: 'Job not found' });

  const { order_id } = req.body;

  try {
    const response = await axios.get(`https://sandbox.cashfree.com/pg/orders/${order_id}`, {
      headers: {
        'x-client-id': process.env.CASHFREE_APP_ID,
        'x-client-secret': process.env.CASHFREE_SECRET_KEY,
        'x-api-version': '2023-08-01'
      }
    });

    if (response.data.order_status === 'PAID') {
      if (job.status === 'Pending_Payment') {
        job.status = 'Waiting';
        saveJobs();
        req.app.get('io').emit('job_status_changed', job);
        startPrintingProcess(job.id, req.app.get('io'));
      }
      return res.json({ success: true, job });
    } else {
      return res.status(400).json({ error: 'Payment not successful yet.' });
    }
  } catch (error) {
    console.error("Cashfree verify error:", error?.response?.data || error.message);
    res.status(500).json({ error: 'Failed to verify Cashfree payment' });
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
