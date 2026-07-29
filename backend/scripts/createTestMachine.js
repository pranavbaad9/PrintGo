const prisma = require('../src/utils/prisma');
const crypto = require('crypto');

async function main() {
  try {
    // 1. Create a Test Company
    const company = await prisma.company.create({
      data: {
        name: 'Test Store Owner',
        contactEmail: `owner_${Date.now()}@test.com`,
        contactPhone: '1234567890'
      }
    });

    // 2. Create a Test Machine for them
    const machineKey = crypto.randomBytes(32).toString('hex');
    const machine = await prisma.machine.create({
      data: {
        name: 'Kiosk Alpha',
        location: 'Mumbai Central',
        machineKey: machineKey,
        companyId: company.id,
        status: 'ACTIVE'
      }
    });

    console.log('--- TEST MACHINE CREATED ---');
    console.log(`Machine Name: ${machine.name}`);
    console.log(`Machine Key: ${machineKey}`);
    console.log('----------------------------');
    
  } catch (error) {
    console.error('Error creating test machine:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
