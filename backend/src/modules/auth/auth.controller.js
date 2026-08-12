const authService = require('./auth.service');
const jwt = require('jsonwebtoken');
const prisma = require('../../utils/prisma');
const AppError = require('../../utils/AppError');

const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const { user, token } = await authService.login(email, password);

    res.cookie('jwt', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 90 * 24 * 60 * 60 * 1000 // 90 days
    });

    user.password = undefined; // Do not send password back

    res.status(200).json({
      success: true,
      token,
      user
    });
  } catch (error) {
    next(error);
  }
};

const logout = (req, res) => {
  res.cookie('jwt', 'loggedout', {
    expires: new Date(Date.now() + 10 * 1000),
    httpOnly: true
  });
  res.status(200).json({ success: true, message: 'Logged out successfully' });
};

const getMe = async (req, res, next) => {
  try {
    const user = await authService.getMe(req.user.id);
    user.password = undefined;
    res.status(200).json({ success: true, user });
  } catch (error) {
    next(error);
  }
};

const createSession = async (req, res, next) => {
  try {
    const { sessionId, machineId } = req.body;

    if (!sessionId) {
      return next(new AppError('sessionId is required', 400));
    }

    // If machineId is provided, verify it exists and is active
    if (machineId) {
      const machine = await prisma.machine.findUnique({ where: { id: machineId } });
      if (!machine) {
        return next(new AppError('Machine not found', 404));
      }
      if (machine.status === 'SUSPENDED') {
        return next(new AppError('Machine is suspended', 403));
      }
    }

    // Issue a short-lived session token (1 hour)
    const sessionToken = jwt.sign(
      { sessionId, machineId: machineId || null, type: 'session' },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    res.status(200).json({
      success: true,
      sessionToken,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  login,
  logout,
  getMe,
  createSession
};
