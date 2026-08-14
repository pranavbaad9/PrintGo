const machinesService = require('./machines.service');

const getMachines = async (req, res, next) => {
  try {
    const machines = await machinesService.getMachines(req.user);
    res.json({ success: true, machines });
  } catch (error) {
    next(error);
  }
};

const createMachine = async (req, res, next) => {
  try {
    const machine = await machinesService.createMachine(req.body);
    res.json({ success: true, machine });
  } catch (error) {
    next(error);
  }
};

const updateMachine = async (req, res, next) => {
  try {
    const { status } = req.body;
    const machine = await machinesService.updateMachineStatus(req.params.id, status, req.app.get('io'), req.user);
    res.json({ success: true, machine });
  } catch (error) {
    next(error);
  }
};

const getMyMachines = async (req, res, next) => {
  try {
    if (!req.user.companyId) {
      return res.status(403).json({ success: false, error: 'No company linked to this user' });
    }
    const machines = await machinesService.getMachinesByCompany(req.user.companyId);
    // Flatten jobs for dashboard
    const allJobs = machines.flatMap(m => m.printJobs).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    res.json({ success: true, machines, jobs: allJobs });
  } catch (error) {
    next(error);
  }
};

const getAgentVersion = async (req, res, next) => {
  try {
    // In a real enterprise system, this hash would be stored in the DB and configurable by SuperAdmins
    // Hardcoding a secure default pinned hash for the OTA updater
    const PINNED_HASH = process.env.AGENT_PINNED_HASH || 'main'; // Defaulting to main if not explicitly pinned via env
    res.json({ success: true, hash: PINNED_HASH });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getMachines,
  createMachine,
  updateMachine,
  getMyMachines,
  getAgentVersion
};
