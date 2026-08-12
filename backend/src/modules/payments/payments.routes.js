const express = require('express');
const router = express.Router();
const paymentsController = require('./payments.controller');
const { requireSessionOrUser } = require('../../middlewares/session');

router.post('/order/:id', requireSessionOrUser, paymentsController.createCashfreeOrder);
router.get('/verify/:id', requireSessionOrUser, paymentsController.verifyPayment);
router.post('/webhook/cashfree', paymentsController.cashfreeWebhook); // HMAC-signed, no JWT needed

module.exports = router;
