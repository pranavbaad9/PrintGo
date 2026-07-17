const prisma = require('../utils/prisma');
const crypto = require('crypto');
const axios = require('axios');
const AppError = require('../utils/AppError');
const { startPrintingProcess, calculateEstimatedWaitTime } = require('../services/queueService');

const generateShortId = () => crypto.randomBytes(4).toString('hex');

const getAllJobs = async (req, res, next) => {
  try {
    const jobs = await prisma.job.findMany({
      orderBy: { createdAt: 'desc' }
    });
    res.json({ success: true, jobs });
  } catch (error) {
    next(error);
  }
};

const getJob = async (req, res, next) => {
  try {
    const { id } = req.params;
    const job = await prisma.job.findUnique({
      where: { shortId: id }
    });
    
    if (!job) {
      throw new AppError('Job not found', 404);
    }

    const eta = await calculateEstimatedWaitTime(job.shortId);
    res.json({ success: true, job: { ...job, eta } });
  } catch (error) {
    next(error);
  }
};

const createJob = async (req, res, next) => {
  try {
    const { file, settings, price } = req.body;
    
    const newJob = await prisma.job.create({
      data: {
        shortId: generateShortId(),
        price,
        originalName: file.originalName,
        filename: file.filename,
        mimetype: file.mimetype,
        size: file.size,
        pages: file.pages,
        color: settings.color,
        duplex: settings.duplex,
        copies: settings.copies,
        pagesToPrint: settings.pagesToPrint,
        pageRangeType: settings.pageRangeType,
        customRange: settings.customRange || null
      }
    });

    res.json({ success: true, job: newJob });
  } catch (error) {
    next(error);
  }
};

const createCashfreeOrder = async (req, res, next) => {
  try {
    const { id } = req.params;
    const job = await prisma.job.findUnique({ where: { shortId: id } });

    if (!job) {
      throw new AppError('Job not found', 404);
    }
    if (job.status !== 'Pending_Payment') {
      throw new AppError('Job is not pending payment', 400);
    }

    const cashfreeUrl = process.env.CASHFREE_SECRET_KEY && process.env.CASHFREE_SECRET_KEY.includes('prod') 
      ? 'https://api.cashfree.com/pg/orders' 
      : 'https://sandbox.cashfree.com/pg/orders';

    const response = await axios.post(cashfreeUrl, {
      customer_details: {
        customer_id: `cust_${job.shortId}`,
        customer_phone: '9876543210',
        customer_name: 'PrintGo User'
      },
      order_meta: {
        return_url: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/` 
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

    const updatedJob = await prisma.job.update({
      where: { shortId: job.shortId },
      data: {
        cashfreeOrderId: response.data.order_id,
        paymentSessionId: response.data.payment_session_id
      }
    });

    res.json({ 
      success: true, 
      paymentSessionId: response.data.payment_session_id,
      orderId: response.data.order_id,
      environment: cashfreeUrl.includes('sandbox') ? 'sandbox' : 'production'
    });
  } catch (error) {
    console.error("Cashfree order error:", error?.response?.data || error.message);
    next(new Error('Failed to create Cashfree order'));
  }
};

// Webhook from Cashfree
const cashfreeWebhook = async (req, res, next) => {
  try {
    const signature = req.headers['x-webhook-signature'];
    const timestamp = req.headers['x-webhook-timestamp'];
    
    // Validate signature
    const expectedSignature = crypto
      .createHmac('sha256', process.env.CASHFREE_SECRET_KEY)
      .update(timestamp + req.rawBody)
      .digest('base64');
      
    if (signature !== expectedSignature) {
      throw new AppError('Invalid signature', 401);
    }

    const event = req.body;
    if (event.type === 'PAYMENT_SUCCESS_WEBHOOK') {
      const orderId = event.data.order.order_id;
      
      const job = await prisma.job.findUnique({ where: { cashfreeOrderId: orderId } });
      
      if (job && job.status === 'Pending_Payment') {
        const updatedJob = await prisma.job.update({
          where: { id: job.id },
          data: { status: 'Waiting', paymentStatus: 'PAID' }
        });
        
        req.app.get('io').emit('job_status_changed', updatedJob);
        startPrintingProcess(updatedJob.shortId, req.app.get('io'));
      }
    }
    
    res.status(200).send('OK');
  } catch (error) {
    next(error);
  }
};

const confirmPayment = async (req, res, next) => {
  try {
    const { id } = req.params;
    const job = await prisma.job.findUnique({ where: { shortId: id } });

    if (!job) {
      throw new AppError('Job not found', 404);
    }
    if (job.status !== 'Pending_Payment') {
      throw new AppError('Job is not pending payment', 400);
    }

    const updatedJob = await prisma.job.update({
      where: { shortId: id },
      data: { status: 'Waiting', paymentStatus: 'PAID' }
    });

    req.app.get('io').emit('job_status_changed', updatedJob);
    startPrintingProcess(updatedJob.shortId, req.app.get('io'));

    res.json({ success: true, job: updatedJob });
  } catch (error) {
    next(error);
  }
};

const updateJobStatus = async (req, res, next) => {
  try {
    const { status } = req.body;
    const { id } = req.params;
    
    const job = await prisma.job.update({
      where: { shortId: id },
      data: { status }
    });
    
    req.app.get('io').emit('job_status_changed', job);
    res.json({ success: true, job });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAllJobs,
  getJob,
  createJob,
  createCashfreeOrder,
  cashfreeWebhook,
  confirmPayment,
  updateJobStatus
};
