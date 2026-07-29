const express = require('express');
const router = express.Router();
const jobsController = require('./jobs.controller');
const { protect, restrictTo } = require('../../middlewares/auth');

router.get('/', protect, restrictTo('SUPERADMIN', 'FRANCHISEE'), jobsController.getAllJobs);
router.get('/:id', jobsController.getJob);
router.post('/', jobsController.createJob);
router.put('/:id/status', protect, restrictTo('SUPERADMIN', 'FRANCHISEE', 'STAFF'), jobsController.updateJobStatus);

module.exports = router;
