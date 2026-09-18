const request = require('supertest');
const express = require('express');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const adminRoutes = require('../../src/modules/admin/admin.routes');
const authRoutes = require('../../src/modules/auth/auth.routes');
const { errorHandler } = require('../../src/middlewares/error');

const app = express();
app.use(express.json());

// Mock session/auth middlewares for the purpose of the test
jest.mock('../../src/middlewares/auth', () => ({
  protect: (req, res, next) => {
    req.user = { id: 1, role: 'SUPERADMIN' };
    next();
  },
  restrictTo: (...roles) => (req, res, next) => next(),
}));

app.use('/api/admin', adminRoutes);
app.use('/api/auth', authRoutes);
app.use(errorHandler);

describe('E2E API Tests', () => {
  beforeAll(async () => {
    // Optionally seed a test database here
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('GET /api/admin/stats should return stats for superadmin', async () => {
    const res = await request(app).get('/api/admin/stats');
    expect(res.statusCode).toEqual(200);
    expect(res.body.success || res.body.status === 'success').toBeTruthy();
    expect(res.body.data).toHaveProperty('totalCompanies');
    expect(res.body.data).toHaveProperty('totalMachines');
  });

  it('POST /api/auth/session/create should not leak tempMachineKeyForSetup', async () => {
    const res = await request(app)
      .post('/api/auth/session/create')
      .send({});
      
    // Should be successful and return session details
    expect(res.statusCode).toEqual(200);
    expect(res.body.success).toBeTruthy();
    
    // P0 Security Fix Verification
    expect(res.body).not.toHaveProperty('tempMachineKeyForSetup');
  });
});
