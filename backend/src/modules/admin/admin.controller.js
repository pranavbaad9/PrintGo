const prisma = require('../../utils/prisma');
const AppError = require('../../utils/AppError');

// @desc    Get global stats
// @route   GET /api/admin/stats
// @access  Private (SUPERADMIN only)
exports.getStats = async (req, res, next) => {
  try {
    const totalCompanies = await prisma.company.count();
    const totalMachines = await prisma.machine.count();
    const totalUsers = await prisma.user.count();
    const totalJobs = await prisma.printJob.count();
    
    // Revenue stats
    const successfulPayments = await prisma.payment.aggregate({
      where: { status: 'SUCCESS' },
      _sum: { amount: true }
    });

    res.status(200).json({
      status: 'success',
      data: {
        totalCompanies,
        totalMachines,
        totalUsers,
        totalJobs,
        totalRevenue: successfulPayments._sum.amount || 0
      }
    });
  } catch (error) {
    next(new AppError('Failed to fetch stats', 500));
  }
};

// @desc    Get all companies
// @route   GET /api/admin/companies
// @access  Private (SUPERADMIN only)
exports.getAllCompanies = async (req, res, next) => {
  try {
    const companies = await prisma.company.findMany({
      include: {
        _count: {
          select: { machines: true, users: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.status(200).json({
      status: 'success',
      data: { companies }
    });
  } catch (error) {
    next(new AppError('Failed to fetch companies', 500));
  }
};

// @desc    Get all machines globally
// @route   GET /api/admin/machines
// @access  Private (SUPERADMIN only)
exports.getAllMachines = async (req, res, next) => {
  try {
    const machines = await prisma.machine.findMany({
      include: {
        company: {
          select: { name: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.status(200).json({
      status: 'success',
      data: { machines }
    });
  } catch (error) {
    next(new AppError('Failed to fetch machines', 500));
  }
};
