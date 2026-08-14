const express = require('express');
const router = express.Router();
const jobsController = require('./jobs.controller');
const { protect, restrictTo } = require('../../middlewares/auth');
const { requireSessionOrUser } = require('../../middlewares/session');
const { validate } = require('../../middlewares/validate');
const { createJobSchema, updateJobStatusSchema } = require('../../utils/schemas');

router.get('/', protect, restrictTo('SUPERADMIN', 'FRANCHISEE'), jobsController.getAllJobs);
router.get('/export/csv', protect, restrictTo('SUPERADMIN', 'FRANCHISEE'), jobsController.exportJobsCsv);
router.get('/:id', requireSessionOrUser, jobsController.getJob);
router.post('/', requireSessionOrUser, validate(createJobSchema), jobsController.createJob);
router.put('/:id/status', protect, restrictTo('SUPERADMIN', 'FRANCHISEE', 'STAFF'), validate(updateJobStatusSchema), jobsController.updateJobStatus);

module.exports = router;
