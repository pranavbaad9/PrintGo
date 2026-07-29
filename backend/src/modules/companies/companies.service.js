const prisma = require('../../utils/prisma');
const bcrypt = require('bcrypt');
const AppError = require('../../utils/AppError');

const getCompanies = async () => {
  return await prisma.company.findMany({
    include: { machines: true, users: true }
  });
};

const createCompany = async (data) => {
  const { name, contactEmail, contactPhone } = data;
  
  const company = await prisma.company.create({
    data: { name, contactEmail, contactPhone }
  });
  
  const defaultPassword = 'company123';
  const hashedPassword = await bcrypt.hash(defaultPassword, 10);

  const user = await prisma.user.create({
    data: {
      email: contactEmail,
      name: `${name} Admin`,
      password: hashedPassword,
      role: 'FRANCHISEE',
      companyId: company.id
    }
  });
  
  return { company, user, defaultPassword };
};

module.exports = {
  getCompanies,
  createCompany
};
