const request = require('supertest');
const express = require('express');
const crypto = require('crypto');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const paymentsRoutes = require('../../src/modules/payments/payments.routes');
const { errorHandler } = require('../../src/middlewares/error');

jest.mock('../../src/utils/prisma', () => ({
  payment: {
    create: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
    deleteMany: jest.fn()
  },
  printJob: {
    create: jest.fn(),
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    update: jest.fn(),
    deleteMany: jest.fn()
  },
  $transaction: jest.fn(async (cb) => {
    // Mock the transaction object (tx) passed to the callback
    const tx = {
      payment: {
        findUnique: jest.fn(),
        update: jest.fn()
      },
      printJob: {
        findFirst: jest.fn(),
        update: jest.fn()
      }
    };
    return cb(tx);
  }),
  $disconnect: jest.fn()
}));

const mockPrisma = require('../../src/utils/prisma');
const axios = require('axios');

jest.mock('axios');

// Set dummy secret key for testing signature validation
process.env.CASHFREE_SECRET_KEY = 'TEST_SECRET_KEY';

const app = express();

// The webhook requires rawBody to calculate the signature correctly
app.use(express.json({
  verify: (req, res, buf) => {
    req.rawBody = buf.toString();
  }
}));

// Mock middlewares
jest.mock('../../src/middlewares/auth', () => ({
  protect: (req, res, next) => {
    req.user = { id: 1, role: 'SUPERADMIN' };
    next();
  },
  restrictTo: (...roles) => (req, res, next) => next(),
}));

jest.mock('../../src/middlewares/session', () => ({
  requireSessionOrUser: (req, res, next) => next(),
}));

const mockIo = {
  to: jest.fn().mockReturnThis(),
  emit: jest.fn()
};
app.set('io', mockIo);

app.use('/api/payments', paymentsRoutes);
app.use(errorHandler);

describe('Payment Webhooks & Refund Tests', () => {
  let testJob;
  let testPayment;

  beforeAll(async () => {
    testJob = {
      id: 1,
      shortId: `test_job_${Date.now()}`,
      status: 'PENDING_PAYMENT',
      cost: 10,
      pagesToPrint: 1,
      color: 'BLACK_AND_WHITE',
      duplex: 'NONE',
      copies: 1
    };

    testPayment = {
      id: 1,
      amount: 10,
      type: 'PRINT_JOB',
      gatewayOrderId: `order_${testJob.shortId}`,
      gatewaySessionId: 'dummy_session',
      status: 'PENDING'
    };
    testJob.payment = testPayment;
  });

  afterAll(async () => {
    jest.clearAllMocks();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('POST /api/payments/webhook/cashfree should reject requests without signature headers', async () => {
    const res = await request(app)
      .post('/api/payments/webhook/cashfree')
      .send({ type: 'PAYMENT_SUCCESS_WEBHOOK' });
      
    expect(res.statusCode).toEqual(401);
    expect(res.text).toContain('Missing signature headers');
  });

  it('POST /api/payments/webhook/cashfree should reject requests with invalid signature', async () => {
    const res = await request(app)
      .post('/api/payments/webhook/cashfree')
      .set('x-webhook-signature', 'invalid_signature')
      .set('x-webhook-timestamp', Date.now().toString())
      .send({ type: 'PAYMENT_SUCCESS_WEBHOOK' });
      
    expect(res.statusCode).toEqual(401);
    expect(res.text).toContain('Invalid signature');
  });

  it('POST /api/payments/webhook/cashfree should process valid webhook and update job status', async () => {
    const payload = {
      type: 'PAYMENT_SUCCESS_WEBHOOK',
      data: {
        order: { order_id: testPayment.gatewayOrderId }
      }
    };
    
    const payloadString = JSON.stringify(payload);
    const timestamp = Date.now().toString();
    
    // Generate valid signature
    const signature = crypto
      .createHmac('sha256', process.env.CASHFREE_SECRET_KEY)
      .update(timestamp + payloadString)
      .digest('base64');

    // Mock axios verification request
    axios.get.mockResolvedValueOnce({
      data: { order_status: 'PAID' }
    });

    // Setup Prisma mocks for verification flow
    mockPrisma.payment.findUnique.mockResolvedValue(testPayment);
    // Mock the transaction behavior
    mockPrisma.$transaction.mockImplementationOnce(async (cb) => {
      const tx = {
        payment: {
          findUnique: jest.fn().mockResolvedValue(testPayment),
          update: jest.fn().mockResolvedValue({ ...testPayment, status: 'SUCCESS' })
        },
        printJob: {
          findFirst: jest.fn().mockResolvedValue(testJob),
          update: jest.fn().mockResolvedValue({ ...testJob, status: 'WAITING' })
        }
      };
      return cb(tx);
    });

    const res = await request(app)
      .post('/api/payments/webhook/cashfree')
      .set('x-webhook-signature', signature)
      .set('x-webhook-timestamp', timestamp)
      .set('Content-Type', 'application/json')
      .send(payloadString); // Send raw string to match rawBody perfectly
      
    expect(res.statusCode).toEqual(200);
    expect(res.text).toEqual('OK');

    // Verify DB update
    expect(mockPrisma.$transaction).toHaveBeenCalled();
  });

  it('POST /api/payments/refund/:id should mock Cashfree refund and update status', async () => {
    // Note: The previous test changed the job status to WAITING and payment to SUCCESS
    
    // Mock Cashfree Refund API
    axios.post.mockResolvedValueOnce({
      data: { refund_status: 'SUCCESS' }
    });

    mockPrisma.printJob.findUnique.mockResolvedValue({
      ...testJob,
      payment: { ...testPayment, status: 'SUCCESS' }
    });
    mockPrisma.payment.update.mockResolvedValue({ ...testPayment, status: 'REFUNDED' });
    mockPrisma.printJob.update.mockResolvedValue({ ...testJob, status: 'REFUNDED' });

    const res = await request(app)
      .post(`/api/payments/refund/${testJob.shortId}`)
      .send();

    expect(res.statusCode).toEqual(200);
    expect(res.body.success).toBeTruthy();
    expect(res.body.job.status).toEqual('REFUNDED');

    // Verify websocket event emitted
    expect(mockIo.to).toHaveBeenCalledWith('admins');
    expect(mockIo.emit).toHaveBeenCalledWith('job_status_changed', expect.objectContaining({
      status: 'REFUNDED'
    }));
  });
});
