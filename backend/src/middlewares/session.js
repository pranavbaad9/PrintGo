/**
 * Session Authentication Middleware
 * 
 * Provides lightweight session-token auth for kiosk-facing endpoints
 * (upload, jobs, payments) that are used by anonymous mobile users.
 * 
 * Flow:
 *   1. Mobile client calls POST /api/auth/session with { sessionId, machineId }
 *   2. Server validates the machineId exists and returns a short-lived JWT
 *   3. Mobile includes the token in subsequent API requests via Authorization header
 *   4. This middleware validates the session token
 * 
 * This is separate from the admin `protect` middleware which requires a full user login.
 */

const jwt = require('jsonwebtoken');
const AppError = require('../utils/AppError');

/**
 * Middleware that accepts EITHER a user JWT (from admin login) OR a session JWT (from kiosk flow).
 * This allows both admin users and anonymous kiosk users to access the endpoint.
 */
const requireSessionOrUser = async (req, res, next) => {
  try {
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    } else if (req.cookies?.jwt) {
      token = req.cookies.jwt;
    }

    if (!token) {
      return next(new AppError('Authentication required. Please provide a session or user token.', 401));
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    if (decoded.type === 'session') {
      // Session token — attach session info to request
      req.session = {
        sessionId: decoded.sessionId,
        machineId: decoded.machineId,
      };
      return next();
    }

    // Otherwise treat as a regular user token — look up the user
    const prisma = require('../utils/prisma');
    const currentUser = await prisma.user.findUnique({
      where: { id: decoded.id },
    });

    if (!currentUser) {
      return next(new AppError('The user belonging to this token no longer exists.', 401));
    }

    req.user = currentUser;
    next();
  } catch (error) {
    next(new AppError('Invalid or expired token.', 401));
  }
};

module.exports = { requireSessionOrUser };
