const express = require('express');
const router = express.Router();
const paymentsController = require('./payments.controller');
const { requireSessionOrUser } = require('../../middlewares/session');
const { protect, restrictTo } = require('../../middlewares/auth');

const optionalSessionOrUser = async (req, res, next) => {
  if (req.headers.authorization || req.cookies?.jwt) {
    return requireSessionOrUser(req, res, next);
  }
  next();
};

router.post('/order/:id', requireSessionOrUser, paymentsController.createCashfreeOrder);
router.get('/verify/:id', optionalSessionOrUser, paymentsController.verifyPayment);
router.post('/webhook', paymentsController.cashfreeWebhook); // Cashfree default webhook path
router.post('/webhook/cashfree', paymentsController.cashfreeWebhook); // Alternative path
router.post('/refund/:id', protect, restrictTo('SUPERADMIN', 'FRANCHISEE'), paymentsController.refundOrder);

module.exports = router;
