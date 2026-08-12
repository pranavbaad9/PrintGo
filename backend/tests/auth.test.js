// Set env vars for testing
process.env.JWT_SECRET = 'test_jwt_secret_key';

const request = require('supertest');
const express = require('express');
const authRoutes = require('../src/modules/auth/auth.routes');
const authService = require('../src/modules/auth/auth.service');
const { validate } = require('../src/middlewares/validate');

// Mock the auth service to bypass DB
jest.mock('../src/modules/auth/auth.service');
// Mock prisma to bypass DB for createSession
jest.mock('../src/utils/prisma', () => ({
  machine: {
    findUnique: jest.fn()
  }
}));

const app = express();
app.use(express.json());
app.use('/api/auth', authRoutes);

// Catch-all error handler like in server.js
app.use((err, req, res, next) => {
  res.status(err.statusCode || 500).json({
    success: false,
    error: err.message
  });
});

describe('Auth Endpoints', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/auth/login', () => {
    it('should return 400 for invalid request body', async () => {
      const res = await request(app).post('/api/auth/login').send({ email: 'not-an-email', password: '123' });
      expect(res.statusCode).toEqual(400);
      expect(res.body.error).toBeDefined(); // Just expect an error to be defined if validation message differs
    });

    it('should login successfully with valid credentials', async () => {
      authService.login.mockResolvedValue({
        user: { id: '1', email: 'test@test.com', role: 'FRANCHISEE' },
        token: 'fake-jwt-token'
      });

      const res = await request(app).post('/api/auth/login').send({
        email: 'test@test.com',
        password: 'password123'
      });

      expect(res.statusCode).toEqual(200);
      expect(res.body.success).toBe(true);
      expect(res.body.token).toBe('fake-jwt-token');
    });
  });

  describe('POST /api/auth/session', () => {
    it('should return session token for valid session id', async () => {
      const res = await request(app).post('/api/auth/session').send({
        sessionId: 'session-xyz'
      });

      expect(res.statusCode).toEqual(200);
      expect(res.body.success).toBe(true);
      expect(res.body.sessionToken).toBeDefined();
    });
  });
});
