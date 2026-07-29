const prisma = require('../../utils/prisma');
const AppError = require('../../utils/AppError');

const getSubscriptions = async (machineId) => {
  return await prisma.subscription.findMany({
    where: machineId ? { machineId } : undefined,
    include: { plan: true, machine: true },
    orderBy: { createdAt: 'desc' }
  });
};

const createSubscription = async (data) => {
  const { machineId, planId, billingType } = data;
  
  const plan = await prisma.plan.findUnique({ where: { id: planId } });
  if (!plan) throw new AppError('Plan not found', 404);
  
  const machine = await prisma.machine.findUnique({ where: { id: machineId } });
  if (!machine) throw new AppError('Machine not found', 404);

  // Calculate expiry date
  const startDate = new Date();
  const expiryDate = new Date();
  if (billingType === 'MONTHLY') {
    expiryDate.setMonth(expiryDate.getMonth() + 1);
  } else if (billingType === 'YEARLY') {
    expiryDate.setFullYear(expiryDate.getFullYear() + 1);
  } else {
    expiryDate.setFullYear(expiryDate.getFullYear() + 100); // Lifetime
  }

  const subscription = await prisma.subscription.create({
    data: {
      machineId,
      planId,
      status: 'ACTIVE',
      startDate,
      expiryDate
    }
  });

  // Activate machine
  await prisma.machine.update({
    where: { id: machineId },
    data: { status: 'ACTIVE' }
  });

  return subscription;
};

const cancelSubscription = async (id, io) => {
  const subscription = await prisma.subscription.update({
    where: { id },
    data: { status: 'CANCELLED' }
  });

  const machine = await prisma.machine.update({
    where: { id: subscription.machineId },
    data: { status: 'SUSPENDED' }
  });
  
  io.to(`machine_${machine.id}`).emit('machine_suspended', { message: 'Your subscription has been cancelled.' });

  return subscription;
};

module.exports = {
  getSubscriptions,
  createSubscription,
  cancelSubscription
};
