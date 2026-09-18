const express = require('express');
const router = express.Router();
const companiesController = require('./companies.controller');
const { protect, restrictTo } = require('../../middlewares/auth');

const { validate } = require('../../middlewares/validate');
const { createCompanySchema } = require('../../utils/schemas');

router.get('/', protect, restrictTo('SUPERADMIN'), companiesController.getCompanies);
router.post('/', protect, restrictTo('SUPERADMIN'), validate(createCompanySchema), companiesController.createCompany);

module.exports = router;
