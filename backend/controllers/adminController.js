const prisma = require('../utils/prisma');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const login = async (req, res, next) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      res.status(400);
      throw new Error('Please provide username and password');
    }

    const admin = await prisma.adminUser.findUnique({
      where: { username }
    });

    if (!admin) {
      // Create default admin if none exists (for testing/setup purposes)
      if (username === process.env.ADMIN_USER && password === process.env.ADMIN_PASS) {
        const hashedPassword = await bcrypt.hash(password, 10);
        const newAdmin = await prisma.adminUser.create({
          data: {
            username,
            password: hashedPassword,
            role: 'SUPERADMIN'
          }
        });
        const token = jwt.sign({ id: newAdmin.id, role: newAdmin.role }, process.env.JWT_SECRET, { expiresIn: '1d' });
        res.cookie('token', token, { httpOnly: true, secure: process.env.NODE_ENV === 'production', maxAge: 86400000 });
        return res.json({ success: true, token, role: newAdmin.role });
      }

      res.status(401);
      throw new Error('Invalid credentials');
    }

    const isMatch = await bcrypt.compare(password, admin.password);
    if (!isMatch) {
      res.status(401);
      throw new Error('Invalid credentials');
    }

    const token = jwt.sign({ id: admin.id, role: admin.role }, process.env.JWT_SECRET, { expiresIn: '1d' });
    
    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 86400000 // 1 day
    });

    res.json({ success: true, token, role: admin.role });
  } catch (error) {
    next(error);
  }
};

const logout = (req, res) => {
  res.clearCookie('token');
  res.json({ success: true, message: 'Logged out successfully' });
};

const getMe = async (req, res, next) => {
  try {
    const admin = await prisma.adminUser.findUnique({
      where: { id: req.user.id },
      select: { id: true, username: true, role: true }
    });
    if (!admin) {
      res.status(404);
      throw new Error('Admin not found');
    }
    res.json({ success: true, admin });
  } catch (error) {
    next(error);
  }
};

module.exports = { login, logout, getMe };
