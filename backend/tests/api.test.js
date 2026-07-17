const request = require('supertest');
const express = require('express');
const { errorHandler } = require('../middlewares/error');
const authRouter = require('../routes/auth');
const prisma = require('../utils/prisma');

jest.mock('../utils/prisma', () => ({
  adminUser: {
    findUnique: jest.fn(),
  }
}));

const app = express();
app.use(express.json());
app.use('/api/auth', authRouter);
app.use(errorHandler);

describe('Auth API', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should return 400 if no credentials provided', async () => {
    const res = await request(app).post('/api/auth/login').send({});
    expect(res.statusCode).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('should return 401 for invalid credentials', async () => {
    prisma.adminUser.findUnique.mockResolvedValue(null);
    const res = await request(app).post('/api/auth/login').send({
      username: 'wronguser',
      password: 'wrongpassword'
    });
    expect(res.statusCode).toBe(401);
    expect(res.body.success).toBe(false);
  });
});
