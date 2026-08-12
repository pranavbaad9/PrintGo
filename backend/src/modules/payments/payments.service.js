const axios = require('axios');
const crypto = require('crypto');
const prisma = require('../../utils/prisma');
const AppError = require('../../utils/AppError');
const logger = require('../../utils/logger');
// We will mock startPrintingProcess here for now, eventually it should be handled via a JobService or QueueService
const { startPrintingProcess } = require('../../services/queueService');

const getCashfreeConfig = () => {
  const isProd = process.env.CASHFREE_SECRET_KEY && process.env.CASHFREE_SECRET_KEY.includes('prod');
  return {
    url: isProd ? 'https://api.cashfree.com/pg/orders' : 'https://sandbox.cashfree.com/pg/orders',
    headers: {
      'x-client-id': process.env.CASHFREE_APP_ID,
      'x-client-secret': process.env.CASHFREE_SECRET_KEY,
      'x-api-version': '2023-08-01',
      'Content-Type': 'application/json'
    }
  };
};

const createOrder = async (jobId) => {
  const job = await prisma.printJob.findUnique({ where: { shortId: jobId }, include: { payment: true } });
  if (!job) throw new AppError('Job not found', 404);
  if (job.status !== 'PENDING_PAYMENT') throw new AppError('Job is not pending payment', 400);

  const config = getCashfreeConfig();
  
  // Create an unlinked Payment record first
  const payment = await prisma.payment.create({
    data: {
      amount: job.cost,
      type: 'PRINT_JOB'
    }
  });

  try {
    const response = await axios.post(config.url, {
      customer_details: {
        customer_id: `cust_${job.shortId}`,
        customer_phone: '9876543210', // In enterprise, this should pull from Customer model
        customer_name: 'PrintGo User'
      },
      order_meta: {
        return_url: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/` 
      },
      order_amount: job.cost,
      order_currency: 'INR'
    }, { headers: config.headers });

    // Update payment with Cashfree order id
    await prisma.payment.update({
      where: { id: payment.id },
      data: {
        gatewayOrderId: response.data.order_id,
        gatewaySessionId: response.data.payment_session_id
      }
    });

    // Link payment to job
    await prisma.printJob.update({
      where: { id: job.id },
      data: { paymentId: payment.id }
    });

    return {
      paymentSessionId: response.data.payment_session_id,
      orderId: response.data.order_id,
      environment: config.url.includes('sandbox') ? 'sandbox' : 'production'
    };
  } catch (error) {
    logger.error("Cashfree create order error:", error?.response?.data || error.message);
    throw new AppError('Failed to create Cashfree order', 500);
  }
};

const verifyPayment = async (orderId) => {
  const payment = await prisma.payment.findUnique({ where: { gatewayOrderId: orderId } });
  if (!payment) throw new AppError('Payment not found', 404);

  if (payment.status === 'SUCCESS') {
    return await prisma.printJob.findFirst({ where: { paymentId: payment.id } });
  }

  const config = getCashfreeConfig();
  
  try {
    const response = await axios.get(`${config.url}/${orderId}`, { headers: config.headers });
    
    if (response.data.order_status === 'PAID') {
      await prisma.payment.update({
        where: { id: payment.id },
        data: { status: 'SUCCESS' }
      });
      
      const job = await prisma.printJob.findFirst({ where: { paymentId: payment.id } });
      if (job && job.status === 'PENDING_PAYMENT') {
        return await prisma.printJob.update({
          where: { id: job.id },
          data: { status: 'WAITING' }
        });
      }
    }
    
    return null;
  } catch (error) {
    logger.error("Payment verify error:", error?.response?.data || error.message);
    throw new AppError('Failed to verify payment', 500);
  }
};

module.exports = {
  createOrder,
  verifyPayment
};
