const express = require('express');
const router = express.Router();
const subscriptionsController = require('./subscriptions.controller');
const { protect, restrictTo } = require('../../middlewares/auth');

router.get('/', protect, restrictTo('SUPERADMIN', 'FRANCHISEE'), subscriptionsController.getSubscriptions);
router.post('/', protect, restrictTo('SUPERADMIN'), subscriptionsController.createSubscription);
router.post('/:id/cancel', protect, restrictTo('SUPERADMIN'), subscriptionsController.cancelSubscription);

module.exports = router;
