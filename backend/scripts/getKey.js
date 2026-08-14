const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const machine = await prisma.machine.findFirst({ where: { status: 'ACTIVE' } });
  if (machine) {
    console.log('KEY=' + machine.machineKey);
  } else {
    console.log('NO_MACHINE');
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
