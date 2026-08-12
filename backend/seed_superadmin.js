require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

async function main() {
  const email = 'superadmin@printgo.com';
  const existingUser = await prisma.user.findUnique({
    where: { email },
  });

  if (existingUser) {
    console.log(`Superadmin already exists: ${email}`);
    return;
  }

  const hashedPassword = await bcrypt.hash('Admin@123!', 12);
  const user = await prisma.user.create({
    data: {
      email,
      password: hashedPassword,
      name: 'Global Super Admin',
      role: 'SUPERADMIN',
    },
  });

  console.log(`Created superadmin successfully: ${user.email} (Password: Admin@123!)`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
