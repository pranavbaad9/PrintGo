const authService = require('./auth.service');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const prisma = require('../../utils/prisma');
const AppError = require('../../utils/AppError');
const logger = require('../../utils/logger');

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

/**
 * POST /api/auth/session/create
 * Called by the KIOSK to create a new session.
 * Server generates the session code (displayed in QR), stores it in DB.
 * Returns: { sessionCode, sessionToken }
 */
const createSession = async (req, res, next) => {
  try {
    let { machineId } = req.body;
    let assignedMachineId = machineId;

    // If machineId is provided, verify it exists and is active
    if (assignedMachineId) {
      const machine = await prisma.machine.findUnique({ where: { id: assignedMachineId } });
      if (!machine) {
        return next(new AppError('Machine not found', 404));
      }
      if (machine.status === 'SUSPENDED') {
        return next(new AppError('Machine is suspended', 403));
      }
    } else {
      // Fallback for kiosk testing without explicit URL parameters:
      const firstMachine = await prisma.machine.findFirst({ where: { status: 'ACTIVE' } });
      if (firstMachine) {
        assignedMachineId = firstMachine.id;
        logger.info(`No machineId provided for session; falling back to first active machine: ${assignedMachineId}`);
      }
    }

    // Generate a cryptographically secure session code (12 hex chars = 6 bytes = 281 trillion combinations)
    const sessionCode = crypto.randomBytes(6).toString('hex');
    
    // Session expires in 1 hour
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

    // Store session in database
    const session = await prisma.session.create({
      data: {
        code: sessionCode,
        machineId: assignedMachineId || null,
        status: 'WAITING_FOR_MOBILE',
        expiresAt,
      }
    });

    // Issue a session token for the kiosk
    const sessionToken = jwt.sign(
      { sessionId: session.code, machineId: assignedMachineId || null, type: 'session', role: 'kiosk' },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    logger.info(`Session created: ${session.code} (machine: ${machineId || 'none'})`);

    res.status(200).json({
      success: true,
      sessionCode: session.code,
      sessionToken,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/auth/session/join
 * Called by the MOBILE phone after scanning the QR code.
 * Validates the session exists, is active, and not expired.
 * Returns: { sessionToken }
 */
const joinSession = async (req, res, next) => {
  try {
    const { sessionCode } = req.body;

    if (!sessionCode) {
      return next(new AppError('sessionCode is required', 400));
    }

    // Look up the session in the database
    const session = await prisma.session.findUnique({ where: { code: sessionCode } });

    if (!session) {
      return next(new AppError('Invalid session code', 404));
    }

    if (session.status === 'EXPIRED' || session.status === 'COMPLETED') {
      return next(new AppError('This session has expired. Please scan a new QR code.', 410));
    }

    if (new Date() > session.expiresAt) {
      // Mark as expired in DB
      await prisma.session.update({
        where: { id: session.id },
        data: { status: 'EXPIRED' }
      });
      return next(new AppError('This session has expired. Please scan a new QR code.', 410));
    }

    // Update session status to CONNECTED
    await prisma.session.update({
      where: { id: session.id },
      data: { status: 'CONNECTED' }
    });

    // Issue a session token for the mobile user
    const sessionToken = jwt.sign(
      { sessionId: session.code, machineId: session.machineId || null, type: 'session', role: 'mobile' },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    logger.info(`Mobile joined session: ${session.code}`);

    res.status(200).json({
      success: true,
      sessionToken,
      machineId: session.machineId,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  login,
  logout,
  getMe,
  createSession,
  joinSession
};
