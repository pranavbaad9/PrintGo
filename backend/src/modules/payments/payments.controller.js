const paymentsService = require('./payments.service');
const crypto = require('crypto');
const prisma = require('../../utils/prisma');
const logger = require('../../utils/logger');
const { startPrintingProcess } = require('../../services/queueService');

const createCashfreeOrder = async (req, res, next) => {
  try {
    const { id } = req.params; // jobId (shortId)
    
    // IDOR protection: verify the session owns this job
    if (req.session) {
      const job = await prisma.printJob.findUnique({ where: { shortId: id } });
      if (job && job.machineId && req.session.machineId && job.machineId !== req.session.machineId) {
        return res.status(403).json({ success: false, error: 'Access denied' });
      }
    }
    
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

    const { updatedJob, wasJustUpdated } = await paymentsService.verifyPayment(job.payment.gatewayOrderId);
    
    if (updatedJob) {
      // P4-002: Fallback trigger if Webhook hasn't arrived yet
      if (updatedJob.status === 'WAITING' && wasJustUpdated) {
        if (startPrintingProcess) {
          startPrintingProcess(updatedJob.shortId, req.app.get('io'));
        }
      }
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
    
    if (!signature || !timestamp) {
      logger.warn('Webhook received without signature or timestamp headers');
      return res.status(401).send('Missing signature headers');
    }

    const expectedSignature = crypto
      .createHmac('sha256', process.env.CASHFREE_SECRET_KEY)
      .update(timestamp + req.rawBody)
      .digest('base64');
      
    if (signature !== expectedSignature) {
      logger.warn('Webhook signature mismatch — possible replay or tampering');
      return res.status(401).send('Invalid signature');
    }

    const event = req.body;
    logger.info(`Cashfree webhook received: type=${event.type}`);

    if (event.type === 'PAYMENT_SUCCESS_WEBHOOK') {
      const orderId = event.data.order.order_id;
      
      // Idempotency check: if payment is already marked SUCCESS, skip entirely
      const payment = await prisma.payment.findUnique({ where: { gatewayOrderId: orderId } });
      if (payment && payment.status === 'SUCCESS') {
        logger.info(`Webhook idempotency: payment ${orderId} already processed, skipping`);
        return res.status(200).send('Already processed');
      }

      const { updatedJob, wasJustUpdated } = await paymentsService.verifyPayment(orderId);
      
      if (updatedJob) {
        logger.info(`Payment verified for job ${updatedJob.shortId}, wasJustUpdated: ${wasJustUpdated}`);
        
        // Emit status change is now handled universally by Prisma $extends
        
        // ⚡ THIS IS THE SINGLE SOURCE OF TRUTH FOR TRIGGERING PRINTING
        // Only trigger if we were the thread that actually updated the state
        if (startPrintingProcess && wasJustUpdated) {
          logger.info(`Triggering print queue for job ${updatedJob.shortId}`);
          startPrintingProcess(updatedJob.shortId, req.app.get('io'));
        }
      }
    }
    
    res.status(200).send('OK');
  } catch (error) {
    logger.error('Webhook processing error:', { error: error.message });
    // Always return 200 to Cashfree to prevent retries for application errors
    // (retries would cause duplicate processing risk)
    res.status(200).send('Error logged');
  }
};

const refundOrder = async (req, res, next) => {
  try {
    const { id } = req.params; // jobId
    const updatedJob = await paymentsService.refundPayment(id);
    
    const io = req.app.get('io');
    if (updatedJob.machineId) {
      io.to(`machine_${updatedJob.machineId}`).emit('job_status_changed', updatedJob);
    }
    io.to('admins').emit('job_status_changed', updatedJob);
    
    res.json({ success: true, job: updatedJob });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createCashfreeOrder,
  verifyPayment,
  cashfreeWebhook,
  refundOrder
};
