const prisma = require('../../utils/prisma');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const AppError = require('../../utils/AppError');

const signToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '90d'
  });
};

const login = async (email, password) => {
  if (!email || !password) {
    throw new AppError('Please provide email and password', 400);
  }

  const user = await prisma.user.findUnique({
    where: { email },
    include: { company: true }
  });

  if (!user) {
    // For setup purposes, create a SUPERADMIN if it's the default credentials
    if (email === process.env.ADMIN_USER && password === process.env.ADMIN_PASS) {
      const hashedPassword = await bcrypt.hash(password, 12);
      const newUser = await prisma.user.create({
        data: {
          email,
          password: hashedPassword,
          name: 'Super Admin',
          role: 'SUPERADMIN'
        }
      });
      const token = signToken(newUser.id);
      return { user: newUser, token };
    }
    throw new AppError('Incorrect email or password', 401);
  }

  const isPasswordCorrect = await bcrypt.compare(password, user.password);
  if (!isPasswordCorrect) {
    throw new AppError('Incorrect email or password', 401);
  }

  const token = signToken(user.id);
  return { user, token };
};

const getMe = async (userId) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { company: true }
  });
  if (!user) throw new AppError('User not found', 404);
  return user;
};

module.exports = {
  login,
  getMe
};
