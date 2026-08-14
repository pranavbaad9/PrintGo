const express = require('express');
const router = express.Router();
const authController = require('./auth.controller');
const { protect } = require('../../middlewares/auth');
const { validate } = require('../../middlewares/validate');
const { loginSchema } = require('../../utils/schemas');

router.post('/login', validate(loginSchema), authController.login);
router.post('/logout', authController.logout);
router.get('/me', protect, authController.getMe);

// New session endpoints (P0-006)
router.post('/session/create', authController.createSession);  // Kiosk creates session
router.post('/session/join', authController.joinSession);      // Mobile joins session

// Backward compatibility: old /session endpoint redirects to /session/join
// This allows the mobile frontend to work while being migrated
router.post('/session', authController.joinSession);

module.exports = router;
