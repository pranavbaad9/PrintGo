const prisma = require('./src/utils/prisma');

async function seed() {
  const key = "new_rotated_machine_key_1a2b3c4d5e6f";
  try {
    const existing = await prisma.machine.findUnique({ where: { machineKey: key }});
    if (!existing) {
      await prisma.machine.create({
        data: {
          name: 'Main Shop Printer',
          location: 'Front Desk',
          type: 'KIOSK',
          machineKey: key,
          status: 'ACTIVE',
        }
      });
      console.log('✅ Seeded machine successfully!');
    } else {
      console.log('Machine already exists.');
    }
  } catch(e) {
    console.error(e);
  } finally {
    await prisma.$disconnect();
  }
}
seed();
