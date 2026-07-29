const prisma = require('../utils/prisma');
const crypto = require('crypto');

async function main() {
  try {
    // 1. Create a Test Franchisee
    const franchisee = await prisma.franchisee.create({
      data: {
        name: 'Test Store Owner',
        email: `owner_${Date.now()}@test.com`,
        phone: '1234567890'
      }
    });

    // 2. Create a Test Machine for them
    const machineKey = crypto.randomBytes(32).toString('hex');
    const machine = await prisma.machine.create({
      data: {
        name: 'Kiosk Alpha',
        location: 'Mumbai Central',
        machineKey: machineKey,
        franchiseeId: franchisee.id,
        subscriptionPlan: 'Premium',
        status: 'Active'
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
