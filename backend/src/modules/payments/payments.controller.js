const paymentsService = require('./payments.service');
const crypto = require('crypto');
const prisma = require('../../utils/prisma');
const { startPrintingProcess } = require('../../services/queueService'); // Keep legacy import for now

const createCashfreeOrder = async (req, res, next) => {
  try {
    const { id } = req.params; // jobId
    const orderDetails = await paymentsService.createOrder(id);
    res.json({ success: true, ...orderDetails });
  } catch (error) {
    next(error);
  }
};

const verifyPayment = async (req, res, next) => {
  try {
    const { id } = req.params; // jobId
    
    const job = await prisma.printJob.findUnique({ 
      where: { shortId: id },
      include: { payment: true }
    });
    if (!job) throw new Error('Job not found');
    
    if (job.status !== 'PENDING_PAYMENT') {
      return res.json({ success: true, job });
    }
    
    if (!job.payment || !job.payment.gatewayOrderId) {
       throw new Error('No payment initiated');
    }

    const updatedJob = await paymentsService.verifyPayment(job.payment.gatewayOrderId);
    
    if (updatedJob) {
      req.app.get('io').emit('job_status_changed', updatedJob);
      // Fallback for queue service
      if(startPrintingProcess) startPrintingProcess(updatedJob.shortId, req.app.get('io'));
      return res.json({ success: true, job: updatedJob });
    }

    res.json({ success: false, status: 'PENDING' });
  } catch (error) {
    next(error);
  }
};

const cashfreeWebhook = async (req, res, next) => {
  try {
    const signature = req.headers['x-webhook-signature'];
    const timestamp = req.headers['x-webhook-timestamp'];
    
    const expectedSignature = crypto
      .createHmac('sha256', process.env.CASHFREE_SECRET_KEY)
      .update(timestamp + req.rawBody)
      .digest('base64');
      
    if (signature !== expectedSignature) {
      return res.status(401).send('Invalid signature');
    }

    const event = req.body;
    if (event.type === 'PAYMENT_SUCCESS_WEBHOOK') {
      const orderId = event.data.order.order_id;
      const updatedJob = await paymentsService.verifyPayment(orderId);
      
      if (updatedJob) {
        req.app.get('io').emit('job_status_changed', updatedJob);
        if(startPrintingProcess) startPrintingProcess(updatedJob.shortId, req.app.get('io'));
      }
    }
    
    res.status(200).send('OK');
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createCashfreeOrder,
  verifyPayment,
  cashfreeWebhook
};
