const express = require('express');
const router = express.Router();
const paymentsController = require('./payments.controller');
const { requireSessionOrUser } = require('../../middlewares/session');
const { protect, restrictTo } = require('../../middlewares/auth');

router.post('/order/:id', requireSessionOrUser, paymentsController.createCashfreeOrder);
router.get('/verify/:id', requireSessionOrUser, paymentsController.verifyPayment);
router.post('/webhook/cashfree', paymentsController.cashfreeWebhook); // HMAC-signed, no JWT needed
router.post('/refund/:id', protect, restrictTo('SUPERADMIN', 'FRANCHISEE'), paymentsController.refundOrder);

module.exports = router;
