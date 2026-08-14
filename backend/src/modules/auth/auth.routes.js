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
// Temporary route to auto-provision an active machine if none exists
router.post('/setup-machine', async (req, res) => {
  const { PrismaClient } = require('@prisma/client');
  const prisma = new PrismaClient();
  try {
    let machine = await prisma.machine.findFirst({ where: { status: 'ACTIVE' } });
    if (!machine) {
      const crypto = require('crypto');
      const generatedKey = crypto.randomBytes(16).toString('hex');
      machine = await prisma.machine.create({
        data: {
          name: 'Main Kiosk',
          location: 'Lobby',
          status: 'ACTIVE',
          printerType: 'BLACK_AND_WHITE',
          model: 'PrintGo V1',
          machineKey: generatedKey
        }
      });
    }
    res.json({ success: true, machineKey: machine.machineKey });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
