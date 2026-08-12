const { PrismaClient } = require('@prisma/client');
const crypto = require('crypto');
const prisma = new PrismaClient();

async function main() {
  let machine = await prisma.machine.findFirst();
  if (!machine) {
    machine = await prisma.machine.create({
      data: {
        machineKey: crypto.randomBytes(32).toString('hex'),
        name: 'Local Kiosk',
        status: 'ACTIVE'
      }
    });
  } else if (machine.status === 'SUSPENDED') {
    machine = await prisma.machine.update({
        where: { id: machine.id },
        data: { status: 'ACTIVE' }
    });
  }
  console.log("###KEY:" + machine.machineKey + "###");
}

main().catch(console.error).finally(() => prisma.$disconnect());
