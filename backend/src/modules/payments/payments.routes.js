const express = require('express');
const router = express.Router();
const paymentsController = require('./payments.controller');

router.post('/order/:id', paymentsController.createCashfreeOrder);
router.get('/verify/:id', paymentsController.verifyPayment);
router.post('/webhook/cashfree', paymentsController.cashfreeWebhook);

module.exports = router;
