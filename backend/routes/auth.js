const express = require('express');
const { login, logout, getMe } = require('../controllers/adminController');
const { authMiddleware, adminMiddleware } = require('../middlewares/auth');

const router = express.Router();

router.post('/login', login);
router.post('/logout', logout);
router.get('/me', authMiddleware, adminMiddleware, getMe);

module.exports = router;
