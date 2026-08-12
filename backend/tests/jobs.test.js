const request = require('supertest');
const express = require('express');
const jobsRoutes = require('../src/modules/jobs/jobs.routes');
const jobsService = require('../src/modules/jobs/jobs.service');

jest.mock('../src/modules/jobs/jobs.service');
// Mock auth middlewares
jest.mock('../src/middlewares/auth', () => ({
  protect: (req, res, next) => {
    req.user = { id: '1', role: 'FRANCHISEE', companyId: 'comp-1' };
    next();
  },
  restrictTo: (...roles) => (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ success: false, error: 'Forbidden' });
    }
    next();
  }
}));
jest.mock('../src/middlewares/session', () => ({
  requireSessionOrUser: (req, res, next) => next()
}));

const app = express();
app.use(express.json());
app.use('/api/jobs', jobsRoutes);

app.use((err, req, res, next) => {
  res.status(err.statusCode || 500).json({ success: false, error: err.message });
});

describe('Jobs Endpoints', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/jobs', () => {
    it('should return jobs for the authenticated user', async () => {
      jobsService.getAllJobs.mockResolvedValue([
        { id: 'job-1', shortId: '1234abcd', status: 'COMPLETED' }
      ]);

      const res = await request(app).get('/api/jobs');
      
      expect(res.statusCode).toEqual(200);
      expect(res.body.success).toBe(true);
      expect(res.body.jobs.length).toBe(1);
      // Ensure the service was called with the user object (for tenant isolation)
      expect(jobsService.getAllJobs).toHaveBeenCalledWith(
        expect.objectContaining({ id: '1', companyId: 'comp-1' })
      );
    });
  });

  describe('POST /api/jobs', () => {
    it('should validate zod schema for create job', async () => {
      // Missing file and settings
      const res = await request(app).post('/api/jobs').send({});
      
      expect(res.statusCode).toEqual(400);
      expect(res.body.error).toBeDefined();
    });
  });
});
