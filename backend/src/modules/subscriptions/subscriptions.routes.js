const express = require('express');
const router = express.Router();
const subscriptionsController = require('./subscriptions.controller');
const { protect, restrictTo } = require('../../middlewares/auth');

const { validate } = require('../../middlewares/validate');
const { createSubscriptionSchema, cancelSubscriptionSchema } = require('../../utils/schemas');

router.get('/', protect, restrictTo('SUPERADMIN', 'FRANCHISEE'), subscriptionsController.getSubscriptions);
router.post('/', protect, restrictTo('SUPERADMIN'), validate(createSubscriptionSchema), subscriptionsController.createSubscription);
router.post('/:id/cancel', protect, restrictTo('SUPERADMIN'), validate(cancelSubscriptionSchema), subscriptionsController.cancelSubscription);

module.exports = router;
