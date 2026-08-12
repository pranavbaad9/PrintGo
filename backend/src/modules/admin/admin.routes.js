const express = require('express');
const { protect, restrictTo } = require('../../middlewares/auth');
const adminController = require('./admin.controller');

const router = express.Router();

// Apply auth middleware to all admin routes
router.use(protect);
router.use(restrictTo('SUPERADMIN'));

router.get('/stats', adminController.getStats);
router.get('/companies', adminController.getAllCompanies);
router.get('/machines', adminController.getAllMachines);

module.exports = router;
