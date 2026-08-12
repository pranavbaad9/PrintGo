const jwt = require('jsonwebtoken');
const prisma = require('../utils/prisma');
const AppError = require('../utils/AppError');

const fileAuth = async (req, res, next) => {
  try {
    // 1. Check for x-machine-key header (Printer Agent)
    const machineKey = req.headers['x-machine-key'];
    if (machineKey) {
      const machine = await prisma.machine.findUnique({ where: { machineKey } });
      if (machine && machine.status !== 'SUSPENDED') {
        req.machine = machine;
        return next();
      }
    }

    // 2. Check for JWT token (Mobile / Kiosk / Admin)
    let token;
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    } else if (req.cookies?.jwt) {
      token = req.cookies.jwt;
    }

    if (token) {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      if (decoded.type === 'session') {
        req.session = { sessionId: decoded.sessionId, machineId: decoded.machineId };
        return next();
      } else {
        const user = await prisma.user.findUnique({ where: { id: decoded.id } });
        if (user) {
          req.user = user;
          return next();
        }
      }
    }

    return next(new AppError('Unauthorized access to files', 401));
  } catch (err) {
    return next(new AppError('Unauthorized access to files', 401));
  }
};

module.exports = { fileAuth };
