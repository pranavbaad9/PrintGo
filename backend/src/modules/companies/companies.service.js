const prisma = require('../../utils/prisma');
const bcrypt = require('bcrypt');
const crypto = require('crypto');
const AppError = require('../../utils/AppError');

const getCompanies = async () => {
  return await prisma.company.findMany({
    include: { machines: true, users: true }
  });
};

const createCompany = async (data) => {
  const { name, email, phone, maxMachines } = data;

  // Check if company email already exists
  const existingCompany = await prisma.company.findUnique({ where: { email } });
  if (existingCompany) {
    throw new AppError('Company with this email already exists', 400);
  }

  // Generate secure random default password (16 characters)
  const defaultPassword = crypto.randomBytes(8).toString('hex');
  const hashedPassword = await bcrypt.hash(defaultPassword, 12);

  const company = await prisma.company.create({
    data: {
      name,
      email,
      phone,
      maxMachines: maxMachines || 10,
      admin: {
        create: {
          name: `${name} Admin`,
          email,
          password: hashedPassword,
          role: 'FRANCHISEE'
        }
      }
    },
    include: { admin: true }
  });
  
  return { company, user: company.admin, defaultPassword };
};

module.exports = {
  getCompanies,
  createCompany
};
