const prisma = require('../../utils/prisma');
const crypto = require('crypto');
const AppError = require('../../utils/AppError');

const getMachines = async (user) => {
  const where = {};
  if (user && user.role !== 'SUPERADMIN') {
    where.companyId = user.companyId;
  }

  return await prisma.machine.findMany({
    where,
    include: { company: true, printerStatuses: { take: 1, orderBy: { timestamp: 'desc' } } }
  });
};

const getMachineById = async (id) => {
  const machine = await prisma.machine.findUnique({
    where: { id },
    include: { company: true }
  });
  if (!machine) throw new AppError('Machine not found', 404);
  return machine;
};

const createMachine = async (data) => {
  const { name, location, companyId } = data;
  const machineKey = crypto.randomBytes(32).toString('hex');
  
  return await prisma.machine.create({
    data: {
      name,
      location,
      machineKey,
      companyId,
      status: 'INACTIVE'
    },
    include: { company: true }
  });
};

const updateMachineStatus = async (id, status, io) => {
  const machine = await prisma.machine.update({
    where: { id },
    data: { status },
    include: { company: true }
  });
  
  if (status === 'SUSPENDED') {
    io.to(`machine_${id}`).emit('machine_suspended', { message: 'Your machine is suspended.' });
  }
  
  return machine;
};

const getMachinesByCompany = async (companyId) => {
  return await prisma.machine.findMany({
    where: { companyId },
    include: { printJobs: { take: 50, orderBy: { createdAt: 'desc' } } }
  });
};

module.exports = {
  getMachines,
  getMachineById,
  createMachine,
  updateMachineStatus,
  getMachinesByCompany
};
