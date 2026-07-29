const express = require('express');
const router = express.Router();
const companiesController = require('./companies.controller');
const { protect, restrictTo } = require('../../middlewares/auth');

router.get('/', protect, restrictTo('SUPERADMIN'), companiesController.getCompanies);
router.post('/', protect, restrictTo('SUPERADMIN'), companiesController.createCompany);

module.exports = router;
