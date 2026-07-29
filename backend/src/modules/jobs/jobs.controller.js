const jobsService = require('./jobs.service');

const getAllJobs = async (req, res, next) => {
  try {
    const jobs = await jobsService.getAllJobs();
    res.json({ success: true, jobs });
  } catch (error) {
    next(error);
  }
};

const getJob = async (req, res, next) => {
  try {
    const { id } = req.params;
    const job = await jobsService.getJobByShortId(id);
    // eta calculation can be added here or in service
    res.json({ success: true, job });
  } catch (error) {
    next(error);
  }
};

const createJob = async (req, res, next) => {
  try {
    // In actual implementation, we'd validate req.body with Zod here
    const job = await jobsService.createJob(req.body);
    res.json({ success: true, job });
  } catch (error) {
    next(error);
  }
};

const updateJobStatus = async (req, res, next) => {
  try {
    const { status } = req.body;
    const { id } = req.params;
    
    const job = await jobsService.updateJobStatus(id, status);
    req.app.get('io').emit('job_status_changed', job);
    res.json({ success: true, job });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAllJobs,
  getJob,
  createJob,
  updateJobStatus
};
