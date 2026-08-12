const express = require('express');
const router = express.Router();
const authController = require('./auth.controller');
const { protect } = require('../../middlewares/auth');
const { validate } = require('../../middlewares/validate');
const { loginSchema, sessionSchema } = require('../../utils/schemas');

router.post('/login', validate(loginSchema), authController.login);
router.post('/logout', authController.logout);
router.get('/me', protect, authController.getMe);
router.post('/session', validate(sessionSchema), authController.createSession);

module.exports = router;
